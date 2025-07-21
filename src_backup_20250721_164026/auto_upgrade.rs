use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

use crate::http_fallback::{FallbackConnectionType, HttpFallbackManager};
use crate::websocket_pool::WebSocketConnectionPool;

/// 自动升级管理器
pub struct AutoUpgradeManager {
    upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
    fallback_manager: Arc<HttpFallbackManager>,
    websocket_pool: Arc<WebSocketConnectionPool>,
    config: UpgradeConfig,
}

/// 升级配置
#[derive(Debug, Clone)]
pub struct UpgradeConfig {
    pub detection_interval: Duration,
    pub upgrade_timeout: Duration,
    pub max_upgrade_attempts: u32,
    pub fallback_on_failure: bool,
    pub prefer_websocket: bool,
    pub enable_progressive_upgrade: bool,
    pub client_capability_check: bool,
}

impl Default for UpgradeConfig {
    fn default() -> Self {
        Self {
            detection_interval: Duration::from_secs(10),
            upgrade_timeout: Duration::from_secs(30),
            max_upgrade_attempts: 3,
            fallback_on_failure: true,
            prefer_websocket: true,
            enable_progressive_upgrade: true,
            client_capability_check: true,
        }
    }
}

/// 升级会话
#[derive(Debug, Clone)]
pub struct UpgradeSession {
    pub session_id: String,
    pub user_id: String,
    pub current_connection_type: FallbackConnectionType,
    pub target_connection_type: FallbackConnectionType,
    pub upgrade_status: UpgradeStatus,
    pub attempts: u32,
    pub last_attempt: Instant,
    pub client_capabilities: ClientCapabilities,
    pub performance_metrics: PerformanceMetrics,
    pub upgrade_triggers: Vec<UpgradeTrigger>,
}

/// 升级状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UpgradeStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

/// 客户端能力
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCapabilities {
    pub supports_websocket: bool,
    pub supports_sse: bool,
    pub supports_long_polling: bool,
    pub user_agent: String,
    pub browser_version: String,
    pub platform: String,
    pub network_type: NetworkType,
    pub connection_quality: ConnectionQuality,
}

/// 网络类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NetworkType {
    Wifi,
    Cellular,
    Ethernet,
    Unknown,
}

/// 连接质量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionQuality {
    Excellent,
    Good,
    Fair,
    Poor,
    Unknown,
}

/// 性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub average_latency: f64,
    pub message_throughput: f64,
    pub connection_stability: f64,
    pub error_rate: f64,
    pub bandwidth_utilization: f64,
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            average_latency: 0.0,
            message_throughput: 0.0,
            connection_stability: 100.0,
            error_rate: 0.0,
            bandwidth_utilization: 0.0,
        }
    }
}

/// 升级触发器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeTrigger {
    PerformanceThreshold {
        metric: String,
        threshold: f64,
        current_value: f64,
    },
    ConnectionQuality {
        quality: ConnectionQuality,
    },
    ClientCapability {
        capability: String,
        supported: bool,
    },
    Manual {
        reason: String,
    },
    Scheduled {
        next_check: u64,
    },
}

impl AutoUpgradeManager {
    pub fn new(
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        config: UpgradeConfig,
    ) -> Self {
        Self {
            upgrade_sessions: Arc::new(RwLock::new(HashMap::new())),
            fallback_manager,
            websocket_pool,
            config,
        }
    }

    /// 启动自动升级管理器
    pub async fn start(&self) -> Result<()> {
        let upgrade_sessions = self.upgrade_sessions.clone();
        let fallback_manager = self.fallback_manager.clone();
        let websocket_pool = self.websocket_pool.clone();
        let config = self.config.clone();

        // 启动检测循环
        tokio::spawn(async move {
            Self::detection_loop(
                upgrade_sessions,
                fallback_manager,
                websocket_pool,
                config,
            ).await;
        });

        info!("Auto upgrade manager started");
        Ok(())
    }

    /// 检测循环
    async fn detection_loop(
        upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        config: UpgradeConfig,
    ) {
        let mut interval = tokio::time::interval(config.detection_interval);

        loop {
            interval.tick().await;

            // 检查现有会话的升级机会
            Self::check_upgrade_opportunities(
                upgrade_sessions.clone(),
                fallback_manager.clone(),
                websocket_pool.clone(),
                &config,
            ).await;

            // 处理进行中的升级
            Self::process_pending_upgrades(
                upgrade_sessions.clone(),
                fallback_manager.clone(),
                websocket_pool.clone(),
                &config,
            ).await;

            // 清理完成的升级会话
            Self::cleanup_completed_upgrades(upgrade_sessions.clone()).await;
        }
    }

    /// 检查升级机会
    async fn check_upgrade_opportunities(
        upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        config: &UpgradeConfig,
    ) {
        let fallback_stats = fallback_manager.get_stats().await;
        
        // 检查每个活跃的回退会话
        for (session_id, _) in fallback_stats.connection_types.iter() {
            if let Some(session_info) = fallback_manager.get_session_info(session_id).await {
                // 检查是否已经在升级队列中
                if upgrade_sessions.read().await.contains_key(session_id) {
                    continue;
                }

                // 评估升级机会
                if let Some(upgrade_session) = Self::evaluate_upgrade_opportunity(
                    session_info,
                    config,
                ).await {
                    upgrade_sessions.write().await.insert(
                        session_id.clone(),
                        upgrade_session,
                    );
                    
                    info!("Added session {} to upgrade queue", session_id);
                }
            }
        }
    }

    /// 评估升级机会
    async fn evaluate_upgrade_opportunity(
        session_info: crate::http_fallback::FallbackSession,
        config: &UpgradeConfig,
    ) -> Option<UpgradeSession> {
        let mut triggers = Vec::new();

        // 检查客户端能力
        if config.client_capability_check {
            if session_info.client_capabilities.supports_websocket {
                triggers.push(UpgradeTrigger::ClientCapability {
                    capability: "websocket".to_string(),
                    supported: true,
                });
            }
        }

        // 检查连接类型
        let target_type = match session_info.connection_type {
            FallbackConnectionType::ShortPolling => {
                if session_info.client_capabilities.supports_long_polling {
                    FallbackConnectionType::LongPolling
                } else if session_info.client_capabilities.supports_sse {
                    FallbackConnectionType::ServerSentEvents
                } else if session_info.client_capabilities.supports_websocket {
                    FallbackConnectionType::WebSocketUpgrade
                } else {
                    return None;
                }
            }
            FallbackConnectionType::LongPolling => {
                if session_info.client_capabilities.supports_sse {
                    FallbackConnectionType::ServerSentEvents
                } else if session_info.client_capabilities.supports_websocket {
                    FallbackConnectionType::WebSocketUpgrade
                } else {
                    return None;
                }
            }
            FallbackConnectionType::ServerSentEvents => {
                if session_info.client_capabilities.supports_websocket {
                    FallbackConnectionType::WebSocketUpgrade
                } else {
                    return None;
                }
            }
            FallbackConnectionType::WebSocketUpgrade => {
                return None; // 已经是最高级别
            }
        };

        // 创建升级会话
        Some(UpgradeSession {
            session_id: session_info.session_id.clone(),
            user_id: session_info.user_id.clone(),
            current_connection_type: session_info.connection_type.clone(),
            target_connection_type: target_type,
            upgrade_status: UpgradeStatus::Pending,
            attempts: 0,
            last_attempt: Instant::now(),
            client_capabilities: Self::convert_client_capabilities(&session_info.client_capabilities),
            performance_metrics: PerformanceMetrics::default(),
            upgrade_triggers: triggers,
        })
    }

    /// 转换客户端能力
    fn convert_client_capabilities(
        fallback_caps: &crate::http_fallback::ClientCapabilities,
    ) -> ClientCapabilities {
        ClientCapabilities {
            supports_websocket: fallback_caps.supports_websocket,
            supports_sse: fallback_caps.supports_sse,
            supports_long_polling: fallback_caps.supports_long_polling,
            user_agent: "Unknown".to_string(),
            browser_version: "Unknown".to_string(),
            platform: "Unknown".to_string(),
            network_type: NetworkType::Unknown,
            connection_quality: ConnectionQuality::Unknown,
        }
    }

    /// 处理待升级的会话
    async fn process_pending_upgrades(
        upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        config: &UpgradeConfig,
    ) {
        let pending_sessions: Vec<String> = {
            let sessions = upgrade_sessions.read().await;
            sessions.iter()
                .filter(|(_, session)| session.upgrade_status == UpgradeStatus::Pending)
                .map(|(id, _)| id.clone())
                .collect()
        };

        for session_id in pending_sessions {
            Self::attempt_upgrade(
                &session_id,
                upgrade_sessions.clone(),
                fallback_manager.clone(),
                websocket_pool.clone(),
                config,
            ).await;
        }
    }

    /// 尝试升级
    async fn attempt_upgrade(
        session_id: &str,
        upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        config: &UpgradeConfig,
    ) {
        let mut sessions = upgrade_sessions.write().await;
        if let Some(upgrade_session) = sessions.get_mut(session_id) {
            // 检查是否超过最大尝试次数
            if upgrade_session.attempts >= config.max_upgrade_attempts {
                upgrade_session.upgrade_status = UpgradeStatus::Failed;
                warn!("Upgrade failed for session {} after {} attempts", 
                      session_id, upgrade_session.attempts);
                return;
            }

            // 检查是否在超时时间内
            if upgrade_session.last_attempt.elapsed() < config.upgrade_timeout {
                return;
            }

            upgrade_session.upgrade_status = UpgradeStatus::InProgress;
            upgrade_session.attempts += 1;
            upgrade_session.last_attempt = Instant::now();

            let target_type = upgrade_session.target_connection_type.clone();
            let session_id = session_id.to_string();

            // 释放锁以避免死锁
            drop(sessions);

            // 执行升级
            let upgrade_result = Self::execute_upgrade(
                &session_id,
                target_type,
                fallback_manager.clone(),
                websocket_pool.clone(),
            ).await;

            // 更新升级状态
            let mut sessions = upgrade_sessions.write().await;
            if let Some(upgrade_session) = sessions.get_mut(&session_id) {
                upgrade_session.upgrade_status = if upgrade_result.is_ok() {
                    UpgradeStatus::Completed
                } else {
                    UpgradeStatus::Pending // 将在下次尝试
                };
            }
        }
    }

    /// 执行升级
    async fn execute_upgrade(
        session_id: &str,
        target_type: FallbackConnectionType,
        fallback_manager: Arc<HttpFallbackManager>,
        websocket_pool: Arc<WebSocketConnectionPool>,
    ) -> Result<()> {
        match target_type {
            FallbackConnectionType::WebSocketUpgrade => {
                // 生成升级通知
                let upgrade_notification = fallback_manager
                    .generate_upgrade_notification(session_id).await?;

                // 这里可以通过现有的HTTP连接发送升级通知
                Self::send_upgrade_notification(session_id, upgrade_notification).await?;
                
                info!("Sent WebSocket upgrade notification to session {}", session_id);
            }
            FallbackConnectionType::ServerSentEvents => {
                // 升级到SSE
                info!("Upgrading session {} to Server-Sent Events", session_id);
                // 实现SSE升级逻辑
            }
            FallbackConnectionType::LongPolling => {
                // 升级到长轮询
                info!("Upgrading session {} to Long Polling", session_id);
                // 实现长轮询升级逻辑
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported upgrade target: {:?}", target_type));
            }
        }

        Ok(())
    }

    /// 发送升级通知
    async fn send_upgrade_notification(
        session_id: &str,
        notification: crate::http_fallback::UpgradeNotification,
    ) -> Result<()> {
        // 这里应该通过现有的HTTP连接发送升级通知
        // 例如：在下次长轮询响应中包含升级信息
        debug!("Sending upgrade notification to session {}: {:?}", session_id, notification);
        
        // 实现发送逻辑
        // 可以通过消息队列或直接的HTTP响应发送
        
        Ok(())
    }

    /// 清理完成的升级会话
    async fn cleanup_completed_upgrades(
        upgrade_sessions: Arc<RwLock<HashMap<String, UpgradeSession>>>,
    ) {
        let mut sessions = upgrade_sessions.write().await;
        let mut to_remove = Vec::new();

        for (session_id, session) in sessions.iter() {
            if matches!(session.upgrade_status, UpgradeStatus::Completed | UpgradeStatus::Failed) {
                // 保留一段时间用于统计
                if session.last_attempt.elapsed() > Duration::from_secs(300) {
                    to_remove.push(session_id.clone());
                }
            }
        }

        for session_id in to_remove {
            sessions.remove(&session_id);
            debug!("Cleaned up upgrade session: {}", session_id);
        }
    }

    /// 手动触发升级
    pub async fn trigger_manual_upgrade(
        &self,
        session_id: &str,
        target_type: FallbackConnectionType,
        reason: String,
    ) -> Result<()> {
        let mut sessions = self.upgrade_sessions.write().await;
        
        if let Some(upgrade_session) = sessions.get_mut(session_id) {
            upgrade_session.target_connection_type = target_type;
            upgrade_session.upgrade_status = UpgradeStatus::Pending;
            upgrade_session.upgrade_triggers.push(UpgradeTrigger::Manual { reason });
            
            info!("Manual upgrade triggered for session {}", session_id);
        } else {
            return Err(anyhow::anyhow!("Session not found in upgrade queue"));
        }

        Ok(())
    }

    /// 取消升级
    pub async fn cancel_upgrade(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.upgrade_sessions.write().await;
        
        if let Some(upgrade_session) = sessions.get_mut(session_id) {
            upgrade_session.upgrade_status = UpgradeStatus::Cancelled;
            info!("Upgrade cancelled for session {}", session_id);
        }

        Ok(())
    }

    /// 获取升级统计
    pub async fn get_upgrade_stats(&self) -> UpgradeStats {
        let sessions = self.upgrade_sessions.read().await;
        
        let mut stats = UpgradeStats {
            total_upgrades: sessions.len(),
            pending_upgrades: 0,
            in_progress_upgrades: 0,
            completed_upgrades: 0,
            failed_upgrades: 0,
            cancelled_upgrades: 0,
            upgrade_types: HashMap::new(),
            success_rate: 0.0,
        };

        for session in sessions.values() {
            match session.upgrade_status {
                UpgradeStatus::Pending => stats.pending_upgrades += 1,
                UpgradeStatus::InProgress => stats.in_progress_upgrades += 1,
                UpgradeStatus::Completed => stats.completed_upgrades += 1,
                UpgradeStatus::Failed => stats.failed_upgrades += 1,
                UpgradeStatus::Cancelled => stats.cancelled_upgrades += 1,
            }

            let upgrade_type = format!("{:?}", session.target_connection_type);
            *stats.upgrade_types.entry(upgrade_type).or_insert(0) += 1;
        }

        if stats.total_upgrades > 0 {
            stats.success_rate = stats.completed_upgrades as f64 / stats.total_upgrades as f64 * 100.0;
        }

        stats
    }

    /// 获取升级会话信息
    pub async fn get_upgrade_session(&self, session_id: &str) -> Option<UpgradeSession> {
        self.upgrade_sessions.read().await.get(session_id).cloned()
    }
}

/// 升级统计
#[derive(Debug, Serialize, Deserialize)]
pub struct UpgradeStats {
    pub total_upgrades: usize,
    pub pending_upgrades: usize,
    pub in_progress_upgrades: usize,
    pub completed_upgrades: usize,
    pub failed_upgrades: usize,
    pub cancelled_upgrades: usize,
    pub upgrade_types: HashMap<String, usize>,
    pub success_rate: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http_fallback::FallbackConfig;

    #[tokio::test]
    async fn test_upgrade_manager_creation() {
        let fallback_manager = Arc::new(HttpFallbackManager::new(FallbackConfig::default()));
        let websocket_pool = Arc::new(WebSocketConnectionPool::new(Default::default()));
        let config = UpgradeConfig::default();

        let upgrade_manager = AutoUpgradeManager::new(
            fallback_manager,
            websocket_pool,
            config,
        );

        assert!(upgrade_manager.upgrade_sessions.read().await.is_empty());
    }

    #[tokio::test]
    async fn test_upgrade_stats() {
        let fallback_manager = Arc::new(HttpFallbackManager::new(FallbackConfig::default()));
        let websocket_pool = Arc::new(WebSocketConnectionPool::new(Default::default()));
        let config = UpgradeConfig::default();

        let upgrade_manager = AutoUpgradeManager::new(
            fallback_manager,
            websocket_pool,
            config,
        );

        let stats = upgrade_manager.get_upgrade_stats().await;
        assert_eq!(stats.total_upgrades, 0);
        assert_eq!(stats.success_rate, 0.0);
    }
}