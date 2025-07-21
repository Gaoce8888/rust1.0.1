use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

/// HTTP回退通信管理器
pub struct HttpFallbackManager {
    sessions: Arc<RwLock<HashMap<String, FallbackSession>>>,
    upgrade_detector: Arc<UpgradeDetector>,
    config: FallbackConfig,
}

/// 回退配置
#[derive(Debug, Clone)]
pub struct FallbackConfig {
    pub polling_interval: Duration,
    pub max_polling_timeout: Duration,
    pub session_timeout: Duration,
    pub max_pending_messages: usize,
    pub upgrade_detection_enabled: bool,
    pub auto_upgrade_delay: Duration,
    pub max_upgrade_attempts: u32,
}

impl Default for FallbackConfig {
    fn default() -> Self {
        Self {
            polling_interval: Duration::from_secs(1),
            max_polling_timeout: Duration::from_secs(30),
            session_timeout: Duration::from_secs(300),
            max_pending_messages: 100,
            upgrade_detection_enabled: true,
            auto_upgrade_delay: Duration::from_secs(5),
            max_upgrade_attempts: 3,
        }
    }
}

/// 回退会话
#[derive(Debug, Clone)]
pub struct FallbackSession {
    pub session_id: String,
    pub user_id: String,
    pub user_type: String,
    pub connection_type: FallbackConnectionType,
    pub created_at: Instant,
    pub last_activity: Instant,
    pub pending_messages: Vec<FallbackMessage>,
    pub message_sender: mpsc::UnboundedSender<FallbackMessage>,
    pub polling_active: bool,
    pub upgrade_attempts: u32,
    pub client_capabilities: ClientCapabilities,
}

/// 回退连接类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FallbackConnectionType {
    LongPolling,
    ShortPolling,
    ServerSentEvents,
    WebSocketUpgrade,
}

/// 客户端能力
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCapabilities {
    pub supports_websocket: bool,
    pub supports_sse: bool,
    pub supports_long_polling: bool,
    pub max_message_size: usize,
    pub compression_supported: bool,
}

impl Default for ClientCapabilities {
    fn default() -> Self {
        Self {
            supports_websocket: true,
            supports_sse: true,
            supports_long_polling: true,
            max_message_size: 64 * 1024,
            compression_supported: false,
        }
    }
}

/// 回退消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackMessage {
    pub message_id: String,
    pub sender_id: String,
    pub recipient_id: String,
    pub message_type: String,
    pub content: String,
    pub timestamp: u64,
    pub metadata: Option<HashMap<String, String>>,
    pub priority: MessagePriority,
}

/// 消息优先级
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Critical,
}

/// 升级检测器
pub struct UpgradeDetector {
    upgrade_checks: Arc<RwLock<HashMap<String, UpgradeCheck>>>,
}

/// 升级检查信息
#[derive(Debug, Clone)]
pub struct UpgradeCheck {
    pub session_id: String,
    pub last_check: Instant,
    pub check_count: u32,
    pub websocket_available: bool,
    pub sse_available: bool,
    pub client_supports_upgrade: bool,
}

impl HttpFallbackManager {
    pub fn new(config: FallbackConfig) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            upgrade_detector: Arc::new(UpgradeDetector::new()),
            config,
        }
    }

    /// 创建回退会话
    pub async fn create_session(
        &self,
        user_id: String,
        user_type: String,
        client_capabilities: ClientCapabilities,
    ) -> Result<String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let (message_sender, message_receiver) = mpsc::unbounded_channel();

        // 确定最佳连接类型
        let connection_type = self.determine_connection_type(&client_capabilities);

        let session = FallbackSession {
            session_id: session_id.clone(),
            user_id: user_id.clone(),
            user_type,
            connection_type,
            created_at: Instant::now(),
            last_activity: Instant::now(),
            pending_messages: Vec::new(),
            message_sender,
            polling_active: false,
            upgrade_attempts: 0,
            client_capabilities,
        };

        // 存储会话
        self.sessions.write().await.insert(session_id.clone(), session);

        // 启动会话管理任务
        self.start_session_management(session_id.clone(), message_receiver).await;

        info!("Created fallback session: {} for user: {} with type: {:?}", 
              session_id, user_id, connection_type);

        Ok(session_id)
    }

    /// 确定最佳连接类型
    fn determine_connection_type(&self, capabilities: &ClientCapabilities) -> FallbackConnectionType {
        if capabilities.supports_websocket {
            FallbackConnectionType::WebSocketUpgrade
        } else if capabilities.supports_sse {
            FallbackConnectionType::ServerSentEvents
        } else if capabilities.supports_long_polling {
            FallbackConnectionType::LongPolling
        } else {
            FallbackConnectionType::ShortPolling
        }
    }

    /// 启动会话管理任务
    async fn start_session_management(
        &self,
        session_id: String,
        mut message_receiver: mpsc::UnboundedReceiver<FallbackMessage>,
    ) {
        let sessions = self.sessions.clone();
        let upgrade_detector = self.upgrade_detector.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut upgrade_check_interval = tokio::time::interval(config.auto_upgrade_delay);
            let mut cleanup_interval = tokio::time::interval(Duration::from_secs(60));

            loop {
                tokio::select! {
                    // 处理新消息
                    message = message_receiver.recv() => {
                        if let Some(msg) = message {
                            Self::handle_session_message(
                                &session_id,
                                msg,
                                sessions.clone(),
                            ).await;
                        } else {
                            break;
                        }
                    }
                    
                    // 检查升级可能性
                    _ = upgrade_check_interval.tick() => {
                        if config.upgrade_detection_enabled {
                            Self::check_upgrade_possibility(
                                &session_id,
                                sessions.clone(),
                                upgrade_detector.clone(),
                            ).await;
                        }
                    }
                    
                    // 清理过期会话
                    _ = cleanup_interval.tick() => {
                        Self::cleanup_expired_sessions(
                            sessions.clone(),
                            config.session_timeout,
                        ).await;
                    }
                }
            }
        });
    }

    /// 处理会话消息
    async fn handle_session_message(
        session_id: &str,
        message: FallbackMessage,
        sessions: Arc<RwLock<HashMap<String, FallbackSession>>>,
    ) {
        let mut sessions_guard = sessions.write().await;
        if let Some(session) = sessions_guard.get_mut(session_id) {
            session.last_activity = Instant::now();
            
            // 按优先级插入消息
            let insert_pos = session.pending_messages
                .binary_search_by(|probe| probe.priority.cmp(&message.priority))
                .unwrap_or_else(|pos| pos);
            
            session.pending_messages.insert(insert_pos, message);
            
            // 限制消息数量
            if session.pending_messages.len() > 100 {
                session.pending_messages.truncate(100);
            }
        }
    }

    /// 检查升级可能性
    async fn check_upgrade_possibility(
        session_id: &str,
        sessions: Arc<RwLock<HashMap<String, FallbackSession>>>,
        upgrade_detector: Arc<UpgradeDetector>,
    ) {
        let session_info = {
            let sessions_guard = sessions.read().await;
            sessions_guard.get(session_id).cloned()
        };

        if let Some(session) = session_info {
            if session.client_capabilities.supports_websocket 
                && session.upgrade_attempts < 3 
                && matches!(session.connection_type, FallbackConnectionType::LongPolling | FallbackConnectionType::ShortPolling) {
                
                // 检查WebSocket是否可用
                if upgrade_detector.check_websocket_availability().await {
                    info!("WebSocket upgrade available for session: {}", session_id);
                    
                    // 触发升级
                    Self::trigger_upgrade(session_id, sessions, FallbackConnectionType::WebSocketUpgrade).await;
                }
            }
        }
    }

    /// 触发升级
    async fn trigger_upgrade(
        session_id: &str,
        sessions: Arc<RwLock<HashMap<String, FallbackSession>>>,
        new_type: FallbackConnectionType,
    ) {
        let mut sessions_guard = sessions.write().await;
        if let Some(session) = sessions_guard.get_mut(session_id) {
            session.connection_type = new_type.clone();
            session.upgrade_attempts += 1;
            
            info!("Upgraded session {} to {:?}", session_id, new_type);
        }
    }

    /// 清理过期会话
    async fn cleanup_expired_sessions(
        sessions: Arc<RwLock<HashMap<String, FallbackSession>>>,
        timeout: Duration,
    ) {
        let now = Instant::now();
        let mut to_remove = Vec::new();
        
        {
            let sessions_guard = sessions.read().await;
            for (session_id, session) in sessions_guard.iter() {
                if now.duration_since(session.last_activity) > timeout {
                    to_remove.push(session_id.clone());
                }
            }
        }
        
        if !to_remove.is_empty() {
            let mut sessions_guard = sessions.write().await;
            for session_id in to_remove {
                sessions_guard.remove(&session_id);
                debug!("Cleaned up expired session: {}", session_id);
            }
        }
    }

    /// 发送消息到会话
    pub async fn send_message(&self, session_id: &str, message: FallbackMessage) -> Result<()> {
        let sessions = self.sessions.read().await;
        if let Some(session) = sessions.get(session_id) {
            session.message_sender.send(message)
                .map_err(|e| anyhow::anyhow!("Failed to send message: {}", e))?;
        }
        Ok(())
    }

    /// 获取待处理消息
    pub async fn get_pending_messages(&self, session_id: &str) -> Vec<FallbackMessage> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.last_activity = Instant::now();
            let messages = session.pending_messages.clone();
            session.pending_messages.clear();
            messages
        } else {
            Vec::new()
        }
    }

    /// 开始长轮询
    pub async fn start_long_polling(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.polling_active = true;
            session.last_activity = Instant::now();
            Ok(())
        } else {
            Err(anyhow::anyhow!("Session not found"))
        }
    }

    /// 停止长轮询
    pub async fn stop_long_polling(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.polling_active = false;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Session not found"))
        }
    }

    /// 获取会话信息
    pub async fn get_session_info(&self, session_id: &str) -> Option<FallbackSession> {
        self.sessions.read().await.get(session_id).cloned()
    }

    /// 获取统计信息
    pub async fn get_stats(&self) -> FallbackStats {
        let sessions = self.sessions.read().await;
        
        let mut stats = FallbackStats {
            total_sessions: sessions.len(),
            active_sessions: 0,
            connection_types: HashMap::new(),
            total_messages: 0,
            upgrade_attempts: 0,
        };

        for session in sessions.values() {
            if session.polling_active {
                stats.active_sessions += 1;
            }
            
            let conn_type = format!("{:?}", session.connection_type);
            *stats.connection_types.entry(conn_type).or_insert(0) += 1;
            
            stats.total_messages += session.pending_messages.len();
            stats.upgrade_attempts += session.upgrade_attempts as usize;
        }

        stats
    }
}

impl UpgradeDetector {
    pub fn new() -> Self {
        Self {
            upgrade_checks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 检查WebSocket可用性
    pub async fn check_websocket_availability(&self) -> bool {
        // 实际的WebSocket可用性检查
        // 尝试建立WebSocket连接到本地端口
        tokio::time::timeout(Duration::from_secs(1), async {
            match tokio::net::TcpStream::connect("127.0.0.1:8080").await {
                Ok(_) => {
                    // 成功连接到WebSocket端口
                    true
                }
                Err(_) => {
                    // 连接失败，WebSocket可能不可用
                    false
                }
            }
        }).await.unwrap_or(false)
    }

    /// 检查服务器发送事件可用性
    pub async fn check_sse_availability(&self) -> bool {
        // 检查SSE支持
        true
    }

    /// 添加升级检查
    pub async fn add_upgrade_check(&self, session_id: String, check: UpgradeCheck) {
        self.upgrade_checks.write().await.insert(session_id, check);
    }

    /// 获取升级检查信息
    pub async fn get_upgrade_check(&self, session_id: &str) -> Option<UpgradeCheck> {
        self.upgrade_checks.read().await.get(session_id).cloned()
    }
}

/// 回退统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FallbackStats {
    pub total_sessions: usize,
    pub active_sessions: usize,
    pub connection_types: HashMap<String, usize>,
    pub total_messages: usize,
    pub upgrade_attempts: usize,
}

/// 升级通知
#[derive(Debug, Serialize, Deserialize)]
pub struct UpgradeNotification {
    pub session_id: String,
    pub upgrade_type: FallbackConnectionType,
    pub websocket_url: String,
    pub upgrade_token: String,
    pub expires_at: u64,
}

impl HttpFallbackManager {
    /// 生成升级通知
    pub async fn generate_upgrade_notification(
        &self,
        session_id: &str,
    ) -> Result<UpgradeNotification> {
        let sessions = self.sessions.read().await;
        if let Some(session) = sessions.get(session_id) {
            let upgrade_token = uuid::Uuid::new_v4().to_string();
            
            Ok(UpgradeNotification {
                session_id: session_id.to_string(),
                upgrade_type: FallbackConnectionType::WebSocketUpgrade,
                websocket_url: format!("ws://localhost:6006/ws?upgrade_token={}", upgrade_token),
                upgrade_token,
                expires_at: (chrono::Utc::now() + chrono::Duration::minutes(5)).timestamp_millis() as u64,
            })
        } else {
            Err(anyhow::anyhow!("Session not found"))
        }
    }

    /// 处理升级请求
    pub async fn handle_upgrade_request(
        &self,
        session_id: &str,
        upgrade_token: &str,
    ) -> Result<bool> {
        // 验证升级令牌
        if self.validate_upgrade_token(session_id, upgrade_token).await? {
            // 标记会话为已升级
            let mut sessions = self.sessions.write().await;
            if let Some(session) = sessions.get_mut(session_id) {
                session.connection_type = FallbackConnectionType::WebSocketUpgrade;
                info!("Successfully upgraded session {} to WebSocket", session_id);
                return Ok(true);
            }
        }
        
        Ok(false)
    }

    /// 验证升级令牌
    async fn validate_upgrade_token(&self, session_id: &str, token: &str) -> Result<bool> {
        // 这里应该实现实际的令牌验证逻辑
        // 例如：检查令牌是否存在、是否过期等
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_session() {
        let manager = HttpFallbackManager::new(FallbackConfig::default());
        let capabilities = ClientCapabilities::default();
        
        let session_id = manager.create_session(
            "user123".to_string(),
            "customer".to_string(),
            capabilities,
        ).await.unwrap();
        
        assert!(!session_id.is_empty());
        
        let session = manager.get_session_info(&session_id).await;
        assert!(session.is_some());
        assert_eq!(session.unwrap().user_id, "user123");
    }

    #[tokio::test]
    async fn test_message_sending() {
        let manager = HttpFallbackManager::new(FallbackConfig::default());
        let capabilities = ClientCapabilities::default();
        
        let session_id = manager.create_session(
            "user123".to_string(),
            "customer".to_string(),
            capabilities,
        ).await.unwrap();
        
        let message = FallbackMessage {
            message_id: "msg123".to_string(),
            sender_id: "sender123".to_string(),
            recipient_id: "user123".to_string(),
            message_type: "text".to_string(),
            content: "Hello".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            metadata: None,
            priority: MessagePriority::Normal,
        };
        
        manager.send_message(&session_id, message).await.unwrap();
        
        // 给消息处理一点时间
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        let messages = manager.get_pending_messages(&session_id).await;
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].content, "Hello");
    }
}