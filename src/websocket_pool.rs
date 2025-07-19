use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{mpsc, RwLock, Semaphore};
use tokio::time::{Duration, Instant};
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// WebSocket连接池配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketPoolConfig {
    pub max_connections: usize,
    pub max_connections_per_ip: usize,
    pub connection_timeout: Duration,
    pub heartbeat_interval: Duration,
    pub max_idle_time: Duration,
    pub max_message_size: usize,
    pub rate_limit_per_second: u32,
    pub enable_compression: bool,
    pub enable_auto_scaling: bool,
}

impl Default for WebSocketPoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10000,
            max_connections_per_ip: 100,
            connection_timeout: Duration::from_secs(30),
            heartbeat_interval: Duration::from_secs(30),
            max_idle_time: Duration::from_secs(300),
            max_message_size: 1024 * 1024, // 1MB
            rate_limit_per_second: 10,
            enable_compression: true,
            enable_auto_scaling: true,
        }
    }
}

/// WebSocket连接信息
#[derive(Debug, Clone)]
pub struct WebSocketConnection {
    pub id: String,
    pub user_id: String,
    pub user_type: String,
    pub ip_address: String,
    pub user_agent: String,
    pub connected_at: Instant,
    pub last_activity: Instant,
    pub message_count: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub rate_limit_bucket: u32,
    pub rate_limit_last_refill: Instant,
    pub sender: mpsc::UnboundedSender<Message>,
}

/// WebSocket连接池统计
#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketPoolStats {
    pub total_connections: usize,
    pub active_connections: usize,
    pub idle_connections: usize,
    pub connections_by_type: HashMap<String, usize>,
    pub connections_by_ip: HashMap<String, usize>,
    pub total_messages: u64,
    pub bytes_transferred: u64,
    pub average_response_time: f64,
    pub error_rate: f64,
}

/// WebSocket连接池
pub struct WebSocketConnectionPool {
    config: WebSocketPoolConfig,
    connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
    connections_by_ip: Arc<RwLock<HashMap<String, Vec<String>>>>,
    connection_semaphore: Arc<Semaphore>,
    stats: Arc<RwLock<WebSocketPoolStats>>,
    message_sender: mpsc::UnboundedSender<PoolMessage>,
    message_receiver: Arc<RwLock<Option<mpsc::UnboundedReceiver<PoolMessage>>>>,
}

/// 池消息类型
#[derive(Debug)]
enum PoolMessage {
    NewConnection {
        connection_id: String,
        websocket: WebSocketStream<TcpStream>,
        user_info: UserInfo,
        ip_address: String,
        user_agent: String,
    },
    CloseConnection {
        connection_id: String,
    },
    BroadcastMessage {
        message: Message,
        exclude_connections: Option<Vec<String>>,
    },
    SendToUser {
        user_id: String,
        message: Message,
    },
    SendToConnection {
        connection_id: String,
        message: Message,
    },
    UpdateStats,
}

/// 用户信息
#[derive(Debug, Clone)]
pub struct UserInfo {
    pub user_id: String,
    pub user_name: String,
    pub user_type: String,
    pub session_id: Option<String>,
}

impl WebSocketConnectionPool {
    pub fn new(config: WebSocketPoolConfig) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        
        Self {
            connection_semaphore: Arc::new(Semaphore::new(config.max_connections)),
            config,
            connections: Arc::new(RwLock::new(HashMap::new())),
            connections_by_ip: Arc::new(RwLock::new(HashMap::new())),
            stats: Arc::new(RwLock::new(WebSocketPoolStats::default())),
            message_sender: sender,
            message_receiver: Arc::new(RwLock::new(Some(receiver))),
        }
    }

    /// 启动连接池
    pub async fn start(&self) -> Result<()> {
        let mut receiver = self.message_receiver.write().await.take()
            .ok_or_else(|| anyhow::anyhow!("Connection pool already started"))?;

        let connections = self.connections.clone();
        let connections_by_ip = self.connections_by_ip.clone();
        let stats = self.stats.clone();
        let config = self.config.clone();

        // 启动消息处理循环
        tokio::spawn(async move {
            Self::message_handler(receiver, connections, connections_by_ip, stats, config).await;
        });

        // 启动清理任务
        self.start_cleanup_task().await;
        
        // 启动统计更新任务
        self.start_stats_update_task().await;

        info!("WebSocket connection pool started with max connections: {}", self.config.max_connections);
        Ok(())
    }

    /// 添加新连接
    pub async fn add_connection(
        &self,
        websocket: WebSocketStream<TcpStream>,
        user_info: UserInfo,
        ip_address: String,
        user_agent: String,
    ) -> Result<String> {
        // 检查连接限制
        if self.connection_semaphore.available_permits() == 0 {
            return Err(anyhow::anyhow!("Connection pool is full"));
        }

        // 检查IP连接限制
        let ip_connections = self.connections_by_ip.read().await.get(&ip_address).map(|v| v.len()).unwrap_or(0);
        if ip_connections >= self.config.max_connections_per_ip {
            return Err(anyhow::anyhow!("Too many connections from IP: {}", ip_address));
        }

        let connection_id = Uuid::new_v4().to_string();
        
        self.message_sender.send(PoolMessage::NewConnection {
            connection_id: connection_id.clone(),
            websocket,
            user_info,
            ip_address,
            user_agent,
        }).map_err(|e| anyhow::anyhow!("Failed to send new connection message: {}", e))?;

        Ok(connection_id)
    }

    /// 关闭连接
    pub async fn close_connection(&self, connection_id: &str) -> Result<()> {
        self.message_sender.send(PoolMessage::CloseConnection {
            connection_id: connection_id.to_string(),
        }).map_err(|e| anyhow::anyhow!("Failed to send close connection message: {}", e))?;

        Ok(())
    }

    /// 广播消息
    pub async fn broadcast_message(&self, message: Message, exclude_connections: Option<Vec<String>>) -> Result<()> {
        self.message_sender.send(PoolMessage::BroadcastMessage {
            message,
            exclude_connections,
        }).map_err(|e| anyhow::anyhow!("Failed to send broadcast message: {}", e))?;

        Ok(())
    }

    /// 发送消息给特定用户
    pub async fn send_to_user(&self, user_id: &str, message: Message) -> Result<()> {
        self.message_sender.send(PoolMessage::SendToUser {
            user_id: user_id.to_string(),
            message,
        }).map_err(|e| anyhow::anyhow!("Failed to send message to user: {}", e))?;

        Ok(())
    }

    /// 发送消息给特定连接
    pub async fn send_to_connection(&self, connection_id: &str, message: Message) -> Result<()> {
        self.message_sender.send(PoolMessage::SendToConnection {
            connection_id: connection_id.to_string(),
            message,
        }).map_err(|e| anyhow::anyhow!("Failed to send message to connection: {}", e))?;

        Ok(())
    }

    /// 获取连接统计
    pub async fn get_stats(&self) -> WebSocketPoolStats {
        self.stats.read().await.clone()
    }

    /// 获取连接信息
    pub async fn get_connection_info(&self, connection_id: &str) -> Option<WebSocketConnection> {
        self.connections.read().await.get(connection_id).cloned()
    }

    /// 获取用户的所有连接
    pub async fn get_user_connections(&self, user_id: &str) -> Vec<WebSocketConnection> {
        self.connections.read().await
            .values()
            .filter(|conn| conn.user_id == user_id)
            .cloned()
            .collect()
    }

    /// 消息处理器
    async fn message_handler(
        mut receiver: mpsc::UnboundedReceiver<PoolMessage>,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
        connections_by_ip: Arc<RwLock<HashMap<String, Vec<String>>>>,
        stats: Arc<RwLock<WebSocketPoolStats>>,
        config: WebSocketPoolConfig,
    ) {
        while let Some(message) = receiver.recv().await {
            match message {
                PoolMessage::NewConnection { connection_id, websocket, user_info, ip_address, user_agent } => {
                    Self::handle_new_connection(
                        connection_id,
                        websocket,
                        user_info,
                        ip_address,
                        user_agent,
                        connections.clone(),
                        connections_by_ip.clone(),
                        config.clone(),
                    ).await;
                }
                PoolMessage::CloseConnection { connection_id } => {
                    Self::handle_close_connection(
                        &connection_id,
                        connections.clone(),
                        connections_by_ip.clone(),
                    ).await;
                }
                PoolMessage::BroadcastMessage { message, exclude_connections } => {
                    Self::handle_broadcast_message(
                        message,
                        exclude_connections,
                        connections.clone(),
                    ).await;
                }
                PoolMessage::SendToUser { user_id, message } => {
                    Self::handle_send_to_user(
                        &user_id,
                        message,
                        connections.clone(),
                    ).await;
                }
                PoolMessage::SendToConnection { connection_id, message } => {
                    Self::handle_send_to_connection(
                        &connection_id,
                        message,
                        connections.clone(),
                    ).await;
                }
                PoolMessage::UpdateStats => {
                    Self::update_stats(connections.clone(), stats.clone()).await;
                }
            }
        }
    }

    /// 处理新连接
    async fn handle_new_connection(
        connection_id: String,
        websocket: WebSocketStream<TcpStream>,
        user_info: UserInfo,
        ip_address: String,
        user_agent: String,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
        connections_by_ip: Arc<RwLock<HashMap<String, Vec<String>>>>,
        config: WebSocketPoolConfig,
    ) {
        let (mut ws_sender, mut ws_receiver) = websocket.split();
        let (msg_sender, mut msg_receiver) = mpsc::unbounded_channel();

        let connection = WebSocketConnection {
            id: connection_id.clone(),
            user_id: user_info.user_id.clone(),
            user_type: user_info.user_type.clone(),
            ip_address: ip_address.clone(),
            user_agent,
            connected_at: Instant::now(),
            last_activity: Instant::now(),
            message_count: 0,
            bytes_sent: 0,
            bytes_received: 0,
            rate_limit_bucket: config.rate_limit_per_second,
            rate_limit_last_refill: Instant::now(),
            sender: msg_sender,
        };

        // 添加到连接池
        {
            let mut conn_guard = connections.write().await;
            conn_guard.insert(connection_id.clone(), connection);
        }

        // 更新IP连接计数
        {
            let mut ip_guard = connections_by_ip.write().await;
            ip_guard.entry(ip_address.clone()).or_insert_with(Vec::new).push(connection_id.clone());
        }

        let connection_id_clone = connection_id.clone();
        let connections_clone = connections.clone();
        let connections_by_ip_clone = connections_by_ip.clone();

        // 启动发送任务
        tokio::spawn(async move {
            while let Some(message) = msg_receiver.recv().await {
                if let Err(e) = ws_sender.send(message).await {
                    error!("Failed to send message to connection {}: {}", connection_id, e);
                    break;
                }
            }
        });

        // 启动接收任务
        tokio::spawn(async move {
            while let Some(message) = ws_receiver.next().await {
                match message {
                    Ok(msg) => {
                        if msg.is_close() {
                            break;
                        }
                        
                        // 更新连接活动时间
                        if let Some(conn) = connections_clone.write().await.get_mut(&connection_id_clone) {
                            conn.last_activity = Instant::now();
                            conn.message_count += 1;
                            conn.bytes_received += msg.len() as u64;
                        }
                        
                        // 处理接收到的消息
                        Self::handle_received_message(connection_id_clone.clone(), msg, connections_clone.clone()).await;
                    }
                    Err(e) => {
                        error!("WebSocket error for connection {}: {}", connection_id_clone, e);
                        break;
                    }
                }
            }
            
            // 清理连接
            Self::handle_close_connection(&connection_id_clone, connections_clone, connections_by_ip_clone).await;
        });

        info!("New WebSocket connection established: {} for user: {}", connection_id, user_info.user_id);
    }

    /// 处理关闭连接
    async fn handle_close_connection(
        connection_id: &str,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
        connections_by_ip: Arc<RwLock<HashMap<String, Vec<String>>>>,
    ) {
        let ip_address = {
            let mut conn_guard = connections.write().await;
            if let Some(connection) = conn_guard.remove(connection_id) {
                info!("WebSocket connection closed: {} for user: {}", connection_id, connection.user_id);
                connection.ip_address
            } else {
                return;
            }
        };

        // 更新IP连接计数
        {
            let mut ip_guard = connections_by_ip.write().await;
            if let Some(connections) = ip_guard.get_mut(&ip_address) {
                connections.retain(|id| id != connection_id);
                if connections.is_empty() {
                    ip_guard.remove(&ip_address);
                }
            }
        }
    }

    /// 处理广播消息
    async fn handle_broadcast_message(
        message: Message,
        exclude_connections: Option<Vec<String>>,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
    ) {
        let exclude_set: std::collections::HashSet<String> = exclude_connections
            .unwrap_or_default()
            .into_iter()
            .collect();

        let connections_guard = connections.read().await;
        let mut sent_count = 0;
        
        for (connection_id, connection) in connections_guard.iter() {
            if !exclude_set.contains(connection_id) {
                if let Err(e) = connection.sender.send(message.clone()) {
                    error!("Failed to send broadcast message to connection {}: {}", connection_id, e);
                } else {
                    sent_count += 1;
                }
            }
        }
        
        debug!("Broadcast message sent to {} connections", sent_count);
    }

    /// 处理发送消息给用户
    async fn handle_send_to_user(
        user_id: &str,
        message: Message,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
    ) {
        let connections_guard = connections.read().await;
        let mut sent_count = 0;
        
        for connection in connections_guard.values() {
            if connection.user_id == user_id {
                if let Err(e) = connection.sender.send(message.clone()) {
                    error!("Failed to send message to user {} connection {}: {}", user_id, connection.id, e);
                } else {
                    sent_count += 1;
                }
            }
        }
        
        debug!("Message sent to {} connections for user {}", sent_count, user_id);
    }

    /// 处理发送消息给特定连接
    async fn handle_send_to_connection(
        connection_id: &str,
        message: Message,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
    ) {
        let connections_guard = connections.read().await;
        if let Some(connection) = connections_guard.get(connection_id) {
            if let Err(e) = connection.sender.send(message) {
                error!("Failed to send message to connection {}: {}", connection_id, e);
            }
        }
    }

    /// 处理接收到的消息
    async fn handle_received_message(
        connection_id: String,
        message: Message,
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
    ) {
        // 这里可以添加消息路由逻辑
        debug!("Received message from connection {}: {:?}", connection_id, message);
        
        // 可以在这里添加：
        // 1. 消息验证
        // 2. 消息路由
        // 3. 消息存储
        // 4. 消息转发
    }

    /// 启动清理任务
    async fn start_cleanup_task(&self) {
        let connections = self.connections.clone();
        let connections_by_ip = self.connections_by_ip.clone();
        let max_idle_time = self.config.max_idle_time;

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                Self::cleanup_idle_connections(connections.clone(), connections_by_ip.clone(), max_idle_time).await;
            }
        });
    }

    /// 清理空闲连接
    async fn cleanup_idle_connections(
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
        connections_by_ip: Arc<RwLock<HashMap<String, Vec<String>>>>,
        max_idle_time: Duration,
    ) {
        let now = Instant::now();
        let mut to_remove = Vec::new();
        
        {
            let connections_guard = connections.read().await;
            for (connection_id, connection) in connections_guard.iter() {
                if now.duration_since(connection.last_activity) > max_idle_time {
                    to_remove.push(connection_id.clone());
                }
            }
        }
        
        for connection_id in to_remove {
            Self::handle_close_connection(&connection_id, connections.clone(), connections_by_ip.clone()).await;
            info!("Cleaned up idle connection: {}", connection_id);
        }
    }

    /// 启动统计更新任务
    async fn start_stats_update_task(&self) {
        let message_sender = self.message_sender.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                if let Err(e) = message_sender.send(PoolMessage::UpdateStats) {
                    error!("Failed to send stats update message: {}", e);
                    break;
                }
            }
        });
    }

    /// 更新统计信息
    async fn update_stats(
        connections: Arc<RwLock<HashMap<String, WebSocketConnection>>>,
        stats: Arc<RwLock<WebSocketPoolStats>>,
    ) {
        let connections_guard = connections.read().await;
        let mut stats_guard = stats.write().await;
        
        stats_guard.total_connections = connections_guard.len();
        stats_guard.active_connections = connections_guard.len(); // 简化实现
        stats_guard.idle_connections = 0; // 简化实现
        
        // 按类型统计
        let mut connections_by_type = HashMap::new();
        for connection in connections_guard.values() {
            *connections_by_type.entry(connection.user_type.clone()).or_insert(0) += 1;
        }
        stats_guard.connections_by_type = connections_by_type;
        
        // 按IP统计
        let mut connections_by_ip = HashMap::new();
        for connection in connections_guard.values() {
            *connections_by_ip.entry(connection.ip_address.clone()).or_insert(0) += 1;
        }
        stats_guard.connections_by_ip = connections_by_ip;
        
        // 消息统计
        let total_messages: u64 = connections_guard.values().map(|c| c.message_count).sum();
        let bytes_transferred: u64 = connections_guard.values().map(|c| c.bytes_sent + c.bytes_received).sum();
        
        stats_guard.total_messages = total_messages;
        stats_guard.bytes_transferred = bytes_transferred;
    }
}

impl Default for WebSocketPoolStats {
    fn default() -> Self {
        Self {
            total_connections: 0,
            active_connections: 0,
            idle_connections: 0,
            connections_by_type: HashMap::new(),
            connections_by_ip: HashMap::new(),
            total_messages: 0,
            bytes_transferred: 0,
            average_response_time: 0.0,
            error_rate: 0.0,
        }
    }
}