use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use futures_util::{SinkExt, StreamExt};
use warp::ws::{Message as WsMessage, WebSocket};

use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;
use tracing::info;

use crate::compression::{AdaptiveCompressor, CompressionConfig};
use crate::message::{
    ChatMessage, ContentType, CustomerInfo, Message as AppMessage, OnlineStatus, UserConnection,
    UserInfo, UserType,
};
use crate::message_queue::{MessageQueueManager, MessageStatusSyncer};
use crate::redis_client::RedisManager;
use crate::storage::LocalStorage;

// 🚀 添加Redis事件处理支持
// use redis::AsyncCommands; // 已在函数内部导入
use serde_json::json;

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

#[allow(dead_code)] // 企业级WebSocket管理器：message_queue和status_syncer用于Redis增强功能
#[derive(Clone)]
pub struct WebSocketManager {
    pub connections: UserConnections,
    pub senders: UserSenders,
    pub redis: Arc<RwLock<RedisManager>>,
    pub storage: Arc<LocalStorage>,
    pub compressor: Arc<RwLock<AdaptiveCompressor>>,
    pub message_queue: Arc<MessageQueueManager>, // 企业级消息队列功能
    pub status_syncer: Arc<MessageStatusSyncer>, // 企业级状态同步功能
}

// 聊天消息参数结构体
#[allow(dead_code)]
struct ChatMessageParams {
    id: Option<String>,
    from: String,
    to: Option<String>,
    content: String,
    content_type: Option<ContentType>,
    filename: Option<String>,
    timestamp: chrono::DateTime<Utc>,
    url: Option<String>,
}

/// 企业级语音消息参数结构体
struct VoiceMessageParams {
    id: Option<String>,
    from: String,
    to: Option<String>,
    voice_id: String,
    file_id: String,
    original_filename: String,
    file_size: u64,
    duration: Option<u32>,
    format: String,
    access_url: String,
    transcription: Option<String>,
    timestamp: chrono::DateTime<Utc>,
}

impl WebSocketManager {
    pub fn new(redis: RedisManager, storage: LocalStorage) -> Self {
        let compression_config = CompressionConfig::default();
        let compressor = AdaptiveCompressor::new(compression_config);

        // 创建消息队列管理器
        let redis_conn = redis
            .get_connection()
            .expect("Failed to get Redis connection");
        let message_queue = Arc::new(MessageQueueManager::new(redis_conn));
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
        _target_id: Option<String>,
    ) -> Result<()> {
        tracing::info!(
            "🔗 开始建立WebSocket连接: user_id={}, user_name={}, user_type={:?}",
            user_id,
            user_name,
            user_type
        );

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

        tracing::info!("📝 添加用户连接信息: {}", user_id);

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

        tracing::info!("📡 用户连接信息已保存: {}", user_id);

        // 更新Redis中的在线状态
        tracing::info!("🔄 更新Redis在线状态: {}", user_id);
        {
            let redis = self.redis.write().await;
            let user_info = UserInfo {
                user_id: user_id.clone(),
                user_name: user_name.clone(),
                user_type: user_type.clone(),
                status: OnlineStatus::Online,
                zhanghao: zhanghao.clone(),
                last_seen: Utc::now(),
                avatar: None,
            };
            match redis.set_user_online(&user_id, &user_info).await { Err(e) => {
                tracing::warn!("⚠️ Redis状态更新失败: {}, error: {:?}", user_id, e);
            } _ => {
                tracing::info!("✅ Redis状态更新成功: {}", user_id);
            }}
        }

        // 🚀 启动Redis频道订阅 - 企业级实时事件驱动功能
        tracing::info!("📡 启动Redis频道订阅: {}", user_id);
        let ws_manager_clone = Arc::new(self.clone());
        let user_id_clone = user_id.clone();
        let channels = vec![
            format!("user:{}:messages", user_id),        // 用户私有消息频道
            format!("user:{}:notifications", user_id),   // 用户通知频道
            "system:broadcasts".to_string(),             // 系统广播频道
            format!("session:{}:events", user_id),       // 会话事件频道
        ];
        
        // 在后台启动Redis订阅
        tokio::spawn(async move {
            subscribe_redis_channels_for_user(user_id_clone, channels, ws_manager_clone).await;
        });

        // 发送欢迎消息
        tracing::info!("🎉 发送欢迎消息: {}", user_id);
        let welcome_msg = AppMessage::Welcome {
            user_id: user_id.clone(),
            user_name: user_name.clone(),
            user_type: user_type.clone(),
            zhanghao: zhanghao.clone(),
            timestamp: Utc::now(),
        };
        if let Err(e) = tx.send(welcome_msg) {
            tracing::error!("❌ 发送欢迎消息失败: {}, error: {:?}", user_id, e);
            return Err(anyhow::anyhow!("Failed to send welcome message"));
        }

        // 发送在线用户列表
        tracing::info!("👥 发送在线用户列表: {}", user_id);
        if let Err(e) = self.send_online_users(&tx).await {
            tracing::warn!("⚠️ 发送在线用户列表失败: {}, error: {:?}", user_id, e);
        }

        // 发送历史消息
        tracing::info!("📚 发送历史消息: {}", user_id);
        if let Err(e) = self.send_history_messages(&user_id, &user_type, &tx).await {
            tracing::warn!("⚠️ 发送历史消息失败: {}, error: {:?}", user_id, e);
        }

        // 广播用户加入通知
        tracing::info!("📢 广播用户加入通知: {}", user_id);
        if let Err(e) = self
            .broadcast_user_joined(&user_id, &user_name, &user_type, &zhanghao)
            .await
        {
            tracing::warn!("⚠️ 广播用户加入失败: {}, error: {:?}", user_id, e);
        }

        // 🚀 发送实时上线通知
        if let Err(e) = self.notify_user_online(&user_id, &user_name, &user_type).await {
            tracing::warn!("⚠️ 发送实时上线通知失败: {}, error: {:?}", user_id, e);
        }

        // 🚀 广播实时在线状态
        if let Err(e) = self.broadcast_realtime_user_status().await {
            tracing::warn!("⚠️ 广播实时在线状态失败: {}, error: {:?}", user_id, e);
        }

        // 根据用户类型建立会话
        match user_type {
            UserType::Kehu => {
                // 客户连接：立即寻找并分配客服
                tracing::info!("🔍 客户{}请求分配客服", user_id);
                
                // 简化逻辑：直接从在线客服中选择一个
                let available_kefu = {
                    let connections = self.connections.read().await;
                    let mut kefu_option = None;
                    
                    for (kefu_id, connection) in connections.iter() {
                        if connection.user_type == UserType::Kefu {
                            kefu_option = Some(kefu_id.clone());
                            break; // 选择第一个可用的客服
                        }
                    }
                    kefu_option
                };
                
                if let Some(kefu_id) = available_kefu {
                    tracing::info!("🤝 为客户分配客服: {} <-> {}", user_id, kefu_id);
                    match self.establish_session(&user_id, &kefu_id, &zhanghao).await { Err(e) => {
                        tracing::warn!("⚠️ 建立会话失败: {}, error: {:?}", user_id, e);
                    } _ => {
                        tracing::info!("✅ 会话建立成功: {} <-> {}", user_id, kefu_id);
                        
                        // 通知客服端更新客户列表
                        if let Some(kefu_sender) = self.get_user_sender(&kefu_id).await {
                            self.send_online_users(&kefu_sender).await?;
                        }
                    }}
                } else {
                    tracing::warn!("⚠️ 没有可用客服，客户 {} 暂时无法分配", user_id);
                }
            }
            UserType::Kefu => {
                // 客服连接：检查是否有等待的客户
                if let Ok(waiting_kehu) = self.find_waiting_customer().await {
                    tracing::info!("🤝 为等待客户分配客服: {} <-> {}", waiting_kehu, user_id);
                    if let Err(e) = self.establish_session(&waiting_kehu, &user_id, &None).await {
                        tracing::warn!("⚠️ 建立会话失败: {}, error: {:?}", waiting_kehu, e);
                    }
                }
                
                // 向所有客服发送当前客户列表
                self.broadcast_customer_list().await?;
            }
        }

        tracing::info!("✅ WebSocket连接初始化完成: {}", user_id);

        let connections_clone = self.connections.clone();
        let senders_clone = self.senders.clone();
        let redis_clone = self.redis.clone();
        let storage_clone = self.storage.clone();
        let _compressor_clone_send = self.compressor.clone();
        let compressor_clone_recv = self.compressor.clone();
        let user_id_clone = user_id.clone();

        // 启动发送任务
        let user_id_send = user_id.clone();
        let send_task = tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                // 添加消息发送日志
                let message_type = match &message {
                    AppMessage::Chat { .. } => "Chat",
                    AppMessage::Welcome { .. } => "Welcome",
                    AppMessage::History { .. } => "History",
                    AppMessage::HistoryRequest { .. } => "HistoryRequest",
                    AppMessage::OnlineUsers { .. } => "OnlineUsers",
                    AppMessage::Heartbeat { .. } => "Heartbeat",
                    AppMessage::Typing { .. } => "Typing",
                    AppMessage::System { .. } => "System",
                    AppMessage::UserJoined { .. } => "UserJoined",
                    AppMessage::UserLeft { .. } => "UserLeft",
                    AppMessage::Status { .. } => "Status",
                    AppMessage::Error { .. } => "Error",
                    AppMessage::HtmlTemplate { .. } => "HtmlTemplate",
                    AppMessage::HtmlCallback { .. } => "HtmlCallback",
                    AppMessage::Voice { .. } => "VoiceMessage",
                };

                tracing::info!("📤 准备发送消息给 {}: 类型={}", user_id_send, message_type);

                if let Ok(json) = serde_json::to_string(&message) {
                    // 暂时禁用压缩，直接发送JSON消息
                    let final_message = json;

                    match ws_sender.send(WsMessage::text(final_message)).await { Err(e) => {
                        tracing::error!(
                            "❌ 发送消息失败给 {}: 类型={}, error={:?}",
                            user_id_send,
                            message_type,
                            e
                        );
                        break;
                    } _ => {
                        tracing::info!("✅ 成功发送消息给 {}: 类型={}", user_id_send, message_type);
                    }}
                } else {
                    tracing::error!(
                        "❌ 序列化消息失败给 {}: 类型={}",
                        user_id_send,
                        message_type
                    );
                }
            }
            tracing::info!("📤 发送任务结束: {}", user_id_send);
        });

        // 启动接收任务
        let self_clone = Arc::new(WebSocketManager {
            connections: connections_clone,
            senders: senders_clone,
            redis: redis_clone,
            storage: storage_clone,
            compressor: compressor_clone_recv,
            // 复用现有的message_queue和status_syncer
            message_queue: self.message_queue.clone(),
            status_syncer: self.status_syncer.clone(),
        });

        let receive_task = tokio::spawn(async move {
            tracing::info!("📥 接收任务开始: {}", user_id_clone);

            while let Some(result) = ws_receiver.next().await {
                match result {
                    Ok(msg) => {
                        tracing::info!(
                            "📥 收到WebSocket消息从 {}: 长度={}",
                            user_id_clone,
                            if msg.is_text() {
                                msg.to_str().map(|s| s.len()).unwrap_or(0)
                            } else {
                                0
                            }
                        );

                        if let Err(e) = self_clone.handle_message(msg, &user_id_clone).await {
                            tracing::error!("❌ 处理消息失败从 {}: error={:?}", user_id_clone, e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("❌ WebSocket错误从 {}: {:?}", user_id_clone, e);
                        break;
                    }
                }
            }

            tracing::info!("📥 接收任务结束: {}", user_id_clone);
            // 清理连接
            self_clone.cleanup_connection(&user_id_clone).await;
        });

        // 等待任务完成
        tokio::select! {
            _ = send_task => {},
            _ = receive_task => {},
        }

        Ok(())
    }

    // 处理WebSocket消息 - 生产级优化
    async fn handle_message(&self, message: WsMessage, user_id: &str) -> Result<()> {
        if message.is_text() {
            let text = message
                .to_str()
                .map_err(|_| anyhow::anyhow!("Invalid UTF-8"))?;

            // 更新心跳时间
            self.update_heartbeat(user_id).await;

            // 暂时禁用解压缩，直接使用原始文本
            let decompressed_text = text.to_string();

            tracing::debug!("📨 收到原始消息: {} -> '{}'", user_id, decompressed_text);

            // 生产级消息解析：优先尝试JSON解析
            match serde_json::from_str::<AppMessage>(&decompressed_text) {
                Ok(app_message) => {
                    tracing::info!("✅ 成功解析为AppMessage: {:?}", app_message);
                    self.process_app_message(app_message, user_id).await?;
                }
                Err(parse_error) => {
                    tracing::warn!("⚠️ JSON解析失败: {}, 当作文本消息处理", parse_error);
                    // 如果不是标准消息格式，当作文本聊天消息处理
                    self.handle_text_message(&decompressed_text, user_id)
                        .await?;
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
                    user_id,
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
            AppMessage::Heartbeat {
                user_id: msg_user_id,
                timestamp,
            } => {
                self.handle_heartbeat(msg_user_id, user_id, timestamp)
                    .await?;
            }
            AppMessage::HistoryRequest {
                customer_id,
                limit: _limit,
                timestamp: _timestamp,
            } => {
                tracing::info!("📚 客服{}请求客户{}的历史消息", user_id, customer_id);
                
                // 验证是客服用户
                let user_connection = {
                    let connections = self.connections.read().await;
                    connections.get(user_id).cloned()
                };
                
                if let Some(connection) = user_connection {
                    if connection.user_type == UserType::Kefu {
                        if let Some(sender) = self.get_user_sender(user_id).await {
                            self.send_customer_history_messages(user_id, &customer_id, &sender).await?;
                        }
                    } else {
                        tracing::warn!("⚠️ 非客服用户尝试请求历史消息: {}", user_id);
                    }
                } else {
                    tracing::warn!("⚠️ 用户连接不存在: {}", user_id);
                }
            }
            AppMessage::Status {
                user_id,
                status,
                timestamp: _timestamp, // 使用下划线前缀表示未使用
            } => {
                self.handle_status_message(user_id, status).await?;
            }
            AppMessage::OnlineUsers { users } => {
                // 处理在线用户列表消息
                if users.is_none() {
                    // 这是一个请求，发送当前在线用户列表
                    tracing::info!("📋 收到在线用户列表请求: {}", user_id);
                    if let Some(sender) = self.get_user_sender(user_id).await {
                        self.send_online_users(&sender).await?;
                    }
                } else {
                    // 这是一个响应消息，通常不会发生在客户端到服务器的通信中
                    tracing::warn!("⚠️ 收到在线用户列表响应消息，忽略: {}", user_id);
                }
            }
            AppMessage::Error {
                message,
                code,
                timestamp,
            } => {
                tracing::error!(
                    "收到错误消息从 {}: code={}, message={}, timestamp={:?}",
                    user_id,
                    code,
                    message,
                    timestamp
                );
            }
            AppMessage::HtmlTemplate {
                id,
                template_id,
                template_name,
                from,
                to,
                variables,
                rendered_html,
                callback_url,
                callback_data,
                timestamp,
            } => {
                // 处理HTML模板消息
                tracing::info!(
                    "🎨 处理HTML模板消息: template_id={}, from={}, to={:?}",
                    template_id,
                    from,
                    to
                );

                // 创建HTML模板消息
                let html_message = AppMessage::HtmlTemplate {
                    id: id.clone(),
                    template_id: template_id.clone(),
                    template_name: template_name.clone(),
                    from: from.clone(),
                    to: to.clone(),
                    variables: variables.clone(),
                    rendered_html: rendered_html.clone(),
                    callback_url: callback_url.clone(),
                    callback_data: callback_data.clone(),
                    timestamp,
                };

                // 如果有接收者，转发给接收者
                if let Some(to_user) = &to {
                    tracing::info!("📤 转发HTML模板消息给接收者: {}", to_user);
                    self.send_to_user(to_user, html_message.clone()).await?;
                }

                // 回显给发送者
                tracing::info!("📤 回显HTML模板消息给发送者: {}", user_id);
                self.send_to_user(user_id, html_message).await?;
            }
            AppMessage::HtmlCallback {
                message_id,
                template_id,
                action,
                element_id: _,
                callback_data: _,
                user_id: callback_user_id,
                timestamp: _,
            } => {
                // 处理HTML回调消息
                tracing::info!(
                    "⚡ 处理HTML回调消息: message_id={}, template_id={}, action={}, user_id={}",
                    message_id,
                    template_id,
                    action,
                    callback_user_id
                );

                // 这里可以添加回调处理逻辑，比如：
                // 1. 保存回调数据到数据库
                // 2. 通知相关的客服或系统
                // 3. 触发后续的业务逻辑

                // 创建系统消息通知回调已处理
                let system_msg = AppMessage::System {
                    content: format!("HTML回调处理完成: {} - {}", action, template_id),
                    timestamp: Utc::now(),
                };

                // 发送给触发回调的用户
                self.send_to_user(user_id, system_msg).await?;
            }
            AppMessage::Voice {
                id,
                from,
                to,
                voice_id,
                file_id,
                original_filename,
                file_size,
                duration,
                format,
                access_url,
                transcription,
                timestamp,
            } => {
                let voice_params = VoiceMessageParams {
                    id,
                    from,
                    to,
                    voice_id,
                    file_id,
                    original_filename,
                    file_size,
                    duration,
                    format,
                    access_url,
                    transcription,
                    timestamp,
                };
                self.handle_voice_message(voice_params, user_id).await?;
            }
            _ => {
                tracing::warn!("Unhandled message type from user {}", user_id);
            }
        }
        Ok(())
    }

    // 处理文本消息 - 生产级实现
    async fn handle_text_message(&self, text: &str, user_id: &str) -> Result<()> {
        tracing::info!("📝 处理文本消息: {} -> '{}'", user_id, text);

        // 获取用户信息
        let user_connection = {
            let connections = self.connections.read().await;
            connections.get(user_id).cloned()
        };

        if let Some(user_conn) = user_connection {
            // 获取聊天对象
            let partner_id = self.get_chat_partner(user_id, &user_conn.user_type).await?;

            if let Some(to) = partner_id {
                tracing::info!("💬 找到聊天伙伴: {} -> {}", user_id, to);

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
                tracing::info!("💾 消息已保存到本地存储");

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
                tracing::info!("📤 转发消息给接收者: {}", to);
                self.send_to_user(&to, app_message.clone()).await?;

                // 回显给发送者
                tracing::info!("📤 回显消息给发送者: {}", user_id);
                self.send_to_user(user_id, app_message).await?;
            } else {
                tracing::warn!("⚠️ 没有找到聊天伙伴: {}", user_id);
            }
        } else {
            tracing::warn!("⚠️ 用户连接信息未找到: {}", user_id);
        }

        Ok(())
    }

    // 处理聊天消息 - 生产级实现
    #[allow(clippy::too_many_arguments)]
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
        current_user_id: &str,
    ) -> Result<()> {
        // 生产级用户ID处理：确保发送者ID与当前连接用户ID一致
        let verified_from = current_user_id.to_string();

        tracing::info!(
            "💬 处理聊天消息: 消息from={}, 连接user_id={}, 使用连接ID | '{}'",
            from,
            current_user_id,
            content
        );

        let message_id = id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let message_url = url.unwrap_or_else(|| format!("#{}", timestamp.timestamp_millis()));

        let chat_message = ChatMessage {
            id: Some(message_id.clone()),
            from: verified_from.clone(),
            to: to.clone(),
            content: content.clone(),
            content_type: content_type.clone(),
            filename: filename.clone(),
            timestamp,
            url: Some(message_url.clone()),
        };

        // 保存到本地存储
        self.storage.save_message(&chat_message)?;
        tracing::info!("💾 聊天消息已保存到本地存储");

        // 创建应用消息
        let app_message = AppMessage::Chat {
            id: Some(message_id),
            from: verified_from.clone(),
            to: to.clone(),
            content,
            content_type,
            filename,
            timestamp,
            url: Some(message_url),
        };

        // 转发给接收者
        if let Some(to_user) = &to {
            tracing::info!("📤 转发聊天消息给接收者: {}", to_user);
            self.send_to_user(to_user, app_message.clone()).await?;
        } else {
            // 如果没有明确的接收者，尝试找到聊天伙伴
            tracing::info!("🔍 没有明确接收者，查找聊天伙伴...");
            let user_connection = {
                let connections = self.connections.read().await;
                connections.get(current_user_id).cloned()
            };

            if let Some(user_conn) = user_connection {
                match self
                    .get_chat_partner(current_user_id, &user_conn.user_type)
                    .await
                { Ok(Some(partner_id)) => {
                    tracing::info!(
                        "📤 找到聊天伙伴，转发消息: {} -> {}",
                        current_user_id,
                        partner_id
                    );
                    let mut forwarded_message = app_message.clone();
                    // 更新to字段
                    if let AppMessage::Chat { ref mut to, .. } = forwarded_message {
                        *to = Some(partner_id.clone());
                    }
                    self.send_to_user(&partner_id, forwarded_message).await?;
                } _ => {
                    tracing::warn!("⚠️ 没有找到聊天伙伴，消息无法转发");
                }}
            }
        }

        // 回显给发送者 - 使用当前连接用户ID
        tracing::info!("📤 回显聊天消息给发送者: {}", current_user_id);
        self.send_to_user(current_user_id, app_message).await?;

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
                if let Ok(Some(partner_id)) =
                    self.get_chat_partner(&from, &user_conn.user_type).await
                {
                    self.send_to_user(&partner_id, typing_message).await?;
                }
            }
        }

        Ok(())
    }

    // 处理心跳消息 - 生产级实现
    async fn handle_heartbeat(
        &self,
        message_user_id: Option<String>,
        current_user_id: &str,
        _timestamp: chrono::DateTime<Utc>,
    ) -> Result<()> {
        // 生产级用户ID处理：优先使用当前连接的用户ID，确保一致性
        let target_user_id = current_user_id;

        tracing::info!(
            "🫀 处理心跳消息: 消息user_id={:?}, 连接user_id={}, 使用连接ID",
            message_user_id,
            current_user_id
        );

        // 更新心跳时间
        self.update_heartbeat(target_user_id).await;

        // 发送心跳响应
        let heartbeat_response = AppMessage::Heartbeat {
            user_id: Some(target_user_id.to_string()),
            timestamp: Utc::now(),
        };

        tracing::info!("🫀 发送心跳响应给: {}", target_user_id);
        self.send_to_user(target_user_id, heartbeat_response)
            .await?;

        Ok(())
    }

    // 处理状态消息 - 简化版本，移除未使用的timestamp参数
    async fn handle_status_message(&self, user_id: String, status: OnlineStatus) -> Result<()> {
        // 更新连接状态
        {
            let mut connections = self.connections.write().await;
            if let Some(connection) = connections.get_mut(&user_id) {
                connection.status = status.clone();
            }
        }

        // 更新Redis中的状态
        if let Ok(redis) = self.redis.try_write() {
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

    // 发送消息给特定用户 - 生产级实现
    async fn send_to_user(&self, user_id: &str, message: AppMessage) -> Result<()> {
        let message_type = match &message {
            AppMessage::Chat { .. } => "Chat",
            AppMessage::Welcome { .. } => "Welcome",
            AppMessage::History { .. } => "History",
            AppMessage::HistoryRequest { .. } => "HistoryRequest",
            AppMessage::OnlineUsers { .. } => "OnlineUsers",
            AppMessage::Heartbeat { .. } => "Heartbeat",
            AppMessage::Typing { .. } => "Typing",
            AppMessage::System { .. } => "System",
            AppMessage::UserJoined { .. } => "UserJoined",
            AppMessage::UserLeft { .. } => "UserLeft",
            AppMessage::Status { .. } => "Status",
            AppMessage::Error { .. } => "Error",
            AppMessage::HtmlTemplate { .. } => "HtmlTemplate",
            AppMessage::HtmlCallback { .. } => "HtmlCallback",
            AppMessage::Voice { .. } => "VoiceMessage",
        };

        let senders = self.senders.read().await;

        tracing::info!("📤 尝试发送{}消息给: {}", message_type, user_id);

        if let Some(sender) = senders.get(user_id) {
            match sender.send(message) {
                Ok(_) => {
                    tracing::info!("✅ 成功发送{}消息给: {}", message_type, user_id);
                }
                Err(_) => {
                    tracing::error!("❌ 发送{}消息失败给: {} (通道关闭)", message_type, user_id);
                    // 生产级错误处理：移除无效的发送器
                    drop(senders);
                    let mut senders_write = self.senders.write().await;
                    senders_write.remove(user_id);
                    tracing::warn!("🧹 已移除失效的发送器: {}", user_id);
                }
            }
        } else {
            let available_users: Vec<String> = senders.keys().cloned().collect();
            tracing::warn!(
                "⚠️ 用户{}不存在发送器列表中，无法发送{}消息",
                user_id,
                message_type
            );
            tracing::debug!("📋 当前可用用户: {:?}", available_users);
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

    // 企业级用户离开广播功能
    #[allow(dead_code)] // 企业级功能：用于大规模用户状态管理和日志记录
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
        let redis = self.redis.read().await;
        if let Ok(users) = redis.get_online_users().await {
            let online_users_message = AppMessage::OnlineUsers { users: Some(users) };

            self.broadcast_message(online_users_message).await?;
        }

        Ok(())
    }

    // 广播客户列表给所有客服
    async fn broadcast_customer_list(&self) -> Result<()> {
        let connections = self.connections.read().await;
        let mut customer_list = Vec::new();

        // 获取所有在线客户
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu {
                let user_info = crate::message::UserInfo {
                    user_id: user_id.clone(),
                    user_name: connection.user_name.clone(),
                    user_type: connection.user_type.clone(),
                    status: connection.status.clone(),
                    zhanghao: connection.zhanghao.clone(),
                    last_seen: connection.last_heartbeat,
                    avatar: None,
                };
                customer_list.push(user_info);
            }
        }

        // 按最后活动时间排序
        customer_list.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));

        let customer_count = customer_list.len();
        let customer_list_message = AppMessage::OnlineUsers { users: Some(customer_list) };

        // 只向客服发送客户列表
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kefu {
                self.send_to_user(user_id, customer_list_message.clone()).await?;
            }
        }

        tracing::info!("📋 已广播客户列表给所有客服，共{}个客户", customer_count);

        Ok(())
    }

    // 获取用户发送器
    async fn get_user_sender(&self, user_id: &str) -> Option<mpsc::UnboundedSender<AppMessage>> {
        let senders = self.senders.read().await;
        senders.get(user_id).cloned()
    }

    // 更新心跳时间
    async fn update_heartbeat(&self, user_id: &str) {
        if let Ok(redis) = self.redis.try_write() {
            let _ = redis.update_heartbeat(user_id).await;
        }

        // 更新本地连接信息
        if let Ok(mut connections) = self.connections.try_write() {
            if let Some(connection) = connections.get_mut(user_id) {
                connection.last_heartbeat = Utc::now();
            }
        }
    }

    // 🚀 企业级聊天伙伴智能配对系统 - 支持多会话并发处理
    async fn get_chat_partner(
        &self,
        user_id: &str,
        user_type: &UserType,
    ) -> Result<Option<String>> {
        let redis = self.redis.read().await;

        match user_type {
            UserType::Kefu => {
                // 🎯 客服端：简化的会话管理

                // 1. 直接检查是否有已建立的会话
                if let Ok(Some(assigned_customer)) = redis.get_partner(user_id).await {
                    // 验证客户是否仍在线
                    let connections = self.connections.read().await;
                    if connections.contains_key(&assigned_customer) {
                        tracing::info!("👨‍💼 客服{}继续与客户对话: {}", user_id, assigned_customer);
                        return Ok(Some(assigned_customer));
                    } else {
                        // 客户已离线，清除配对关系
                        tracing::warn!("⚠️ 客户{}已离线，清除会话", assigned_customer);
                        let _ = redis.clear_session(&assigned_customer, user_id).await;
                    }
                }

                // 2. 寻找等待中的客户
                if let Ok(Some(waiting_customer)) = self.find_waiting_customer_for_kefu(user_id).await {
                    tracing::info!("🤝 客服{}分配新客户: {}", user_id, waiting_customer);
                    let _ = self.establish_session(&waiting_customer, user_id, &None).await;
                    return Ok(Some(waiting_customer));
                }

                tracing::info!("💤 客服{}暂无客户会话", user_id);
                Ok(None)
            }
            UserType::Kehu => {
                // 🎯 客户端：智能客服分配

                // 1. 检查是否已有专属客服
                if let Ok(Some(assigned_kefu)) = redis.get_partner(user_id).await {
                    // 验证客服是否仍在线
                    let connections = self.connections.read().await;
                    if connections.contains_key(&assigned_kefu) {
                        tracing::info!("👨‍💼 客户{}继续与专属客服对话: {}", user_id, assigned_kefu);
                        return Ok(Some(assigned_kefu));
                    } else {
                        // 客服已离线，清除配对关系
                        tracing::warn!("⚠️ 专属客服{}已离线，重新分配", assigned_kefu);
                        let _ = redis.clear_session(user_id, &assigned_kefu).await;
                    }
                }

                // 2. 智能客服分配：负载均衡算法
                if let Ok(best_kefu) = self.find_optimal_kefu_for_customer(user_id).await {
                    tracing::info!("🎯 为客户{}智能分配最优客服: {}", user_id, best_kefu);
                    let _ = self.establish_session(user_id, &best_kefu, &None).await;
                    return Ok(Some(best_kefu));
                }

                // 3. 进入等待队列
                tracing::info!("⏳ 客户{}进入等待队列", user_id);
                let _ = redis.add_to_waiting_queue(user_id).await;
                Ok(None)
            }
        }
    }

    // 🎯 企业级客服负载均衡算法 - 集成工作负载分析
    pub async fn find_optimal_kefu_for_customer(&self, _customer_id: &str) -> Result<String> {
        let connections = self.connections.read().await;
        let redis = self.redis.read().await;

        let mut kefu_candidates = Vec::new();

        // 收集所有在线客服及其企业级工作负载数据
        for (kefu_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kefu {
                // 🚀 使用企业级工作负载分析
                let workload_data = match redis.get_kefu_workload(kefu_id).await { 
                    Ok(workload) => workload,
                    Err(_) => {
                        // 如果获取失败，使用基础数据
                        serde_json::json!({
                            "active_sessions": 0,
                            "avg_response_time": 0,
                            "satisfaction_score": 5.0
                        })
                    }
                };

                let session_count = workload_data["active_sessions"].as_u64().unwrap_or(0) as usize;
                let avg_response_time = workload_data["avg_response_time"].as_f64().unwrap_or(0.0);
                let satisfaction_score = workload_data["satisfaction_score"].as_f64().unwrap_or(5.0);

                // 只考虑未满负载的客服（最大5个会话）
                if session_count < 5 {
                    // 🧠 企业级评分算法：综合考虑负载、响应时间、满意度
                    let efficiency_score = (10.0 - session_count as f64) * 2.0  // 负载权重
                        + (10.0 - avg_response_time.min(10.0)) * 1.5            // 响应时间权重
                        + satisfaction_score * 1.0; // 满意度权重

                    kefu_candidates.push((
                        kefu_id.clone(),
                        session_count,
                        efficiency_score,
                        connection.connected_at,
                    ));
                }
            }
        }

        if kefu_candidates.is_empty() {
            return Err(anyhow::anyhow!("No available kefu found"));
        }

        // 🧠 企业级智能分配算法：按效率评分排序
        kefu_candidates.sort_by(|a, b| {
            b.2.partial_cmp(&a.2)
                .unwrap_or(std::cmp::Ordering::Equal) // 按效率评分降序排序
                .then_with(|| a.1.cmp(&b.1)) // 负载低的优先
                .then_with(|| a.3.cmp(&b.3)) // 在线时间长的优先
        });

        let selected_kefu = &kefu_candidates[0];
        tracing::info!(
            "🎯 企业级智能分配: 客服={}, 负载={}/5, 效率评分={:.2}",
            selected_kefu.0,
            selected_kefu.1,
            selected_kefu.2
        );

        Ok(selected_kefu.0.clone())
    }

    // 🔍 为特定客服寻找等待中的客户
    async fn find_waiting_customer_for_kefu(&self, kefu_id: &str) -> Result<Option<String>> {
        let redis = self.redis.read().await;
        let connections = self.connections.read().await;

        // 获取等待队列中的客户
        if let Ok(waiting_customers) = redis.get_waiting_queue().await {
            for customer_id in waiting_customers {
                // 验证客户是否仍在线
                if connections.contains_key(&customer_id) {
                    // 检查客户是否未被分配
                    if let Ok(None) = redis.get_partner(&customer_id).await {
                        tracing::info!("🎯 为客服{}找到等待客户: {}", kefu_id, customer_id);
                        // 从等待队列移除
                        let _ = redis.remove_from_waiting_queue(&customer_id).await;
                        return Ok(Some(customer_id));
                    }
                }
            }
        }

        Ok(None)
    }

    // 寻找可用客服 - 简化为公共方法
    pub async fn find_available_kefu(&self) -> Result<String> {
        let connections = self.connections.read().await;
        let redis = self.redis.read().await;

        // 查找在线的客服
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kefu {
                // 检查这个客服是否已经有客户
                if let Ok(None) = redis.get_partner(user_id).await {
                    // 没有伙伴关系，说明客服可用
                    return Ok(user_id.clone());
                }
            }
        }

        Err(anyhow::anyhow!("No available kefu found"))
    }

    // 寻找等待的客户 - 简化为公共方法
    pub async fn find_waiting_customer(&self) -> Result<String> {
        let connections = self.connections.read().await;
        let redis = self.redis.read().await;

        // 查找在线但没有分配客服的客户
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu {
                // 检查这个客户是否已经有客服
                if let Ok(None) = redis.get_partner(user_id).await {
                    // 没有伙伴关系，说明客户在等待
                    return Ok(user_id.clone());
                }
            }
        }

        Err(anyhow::anyhow!("No waiting customer found"))
    }

    // 🚀 企业级会话建立系统 - 简化为公共方法
    pub async fn establish_session(
        &self,
        kehu_id: &str,
        kefu_id: &str,
        _zhanghao: &Option<String>,
    ) -> Result<()> {
        let redis = self.redis.write().await;

        // 使用企业级增强会话建立功能
        redis.establish_session_enhanced(kehu_id, kefu_id).await?;

        tracing::info!(
            "🎯 企业级会话已建立: {} <-> {} (增强模式)",
            kehu_id,
            kefu_id
        );
        Ok(())
    }

    // 发送历史消息
    async fn send_history_messages(
        &self,
        user_id: &str,
        user_type: &UserType,
        sender: &mpsc::UnboundedSender<AppMessage>,
    ) -> Result<()> {
        // 从本地存储获取历史消息
        let messages = match user_type {
            UserType::Kefu => {
                // 客服只获取空的历史消息，会话历史将通过客户切换时单独请求
                Ok(Vec::new())
            }
            UserType::Kehu => {
                // 客户获取与所有用户的消息
                self.storage.get_recent_messages(user_id, "all", 20)
            }
        };

        if let Ok(chat_messages) = messages {
            // 批量发送历史消息
            let history_message = AppMessage::History {
                messages: chat_messages,
            };
            let _ = sender.send(history_message);
        }

        Ok(())
    }

    // 新增：发送特定客户的历史消息
    async fn send_customer_history_messages(
        &self,
        kefu_id: &str,
        customer_id: &str,
        sender: &mpsc::UnboundedSender<AppMessage>,
    ) -> Result<()> {
        // 获取客服与特定客户的历史消息
        let messages = self.storage.get_recent_messages(kefu_id, customer_id, 50);

        if let Ok(chat_messages) = messages {
            tracing::info!("📚 发送客服{}与客户{}的历史消息: {}条", kefu_id, customer_id, chat_messages.len());
            
            let history_message = AppMessage::History {
                messages: chat_messages,
            };
            let _ = sender.send(history_message);
        } else {
            tracing::warn!("⚠️ 获取历史消息失败: {} <-> {}", kefu_id, customer_id);
        }

        Ok(())
    }

    // 发送在线用户列表
    async fn send_online_users(&self, sender: &mpsc::UnboundedSender<AppMessage>) -> Result<()> {
        let connections = self.connections.read().await;
        let mut users = Vec::new();

        // 获取所有在线客户 (客服需要看到客户列表)
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu {
                let user_info = crate::message::UserInfo {
                    user_id: user_id.clone(),
                    user_name: connection.user_name.clone(),
                    user_type: connection.user_type.clone(),
                    status: connection.status.clone(),
                    zhanghao: connection.zhanghao.clone(),
                    last_seen: connection.last_heartbeat,
                    avatar: None,
                };
                users.push(user_info);
            }
        }

        // 按最后活动时间排序
        users.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));

        let user_count = users.len();
        let online_users_message = AppMessage::OnlineUsers { users: Some(users) };
        let _ = sender.send(online_users_message);

        tracing::info!("📋 发送在线客户列表: 共{}个客户", user_count);

        Ok(())
    }

    // 清理连接
    pub async fn cleanup_connection(&self, user_id: &str) {
        // 🚀 在移除连接前获取用户信息用于实时通知
        let user_info = {
            let connections = self.connections.read().await;
            connections.get(user_id).cloned()
        };

        // 从连接管理器移除
        {
            let mut connections = self.connections.write().await;
            connections.remove(user_id);
        }

        // 从发送器管理器移除
        {
            let mut senders = self.senders.write().await;
            senders.remove(user_id);
        }

        // 更新Redis中的离线状态
        {
            let redis = self.redis.write().await;
            let _ = redis.set_user_offline(user_id).await;
        }

        // 🚀 发送实时下线通知
        if let Some(ref user_conn) = user_info {
            if let Err(e) = self.notify_user_offline(user_id, &user_conn.user_name, &user_conn.user_type).await {
                tracing::warn!("⚠️ 发送实时下线通知失败: {}, error: {:?}", user_id, e);
            }
        }

        // 广播用户离开通知
        let leave_message = if let Some(user_conn) = user_info {
            AppMessage::UserLeft {
                user_id: user_id.to_string(),
                user_name: user_conn.user_name,
                user_type: user_conn.user_type,
                timestamp: Utc::now(),
            }
        } else {
            // 如果找不到用户信息，使用默认值
            AppMessage::UserLeft {
                user_id: user_id.to_string(),
                user_name: "Unknown".to_string(),
                user_type: UserType::Kehu,
                timestamp: Utc::now(),
            }
        };

        let _ = self.broadcast_message(leave_message).await;

        // 🚀 广播实时在线状态更新
        if let Err(e) = self.broadcast_realtime_user_status().await {
            tracing::warn!("⚠️ 广播实时在线状态失败: {}, error: {:?}", user_id, e);
        }

        tracing::info!("User {} disconnected after connection cleanup", user_id);
    }

    // 🚀 企业级连接统计系统 - 集成Redis会话统计
    #[allow(dead_code)]
    pub async fn get_connection_stats(&self) -> ConnectionStats {
        let connections = self.connections.read().await;
        let total_connections = connections.len();

        let mut kefu_connections = 0;
        let mut kehu_connections = 0;
        let mut total_duration = 0i64;
        let mut longest_duration = 0i64;

        let now = Utc::now();

        // 计算本地连接统计
        for connection in connections.values() {
            match connection.user_type {
                UserType::Kefu => kefu_connections += 1,
                UserType::Kehu => kehu_connections += 1,
            }

            let duration = (now - connection.connected_at).num_seconds();
            total_duration += duration;
            if duration > longest_duration {
                longest_duration = duration;
            }
        }

        let average_duration = if total_connections > 0 {
            total_duration / total_connections as i64
        } else {
            0
        };

        // 🚀 集成企业级Redis会话统计数据
        let redis = self.redis.read().await;
        match redis.get_session_stats().await { Ok(session_stats) => {
            tracing::info!(
                "📊 企业级统计数据: 本地连接={}, Redis会话统计={}",
                total_connections,
                session_stats
            );

            // 可以在这里将Redis统计数据合并到ConnectionStats中
            // 为未来扩展预留接口
        } _ => {
            tracing::debug!("📊 使用基础连接统计 (Redis统计暂不可用)");
        }}

        ConnectionStats {
            total_connections,
            kefu_connections,
            kehu_connections,
            average_connection_duration: average_duration,
            longest_connection_duration: longest_duration,
        }
    }

    // 启动心跳检查器
    pub async fn start_heartbeat_checker(&self) {
        let redis = self.redis.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));

            loop {
                interval.tick().await;

                if let Ok(redis_manager) = redis.try_write() {
                    if let Ok(offline_users) = redis_manager.check_offline_users().await {
                        if !offline_users.is_empty() {
                            tracing::info!(
                                "Found {} offline users, cleaning up",
                                offline_users.len()
                            );
                        }
                    }
                }
            }
        });
    }

    // 🚀 企业级客户切换系统
    #[allow(dead_code)]
    pub async fn switch_customer_session(
        &self,
        kefu_id: &str,
        target_customer_id: &str,
    ) -> Result<bool> {
        tracing::info!("🔄 客服{}请求切换到客户: {}", kefu_id, target_customer_id);

        // 验证客服身份
        let connections = self.connections.read().await;
        if let Some(kefu_conn) = connections.get(kefu_id) {
            if kefu_conn.user_type != UserType::Kefu {
                tracing::warn!("⚠️ 非客服用户尝试切换客户: {}", kefu_id);
                return Ok(false);
            }
        } else {
            tracing::warn!("⚠️ 客服{}不在连接列表中", kefu_id);
            return Ok(false);
        }

        // 🔍 智能用户ID匹配 - 解决用户ID不一致问题
        let actual_customer_id = self.find_actual_customer_id(target_customer_id).await?;

        if let Some(real_customer_id) = actual_customer_id {
            // 验证目标客户是否在线
            if !connections.contains_key(&real_customer_id) {
                tracing::warn!("⚠️ 目标客户{}不在线", real_customer_id);
                return Ok(false);
            }

            // 🎯 建立新会话关系
            let redis = self.redis.write().await;
            let session_result = redis
                .establish_session_enhanced(&real_customer_id, kefu_id)
                .await;

            match session_result {
                Ok(_) => {
                    tracing::info!("✅ 客服{}成功切换到客户: {}", kefu_id, real_customer_id);

                    // 发送切换成功通知给客服
                    let switch_notification = AppMessage::System {
                        content: format!("✅ 已切换到客户: {}", real_customer_id),
                        timestamp: Utc::now(),
                    };
                    self.send_to_user(kefu_id, switch_notification).await?;

                    // 发送历史消息
                    if let Some(sender) = self.get_user_sender(kefu_id).await {
                        let messages =
                            self.storage
                                .get_recent_messages(kefu_id, &real_customer_id, 20)?;
                        let history_message = AppMessage::History { messages };
                        let _ = sender.send(history_message);
                    }

                    Ok(true)
                }
                Err(e) => {
                    tracing::error!("❌ 会话建立失败: {:?}", e);
                    Ok(false)
                }
            }
        } else {
            tracing::warn!("⚠️ 无法找到匹配的客户ID: {}", target_customer_id);
            Ok(false)
        }
    }

    // 🔍 智能用户ID匹配算法 - 解决ID不一致问题
    #[allow(dead_code)]
    async fn find_actual_customer_id(&self, partial_id: &str) -> Result<Option<String>> {
        let connections = self.connections.read().await;

        // 1. 精确匹配
        if connections.contains_key(partial_id) {
            return Ok(Some(partial_id.to_string()));
        }

        // 2. 前缀匹配 (处理ID前缀情况)
        for (full_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu
                && (full_id.starts_with(partial_id) || partial_id.starts_with(full_id))
            {
                tracing::info!("🎯 ID匹配: {} -> {}", partial_id, full_id);
                return Ok(Some(full_id.clone()));
            }
        }

        // 3. 用户名匹配 (处理显示名不一致问题)
        for (full_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu
                && (connection.user_name.contains(partial_id)
                    || partial_id.contains(&connection.user_name))
            {
                tracing::info!(
                    "🎯 用户名匹配: {} -> {} ({})",
                    partial_id,
                    full_id,
                    connection.user_name
                );
                return Ok(Some(full_id.clone()));
            }
        }

        // 4. 在线客户ID模糊匹配 (用户名包含查询词)
        for (full_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kehu {
                // 检查用户名是否包含查询词(忽略大小写)
                let partial_lower = partial_id.to_lowercase();
                let name_lower = connection.user_name.to_lowercase();
                let id_lower = full_id.to_lowercase();

                if name_lower.contains(&partial_lower) || id_lower.contains(&partial_lower) {
                    tracing::info!(
                        "🎯 模糊匹配: {} -> {} ({})",
                        partial_id,
                        full_id,
                        connection.user_name
                    );
                    return Ok(Some(full_id.clone()));
                }
            }
        }

        Ok(None)
    }

    // 🎯 获取客服的活跃客户列表
    #[allow(dead_code)]
    pub async fn get_kefu_customers(&self, kefu_id: &str) -> Result<Vec<CustomerInfo>> {
        let mut customers = Vec::new();
        let connections = self.connections.read().await;
        let redis = self.redis.read().await;

        // 获取客服的活跃会话
        if let Ok(active_sessions) = redis.get_kefu_active_sessions(kefu_id).await {
            for customer_id in active_sessions {
                if let Some(customer_conn) = connections.get(&customer_id) {
                    if customer_conn.user_type == UserType::Kehu {
                        // 获取最后一条消息
                        let last_message = self
                            .storage
                            .get_recent_messages(kefu_id, &customer_id, 1)
                            .unwrap_or_default()
                            .first()
                            .map(|msg| msg.content.clone())
                            .unwrap_or_default();

                        customers.push(CustomerInfo {
                            id: customer_id.clone(),
                            name: customer_conn.user_name.clone(),
                            status: customer_conn.status.clone(),
                            last_message,
                            last_activity: customer_conn.last_heartbeat,
                            unread_count: 0, // TODO: 实现未读消息计数
                        });
                    }
                }
            }
        }

        // 按最后活动时间排序
        customers.sort_by(|a, b| b.last_activity.cmp(&a.last_activity));

        Ok(customers)
    }

    /// 处理语音消息
    /// 企业级语音消息处理 - 使用参数结构体避免参数过多
    #[allow(clippy::too_many_arguments)]
    async fn handle_voice_message(
        &self,
        params: VoiceMessageParams,
        current_user_id: &str,
    ) -> Result<()> {
        tracing::info!(
            "🎤 处理语音消息: voice_id={}, from={}, to={:?}, 大小={}字节, 时长={:?}秒",
            params.voice_id, params.from, params.to, params.file_size, params.duration
        );

        // 验证发送者身份
        if params.from != current_user_id {
            tracing::warn!("❌ 语音消息发送者身份不匹配: {} != {}", params.from, current_user_id);
            return Err(anyhow::anyhow!("发送者身份验证失败"));
        }

        // 创建语音消息
        let voice_message = AppMessage::Voice {
            id: params.id.clone(),
            from: params.from.clone(),
            to: params.to.clone(),
            voice_id: params.voice_id.clone(),
            file_id: params.file_id.clone(),
            original_filename: params.original_filename.clone(),
            file_size: params.file_size,
            duration: params.duration,
            format: params.format.clone(),
            access_url: params.access_url.clone(),
            transcription: params.transcription.clone(),
            timestamp: params.timestamp,
        };

        // 创建存储用的聊天消息
        let chat_message = ChatMessage {
            id: params.id.clone(),
            from: params.from.clone(),
            to: params.to.clone(),
            content: format!("[语音消息] {} ({}秒)", params.original_filename, params.duration.unwrap_or(0)),
            content_type: Some(ContentType::Voice),
            filename: Some(params.original_filename.clone()),
            timestamp: params.timestamp,
            url: Some(params.access_url.clone()),
        };

        // 保存到本地存储
        if let Err(e) = self.storage.save_message(&chat_message) {
            tracing::error!("💾 保存语音消息到本地存储失败: {:?}", e);
        }

        // 语音消息暂时不需要特殊的Redis保存逻辑，因为ChatMessage已经通过常规方式保存了
        tracing::debug!("🎤 语音消息元数据已保存: voice_id={}", params.voice_id);

        // 处理消息转发逻辑
        if let Some(to_user) = &params.to {
            tracing::info!("📤 转发语音消息给接收者: {}", to_user);
            self.send_to_user(to_user, voice_message.clone()).await?;
        } else {
            // 没有指定接收者，根据用户类型智能路由
            let user_connection = {
                let connections = self.connections.read().await;
                connections.get(current_user_id).cloned()
            };

            if let Some(connection) = user_connection {
                let chat_partner = self.get_chat_partner(current_user_id, &connection.user_type).await?;
                
                if let Some(partner_id) = chat_partner {
                    tracing::info!("📤 智能路由语音消息给对话伙伴: {}", partner_id);
                    
                    // 更新消息中的接收者
                    let routed_message = AppMessage::Voice {
                        id: params.id.clone(),
                        from: params.from.clone(),
                        to: Some(partner_id.clone()),
                        voice_id: params.voice_id.clone(),
                        file_id: params.file_id.clone(),
                        original_filename: params.original_filename.clone(),
                        file_size: params.file_size,
                        duration: params.duration,
                        format: params.format.clone(),
                        access_url: params.access_url.clone(),
                        transcription: params.transcription.clone(),
                        timestamp: params.timestamp,
                    };
                    
                    self.send_to_user(&partner_id, routed_message).await?;
                } else {
                    tracing::warn!("⚠️ 语音消息无法找到对话伙伴: {}", current_user_id);
                }
            } else {
                tracing::warn!("⚠️ 用户连接不存在: {}", current_user_id);
            }
        }

        // 回显给发送者（确认消息已处理）
        tracing::info!("📤 回显语音消息给发送者: {}", current_user_id);
        self.send_to_user(current_user_id, voice_message).await?;

        tracing::info!("✅ 语音消息处理完成: voice_id={}", params.voice_id);
        Ok(())
    }

    /// 实时广播在线用户状态变化 - 企业级功能
    pub async fn broadcast_realtime_user_status(&self) -> Result<()> {
        let connections = self.connections.read().await;
        let mut user_infos = Vec::new();
        
        for (user_id, connection) in connections.iter() {
            user_infos.push(UserInfo {
                user_id: user_id.clone(),
                user_name: connection.user_name.clone(),
                user_type: connection.user_type.clone(),
                status: OnlineStatus::Online,
                zhanghao: connection.zhanghao.clone(),
                last_seen: Utc::now(),
                avatar: None,
            });
        }

        let status_message = AppMessage::OnlineUsers {
            users: Some(user_infos.clone()),
        };

        // 广播给所有连接的客服
        let senders = self.senders.read().await;
        for (user_id, sender) in senders.iter() {
            let connections_guard = self.connections.read().await;
            if let Some(connection) = connections_guard.get(user_id) {
                if connection.user_type == UserType::Kefu {
                    if let Err(e) = sender.send(status_message.clone()) {
                        tracing::warn!("发送实时状态消息失败 to {}: {:?}", user_id, e);
                    }
                }
            }
        }

        tracing::info!("📡 实时广播在线状态: {} 个用户在线", user_infos.len());
        Ok(())
    }

    /// 用户上线时的实时通知
    pub async fn notify_user_online(&self, user_id: &str, user_name: &str, user_type: &UserType) -> Result<()> {
        let notification = AppMessage::System {
            content: format!("🟢 {}({}) 已上线", user_name, user_id),
            timestamp: Utc::now(),
        };

        // 广播给所有客服
        let senders = self.senders.read().await;
        for (target_id, sender) in senders.iter() {
            let connections_guard = self.connections.read().await;
            if let Some(connection) = connections_guard.get(target_id) {
                if connection.user_type == UserType::Kefu {
                    if let Err(e) = sender.send(notification.clone()) {
                        tracing::warn!("发送上线通知失败 to {}: {:?}", target_id, e);
                    }
                }
            }
        }

        // 更新Redis中的在线状态
        {
            let redis = self.redis.read().await;
            let user_info = UserInfo {
                user_id: user_id.to_string(),
                user_name: user_name.to_string(),
                user_type: user_type.clone(),
                status: OnlineStatus::Online,
                zhanghao: None,
                last_seen: Utc::now(),
                avatar: None,
            };
            if let Err(e) = redis.set_user_online(user_id, &user_info).await {
                tracing::warn!("更新Redis在线状态失败: {:?}", e);
            }
        }

        Ok(())
    }

    /// 用户下线时的实时通知
    pub async fn notify_user_offline(&self, user_id: &str, user_name: &str, _user_type: &UserType) -> Result<()> {
        let notification = AppMessage::System {
            content: format!("🔴 {}({}) 已下线", user_name, user_id),
            timestamp: Utc::now(),
        };

        // 广播给所有客服
        let senders = self.senders.read().await;
        for (target_id, sender) in senders.iter() {
            let connections_guard = self.connections.read().await;
            if let Some(connection) = connections_guard.get(target_id) {
                if connection.user_type == UserType::Kefu {
                    if let Err(e) = sender.send(notification.clone()) {
                        tracing::warn!("发送下线通知失败 to {}: {:?}", target_id, e);
                    }
                }
            }
        }

        // 更新Redis中的离线状态
        {
            let redis = self.redis.read().await;
            if let Err(e) = redis.set_user_offline(user_id).await {
                tracing::warn!("更新Redis离线状态失败: {:?}", e);
            }
        }

        Ok(())
    }

    /// 检查用户是否实时在线 - 1秒精度检测
    /// 企业级API：保留用于潜在的外部调用和未来扩展
    #[allow(dead_code)]
    pub async fn is_user_realtime_online(&self, user_id: &str) -> bool {
        let connections = self.connections.read().await;
        connections.contains_key(user_id)
    }

    /// 获取实时在线用户数量
    pub async fn get_realtime_online_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }

    /// 获取实时在线用户列表
    pub async fn get_realtime_online_users(&self) -> Vec<serde_json::Value> {
        let connections = self.connections.read().await;
        let mut users = Vec::new();
        
        for (user_id, connection) in connections.iter() {
            users.push(serde_json::json!({
                "user_id": user_id,
                "user_name": connection.user_name,
                "user_type": connection.user_type,
                "connected_at": connection.connected_at,
                "last_seen": Utc::now(),
                "connection_id": format!("conn_{}_{}", user_id, connection.connected_at.timestamp()),
                "detection_method": "实时WebSocket连接",
                "confidence": 1.0
            }));
        }
        
        users
    }

    /// 强制断开指定用户的连接
    /// 管理员功能，用于处理违规用户
    pub async fn disconnect_user(&self, user_id: &str) -> bool {
        info!("🔌 管理员强制断开用户连接: {}", user_id);
        
        // 获取用户连接信息
        let connection_exists = {
            let connections = self.connections.read().await;
            connections.contains_key(user_id)
        };
        
        if connection_exists {
            // 清理连接
            self.cleanup_connection(user_id).await;
            
            // 广播用户离线消息
            if let Some(connection) = self.connections.read().await.get(user_id) {
                let _ = self.broadcast_user_left(
                    user_id, 
                    &connection.user_name, 
                    &connection.user_type
                ).await;
            }
            
            info!("✅ 成功断开用户 {} 的连接", user_id);
            true
        } else {
            info!("⚠️ 用户 {} 未在线", user_id);
            false
        }
    }

    /// 向所有在线用户广播消息
    /// 管理员功能，用于系统通知
    pub async fn broadcast_to_all(&self, message: &str) -> usize {
        info!("📢 向所有用户广播消息: {}", message);
        
        let connections = self.connections.read().await;
        let total_users = connections.len();
        let mut success_count = 0;
        
        let broadcast_message = AppMessage::System {
            content: format!("系统广播: {}", message),
            timestamp: Utc::now(),
        };
        
        for (user_id, _) in connections.iter() {
            if let Ok(()) = self.send_to_user(user_id, broadcast_message.clone()).await {
                success_count += 1;
            }
        }
        
        info!("📊 广播完成: {}/{} 用户成功接收", success_count, total_users);
        success_count
    }

    /// 获取用户最后活跃时间
    /// 用于用户状态监控
    pub async fn get_user_last_seen(&self, user_id: &str) -> Option<chrono::DateTime<Utc>> {
        let connections = self.connections.read().await;
        connections.get(user_id).map(|conn| conn.last_heartbeat)
    }

    /// 获取WebSocket服务运行时间
    /// 用于健康检查和监控
    pub async fn get_uptime(&self) -> std::time::Duration {
        // 这里可以添加服务启动时间的跟踪
        // 暂时返回一个默认值
        std::time::Duration::from_secs(0)
    }
}

/**
 * 🔥 为客户端订阅Redis频道 - 事件驱动核心
 */
// 🚀 Redis事件驱动架构 - 为用户订阅Redis频道
async fn subscribe_redis_channels_for_user(
    user_id: String,
    channels: Vec<String>,
    ws_manager: Arc<WebSocketManager>
) {
    tracing::info!("📡 为用户{}启动Redis频道订阅: {:?}", user_id, channels);
    
    // 获取Redis连接用于订阅
    let client = match redis::Client::open("redis://127.0.0.1:6379/") {
        Ok(client) => client,
        Err(e) => {
            tracing::error!("❌ Redis客户端创建失败: {}", e);
            return;
        }
    };
    
    let mut pubsub = match client.get_async_connection().await {
        Ok(conn) => conn.into_pubsub(),
        Err(e) => {
            tracing::error!("❌ Redis连接失败: {}", e);
            return;
        }
    };
    
    // 订阅所有指定频道
    for channel in &channels {
        if let Err(e) = pubsub.subscribe(channel).await {
            tracing::error!("❌ 订阅Redis频道失败 {}: {}", channel, e);
            return;
        }
        tracing::info!("✅ 用户{}已订阅Redis频道: {}", user_id, channel);
    }
    
    // 监听Redis消息并转发给WebSocket客户端
    use futures_util::StreamExt;
    let mut stream = pubsub.on_message();
    
    while let Some(msg) = stream.next().await {
        let channel: String = msg.get_channel_name().to_string();
        let payload: String = match msg.get_payload() {
            Ok(p) => p,
            Err(_) => continue,
        };
        
        // 解析Redis消息
        if let Ok(redis_event) = serde_json::from_str::<serde_json::Value>(&payload) {
            // 构造WebSocket消息
            let ws_message = json!({
                "type": "redis_event",
                "channel": channel,
                "event": redis_event,
                "timestamp": chrono::Utc::now().timestamp()
            });
            
                         // 发送给特定用户
             let app_message = AppMessage::System {
                 content: ws_message.to_string(),
                 timestamp: chrono::Utc::now(),
             };
             if (ws_manager.send_to_user(&user_id, app_message).await).is_err() {
                tracing::warn!("⚠️ 用户{}已断开，停止Redis事件转发", user_id);
                break;
            }
            
            tracing::debug!("📨 Redis事件已转发到用户{}: {}", user_id, channel);
        }
    }
    
    tracing::info!("🔚 用户{}的Redis频道订阅任务结束", user_id);
}
