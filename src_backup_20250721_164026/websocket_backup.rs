use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use futures_util::{SinkExt, StreamExt};
use warp::ws::{Message as WsMessage, WebSocket};

use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;

use crate::message::{
    ChatMessage, ContentType, Message as AppMessage, OnlineStatus, UserInfo, UserType,
    UserConnection,
};
use crate::redis_client::RedisManager;
use crate::storage::LocalStorage;
use crate::compression::{AdaptiveCompressor, CompressionConfig};
use crate::message_queue::{MessageQueueManager, MessageStatusSyncer};

pub type UserConnections = Arc<RwLock<HashMap<String, UserConnection>>>;
pub type UserSenders = Arc<RwLock<HashMap<String, mpsc::UnboundedSender<AppMessage>>>>;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectionStats {
    pub total_connections: usize,
    pub kefu_connections: usize,
    pub kehu_connections: usize,
    pub average_connection_duration: i64,
    pub longest_connection_duration: i64,
}

pub struct WebSocketManager {
    pub connections: UserConnections,
    pub senders: UserSenders,
    pub redis: Arc<RwLock<RedisManager>>,
    pub storage: Arc<LocalStorage>,
    pub compressor: Arc<RwLock<AdaptiveCompressor>>,
    pub message_queue: Arc<MessageQueueManager>,
    pub status_syncer: Arc<MessageStatusSyncer>,
}

impl WebSocketManager {
    pub fn new(redis: RedisManager, storage: LocalStorage) -> Self {
        let compression_config = CompressionConfig::default();
        let compressor = AdaptiveCompressor::new(compression_config);
        
        // 创建消息队列管理器 - 简化版本，避免编译错误
        let redis_conn = redis.clone();
        let message_queue = Arc::new(MessageQueueManager::new(redis_conn.get_connection().unwrap()));
        let status_syncer = Arc::new(MessageStatusSyncer::new(message_queue.clone()));
        
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            senders: Arc::new(RwLock::new(HashMap::new())),
            redis: Arc::new(RwLock::new(redis)),
            storage: Arc::new(storage),
            compressor: Arc::new(RwLock::new(compressor)),
            message_queue,
            status_syncer,
        }
    }

    // 处理新的WebSocket连接
    pub async fn handle_connection(
        &self,
        websocket: WebSocket,
        user_id: String,
        user_name: String,
        user_type: UserType,
        zhanghao: Option<String>,
        target_id: Option<String>,
    ) -> Result<()> {
        let (mut ws_sender, mut ws_receiver) = websocket.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<AppMessage>();

        // 创建用户连接信息
        let user_connection = UserConnection {
            user_id: user_id.clone(),
            user_name: user_name.clone(),
            user_type: user_type.clone(),
            zhanghao: zhanghao.clone(),
            connected_at: Utc::now(),
            last_heartbeat: Utc::now(),
            status: OnlineStatus::Online,
        };

        // 添加到连接管理器
        {
            let mut connections = self.connections.write().await;
            connections.insert(user_id.clone(), user_connection.clone());
        }

        // 添加到发送器管理器
        {
            let mut senders = self.senders.write().await;
            senders.insert(user_id.clone(), tx.clone());
        }

        // 更新Redis中的在线状态
        {
            let mut redis = self.redis.write().await;
            let user_info = UserInfo {
                user_id: user_id.clone(),
                user_name: user_name.clone(),
                user_type: user_type.clone(),
                status: OnlineStatus::Online,
                zhanghao: zhanghao.clone(),
                last_seen: Utc::now(),
                avatar: None,
            };
            let _ = redis.set_user_online(&user_id, &user_info).await;
        }

        // 发送欢迎消息
        let welcome_msg = AppMessage::Welcome {
            user_id: user_id.clone(),
            user_name: user_name.clone(),
            user_type: user_type.clone(),
            zhanghao: zhanghao.clone(),
            timestamp: Utc::now(),
        };
        let _ = tx.send(welcome_msg);

        // 发送在线用户列表
        self.send_online_users(&tx).await?;

        // 发送历史消息
        self.send_history_messages(&user_id, &user_type, &tx).await?;

        // 广播用户加入通知
        self.broadcast_user_joined(&user_id, &user_name, &user_type, &zhanghao)
            .await?;

        // 如果是客户端连接，尝试建立会话
        if user_type == UserType::Kehu {
            if let Some(kefu_id) = target_id {
                self.establish_session(&user_id, &kefu_id, &zhanghao).await?;
            }
        }

        let connections_clone = self.connections.clone();
        let senders_clone = self.senders.clone();
        let redis_clone = self.redis.clone();
        let storage_clone = self.storage.clone();
        let compressor_clone_send = self.compressor.clone();
        let compressor_clone_recv = self.compressor.clone();
        let user_id_clone = user_id.clone();

        // 启动发送任务
        let send_task = tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if let Ok(json) = serde_json::to_string(&message) {
                    // 尝试压缩消息
                    let message_type = match &message {
                        AppMessage::Chat { .. } => "Chat",
                        AppMessage::History { .. } => "History",
                        AppMessage::OnlineUsers { .. } => "OnlineUsers",
                        AppMessage::Heartbeat { .. } => "Heartbeat",
                        AppMessage::Typing { .. } => "Typing",
                        AppMessage::System { .. } => "System",
                        _ => "Other",
                    };
                    
                    let final_message = if let Ok(mut compressor) = compressor_clone_send.try_write() {
                        match compressor.compress_adaptive(&json, message_type) {
                            Ok((compressed_data, _result)) => compressed_data,
                            Err(_) => json, // 压缩失败时使用原始数据
                        }
                    } else {
                        json // 无法获取压缩器时使用原始数据
                    };
                    
                    if let Err(e) = ws_sender.send(WsMessage::text(final_message)).await {
                        tracing::error!("Failed to send message: {:?}", e);
                        break;
                    }
                }
            }
        });

        // 启动接收任务
        let receive_task = tokio::spawn(async move {
            let manager = WebSocketManager {
                connections: connections_clone,
                senders: senders_clone,
                redis: redis_clone,
                storage: storage_clone,
                compressor: compressor_clone_recv,
                // 使用正确的Redis连接创建方法
                message_queue: Arc::new(MessageQueueManager::new(
                    redis::Client::open("redis://127.0.0.1:6379")
                        .unwrap()
                        .get_connection()
                        .unwrap()
                )),
                status_syncer: Arc::new(MessageStatusSyncer::new(
                    Arc::new(MessageQueueManager::new(
                        redis::Client::open("redis://127.0.0.1:6379")
                            .unwrap()
                            .get_connection()
                            .unwrap()
                    ))
                )),
            };

            while let Some(result) = ws_receiver.next().await {
                match result {
                    Ok(msg) => {
                        if let Err(e) = manager.handle_message(msg, &user_id_clone).await {
                            tracing::error!("Failed to handle message: {:?}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("WebSocket error: {:?}", e);
                        break;
                    }
                }
            }

            // 清理连接
            manager.cleanup_connection(&user_id_clone).await;
        });

        // 等待任务完成
        tokio::select! {
            _ = send_task => {},
            _ = receive_task => {},
        }

        Ok(())
    }

    // 处理WebSocket消息
    async fn handle_message(&self, message: WsMessage, user_id: &str) -> Result<()> {
        if message.is_text() {
            let text = message
                .to_str()
                .map_err(|_| anyhow::anyhow!("Invalid UTF-8"))?;

            // 更新心跳时间
            self.update_heartbeat(user_id).await;

            // 尝试解压缩消息
            let decompressed_text = if let Ok(compressor) = self.compressor.try_read() {
                match compressor.decompress(text) {
                    Ok((decompressed_data, _result)) => decompressed_data,
                    Err(_) => text.to_string(), // 解压失败时使用原始数据
                }
            } else {
                text.to_string() // 无法获取压缩器时使用原始数据
            };

            // 解析消息
            match serde_json::from_str::<AppMessage>(&decompressed_text) {
                Ok(app_message) => {
                    self.process_app_message(app_message, user_id).await?;
                }
                Err(_) => {
                    // 如果不是标准消息格式，当作文本聊天消息处理
                    self.handle_text_message(&decompressed_text, user_id).await?;
                }
            }
        }
        Ok(())
    }

    // 处理应用消息
    async fn process_app_message(&self, message: AppMessage, user_id: &str) -> Result<()> {
        match message {
            AppMessage::Chat {
                id,
                from,
                to,
                content,
                content_type,
                filename,
                timestamp,
                url,
            } => {
                self.handle_chat_message(
                    id,
                    from,
                    to,
                    content,
                    content_type,
                    filename,
                    timestamp,
                    url,
                )
                .await?;
            }
            AppMessage::Typing {
                from,
                to,
                is_typing,
                timestamp,
            } => {
                self.handle_typing_message(from, to, is_typing, timestamp)
                    .await?;
            }
            AppMessage::Heartbeat { user_id, timestamp } => {
                self.handle_heartbeat(user_id, timestamp).await?;
            }
            AppMessage::Status {
                user_id,
                status,
                timestamp,
            } => {
                self.handle_status_message(user_id, status, timestamp)
                    .await?;
            }
            AppMessage::OnlineUsers { .. } => {
                // 客户端请求在线用户列表
                if let Some(sender) = self.get_user_sender(user_id).await {
                    self.send_online_users(&sender).await?;
                }
            }
            _ => {
                tracing::warn!("Unhandled message type from user {}", user_id);
            }
        }
        Ok(())
    }

    // 处理文本消息
    async fn handle_text_message(&self, text: &str, user_id: &str) -> Result<()> {
        // 获取用户信息
        let user_connection = {
            let connections = self.connections.read().await;
            connections.get(user_id).cloned()
        };

        if let Some(user_conn) = user_connection {
            // 获取聊天对象
            let partner_id = self.get_chat_partner(user_id, &user_conn.user_type).await?;

            if let Some(to) = partner_id {
                let message_id = Uuid::new_v4().to_string();
                let url = format!("#{}", chrono::Utc::now().timestamp_millis());
                let timestamp = Utc::now();
                
                let chat_message = ChatMessage {
                    id: Some(message_id.clone()),
                    from: user_id.to_string(),
                    to: Some(to.clone()),
                    content: text.to_string(),
                    content_type: Some(ContentType::Text),
                    filename: None,
                    timestamp,
                    url: Some(url.clone()),
                };

                // 保存到本地存储
                self.storage.save_message(&chat_message)?;

                // 创建应用消息
                let app_message = AppMessage::Chat {
                    id: Some(message_id),
                    from: user_id.to_string(),
                    to: Some(to.clone()),
                    content: text.to_string(),
                    content_type: Some(ContentType::Text),
                    filename: None,
                    timestamp,
                    url: Some(url),
                };

                // 发送给接收者
                self.send_to_user(&to, app_message.clone()).await?;

                // 回显给发送者
                self.send_to_user(user_id, app_message).await?;
            }
        }

        Ok(())
    }

    // 处理聊天消息
    async fn handle_chat_message(
        &self,
        id: Option<String>,
        from: String,
        to: Option<String>,
        content: String,
        content_type: Option<ContentType>,
        filename: Option<String>,
        timestamp: chrono::DateTime<Utc>,
        url: Option<String>,
    ) -> Result<()> {
        let message_id = id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let message_url = url.unwrap_or_else(|| format!("#{}", timestamp.timestamp_millis()));

        let chat_message = ChatMessage {
            id: Some(message_id.clone()),
            from: from.clone(),
            to: to.clone(),
            content: content.clone(),
            content_type: content_type.clone(),
            filename: filename.clone(),
            timestamp,
            url: Some(message_url.clone()),
        };

        // 保存到本地存储
        self.storage.save_message(&chat_message)?;

        // 创建应用消息
        let app_message = AppMessage::Chat {
            id: Some(message_id),
            from: from.clone(),
            to: to.clone(),
            content,
            content_type,
            filename,
            timestamp,
            url: Some(message_url),
        };

        // 转发给接收者
        if let Some(to_user) = &to {
            self.send_to_user(to_user, app_message.clone()).await?;
        }

        // 回显给发送者
        self.send_to_user(&from, app_message).await?;

        Ok(())
    }

    // 处理打字指示器
    async fn handle_typing_message(
        &self,
        from: String,
        to: Option<String>,
        is_typing: bool,
        timestamp: chrono::DateTime<Utc>,
    ) -> Result<()> {
        let typing_message = AppMessage::Typing {
            from: from.clone(),
            to: to.clone(),
            is_typing,
            timestamp,
        };

        // 发送给特定用户或广播
        if let Some(to_user) = &to {
            self.send_to_user(to_user, typing_message).await?;
        } else {
            // 获取聊天对象
            let user_connection = {
                let connections = self.connections.read().await;
                connections.get(&from).cloned()
            };

            if let Some(user_conn) = user_connection {
                if let Ok(Some(partner_id)) = self.get_chat_partner(&from, &user_conn.user_type).await {
                    self.send_to_user(&partner_id, typing_message).await?;
                }
            }
        }

        Ok(())
    }

    // 处理心跳消息
    async fn handle_heartbeat(
        &self,
        user_id: Option<String>,
        timestamp: chrono::DateTime<Utc>,
    ) -> Result<()> {
        if let Some(uid) = user_id {
            self.update_heartbeat(&uid).await;
            
            // 回复心跳
            let heartbeat_response = AppMessage::Heartbeat {
                user_id: Some(uid.clone()),
                timestamp: Utc::now(),
            };
            
            self.send_to_user(&uid, heartbeat_response).await?;
        }
        Ok(())
    }

    // 处理状态消息
    async fn handle_status_message(
        &self,
        user_id: String,
        status: OnlineStatus,
        _timestamp: chrono::DateTime<Utc>,
    ) -> Result<()> {
        // 更新连接状态
        {
            let mut connections = self.connections.write().await;
            if let Some(connection) = connections.get_mut(&user_id) {
                connection.status = status.clone();
            }
        }

        // 更新Redis中的状态
        if let Ok(mut redis) = self.redis.try_write() {
            if let Ok(mut user_info) = redis.get_user_info(&user_id).await {
                user_info.status = status.clone();
                user_info.last_seen = Utc::now();
                let _ = redis.set_user_online(&user_id, &user_info).await;
            }
        }

        // 广播状态更新
        let status_message = AppMessage::Status {
            user_id,
            status,
            timestamp: Utc::now(),
        };

        self.broadcast_message(status_message).await?;
        self.broadcast_online_users().await?;

        Ok(())
    }

    // 发送消息给特定用户
    async fn send_to_user(&self, user_id: &str, message: AppMessage) -> Result<()> {
        let senders = self.senders.read().await;
        if let Some(sender) = senders.get(user_id) {
            if sender.send(message).is_err() {
                tracing::warn!("Failed to send message to user {}", user_id);
            }
        }
        Ok(())
    }

    // 广播消息给所有用户
    async fn broadcast_message(&self, message: AppMessage) -> Result<()> {
        let senders = self.senders.read().await;
        for (_, sender) in senders.iter() {
            let _ = sender.send(message.clone());
        }
        Ok(())
    }

    // 广播用户加入通知
    async fn broadcast_user_joined(
        &self,
        user_id: &str,
        user_name: &str,
        user_type: &UserType,
        zhanghao: &Option<String>,
    ) -> Result<()> {
        let join_message = AppMessage::UserJoined {
            user_id: user_id.to_string(),
            user_name: user_name.to_string(),
            user_type: user_type.clone(),
            zhanghao: zhanghao.clone(),
            timestamp: Utc::now(),
        };

        self.broadcast_message(join_message).await?;
        self.broadcast_online_users().await?;

        Ok(())
    }

    // 广播用户离开通知
    async fn broadcast_user_left(
        &self,
        user_id: &str,
        user_name: &str,
        user_type: &UserType,
    ) -> Result<()> {
        let leave_message = AppMessage::UserLeft {
            user_id: user_id.to_string(),
            user_name: user_name.to_string(),
            user_type: user_type.clone(),
            timestamp: Utc::now(),
        };

        self.broadcast_message(leave_message).await?;
        self.broadcast_online_users().await?;

        Ok(())
    }

    // 广播在线用户列表
    async fn broadcast_online_users(&self) -> Result<()> {
        let users = {
            let mut redis = self.redis.write().await;
            redis.get_online_users().await.unwrap_or_default()
        };

        let online_message = AppMessage::OnlineUsers { users };
        self.broadcast_message(online_message).await?;

        // 同时通过Redis广播
        {
            let mut redis = self.redis.write().await;
            let _ = redis.broadcast_online_users_update().await;
        }

        Ok(())
    }

    // 获取用户发送器
    async fn get_user_sender(&self, user_id: &str) -> Option<mpsc::UnboundedSender<AppMessage>> {
        let senders = self.senders.read().await;
        senders.get(user_id).cloned()
    }

    // 更新心跳时间
    async fn update_heartbeat(&self, user_id: &str) {
        let mut connections = self.connections.write().await;
        if let Some(connection) = connections.get_mut(user_id) {
            connection.last_heartbeat = Utc::now();
        }
    }

    // 获取聊天对象
    async fn get_chat_partner(&self, user_id: &str, user_type: &UserType) -> Result<Option<String>> {
        let mut redis = self.redis.write().await;
        redis.get_chat_partner(user_id, user_type).await
    }

    // 建立会话
    async fn establish_session(&self, kehu_id: &str, kefu_id: &str, zhanghao: &Option<String>) -> Result<()> {
        let session = self.storage.create_session(kefu_id, kehu_id)?;

        // 在Redis中设置会话映射
        {
            let mut redis = self.redis.write().await;
            redis
                .set_session(kefu_id, kehu_id, &session.session_id)
                .await?;
        }

        // 通知双方建立了会话
        let system_message = AppMessage::System {
            content: format!("会话已建立: {} <-> {}", kefu_id, kehu_id),
            timestamp: Utc::now(),
        };

        self.send_to_user(kefu_id, system_message.clone()).await?;
        self.send_to_user(kehu_id, system_message).await?;

        Ok(())
    }

    // 发送历史消息
    async fn send_history_messages(
        &self,
        user_id: &str,
        user_type: &UserType,
        sender: &mpsc::UnboundedSender<AppMessage>,
    ) -> Result<()> {
        // 获取聊天对象
        let partner_id = self.get_chat_partner(user_id, user_type).await?;

        if let Some(partner) = partner_id {
            let messages = self.storage.get_messages(user_id, &partner)?;
            if !messages.is_empty() {
                let history_message = AppMessage::History { messages };
                let _ = sender.send(history_message);
            }
        }

        Ok(())
    }

    // 发送在线用户列表
    async fn send_online_users(&self, sender: &mpsc::UnboundedSender<AppMessage>) -> Result<()> {
        let users = {
            let mut redis = self.redis.write().await;
            redis.get_online_users().await.unwrap_or_default()
        };

        let online_message = AppMessage::OnlineUsers { users };
        let _ = sender.send(online_message);

        Ok(())
    }

    // 清理连接
    async fn cleanup_connection(&self, user_id: &str) {
        // 获取用户信息用于广播
        let user_info = {
            let connections = self.connections.read().await;
            connections.get(user_id).cloned()
        };

        // 从连接管理器中移除
        let removed_connection = {
            let mut connections = self.connections.write().await;
            connections.remove(user_id)
        };

        // 从发送器管理器中移除
        {
            let mut senders = self.senders.write().await;
            senders.remove(user_id);
        }

        // 从Redis中移除在线状态
        {
            if let Ok(mut redis) = self.redis.try_write() {
                let _ = redis.set_user_offline(user_id).await;
            }
        }

        // 广播用户离开通知
        if let Some(connection) = &removed_connection {
            let _ = self
                .broadcast_user_left(user_id, &connection.user_name, &connection.user_type)
                .await;
        }

        // 记录连接信息用于监控和调试
        if let Some(connection) = removed_connection {
            let connection_duration = Utc::now() - connection.connected_at;
            tracing::info!(
                "User {} ({}) disconnected after {} seconds",
                connection.user_name,
                connection.user_id,
                connection_duration.num_seconds()
            );
        } else {
            tracing::info!("User {} disconnected", user_id);
        }
    }

    // 获取连接统计信息
    pub async fn get_connection_stats(&self) -> ConnectionStats {
        let connections_guard = self.connections.read().await;
        let now = Utc::now();

        let mut stats = ConnectionStats {
            total_connections: connections_guard.len(),
            kefu_connections: 0,
            kehu_connections: 0,
            average_connection_duration: 0,
            longest_connection_duration: 0,
        };

        let mut total_duration = 0i64;
        let mut max_duration = 0i64;

        for connection in connections_guard.values() {
            match connection.user_type {
                UserType::Kefu => stats.kefu_connections += 1,
                UserType::Kehu => stats.kehu_connections += 1,
            }

            let duration = (now - connection.connected_at).num_seconds();
            total_duration += duration;
            if duration > max_duration {
                max_duration = duration;
            }
        }

        if stats.total_connections > 0 {
            stats.average_connection_duration = total_duration / stats.total_connections as i64;
        }
        stats.longest_connection_duration = max_duration;

        stats
    }

    // 启动心跳检查任务（优化版）
    pub async fn start_heartbeat_checker(&self) {
        let connections = self.connections.clone();
        let senders = self.senders.clone();
        let redis = self.redis.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            let timeout_duration = chrono::Duration::seconds(90); // 90秒超时

            loop {
                interval.tick().await;

                let now = Utc::now();
                let mut users_to_remove = Vec::new();
                let mut active_user_ids = Vec::new();

                // 收集当前连接的用户ID
                {
                    let connections_guard = connections.read().await;
                    for (user_id, connection) in connections_guard.iter() {
                        if now - connection.last_heartbeat > timeout_duration {
                            users_to_remove.push((user_id.clone(), connection.clone()));
                        } else {
                            active_user_ids.push(user_id.clone());
                        }
                    }
                }

                // 批量检查Redis心跳状态
                if let Ok(mut redis_guard) = redis.try_write() {
                    // 批量检查心跳状态
                    if let Ok(heartbeat_results) = redis_guard.check_users_heartbeat(&active_user_ids).await {
                        for (user_id, is_alive) in heartbeat_results {
                            if !is_alive {
                                // Redis中心跳过期，也从WebSocket连接中移除
                                users_to_remove.push((user_id.clone(), {
                                    let connections_guard = connections.read().await;
                                    connections_guard.get(&user_id).cloned().unwrap_or_else(|| {
                                        // 创建临时连接对象用于清理
                                        UserConnection {
                                            user_id: user_id.clone(),
                                            user_name: "Unknown".to_string(),
                                            user_type: UserType::Kehu,
                                            zhanghao: None,
                                            connected_at: Utc::now(),
                                            last_heartbeat: Utc::now(),
                                            status: OnlineStatus::Offline,
                                        }
                                    })
                                }));
                            }
                        }
                    }

                    // 清理过期数据并广播更新
                    if let Ok(cleanup_result) = redis_guard.cleanup_expired_data().await {
                        if cleanup_result.expired_users > 0 {
                            tracing::info!("Cleaned up {} expired users", cleanup_result.expired_users);
                        }
                    }
                }

                // 移除超时的连接
                for (user_id, _connection) in users_to_remove {
                    tracing::warn!("User {} heartbeat timeout, removing connection", user_id);
                    
                    // 从连接管理器中移除
                    {
                        let mut connections_guard = connections.write().await;
                        connections_guard.remove(&user_id);
                    }

                    // 从发送器管理器中移除
                    {
                        let mut senders_guard = senders.write().await;
                        senders_guard.remove(&user_id);
                    }

                    // Redis清理在cleanup_expired_data中已处理
                }

                // 批量更新活跃用户的心跳时间
                if !active_user_ids.is_empty() {
                    if let Ok(mut redis_guard) = redis.try_write() {
                        for user_id in active_user_ids {
                            let _ = redis_guard.update_heartbeat(&user_id).await;
                        }
                    }
                }
            }
        });
    }
}
