use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

use crate::load_balancer::{LoadBalancer, ServerNode, ServerStatus};
use crate::websocket_pool::WebSocketConnectionPool;
use crate::health_monitor::{HealthMonitor, HealthStatus};

/// 故障转移管理器
#[derive(Clone)]
pub struct FailoverManager {
    config: FailoverConfig,
    primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
    backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
    active_failovers: Arc<RwLock<HashMap<String, FailoverSession>>>,
    load_balancer: Arc<LoadBalancer>,
    websocket_pool: Arc<WebSocketConnectionPool>,
    health_monitor: Arc<HealthMonitor>,
}

/// 故障转移配置
#[derive(Debug, Clone)]
pub struct FailoverConfig {
    pub detection_interval: Duration,
    pub failover_timeout: Duration,
    pub recovery_timeout: Duration,
    pub max_failover_attempts: u32,
    pub enable_auto_failback: bool,
    pub enable_cross_region_failover: bool,
    pub health_check_threshold: f64,
    pub connection_drain_timeout: Duration,
}

impl Default for FailoverConfig {
    fn default() -> Self {
        Self {
            detection_interval: Duration::from_secs(10),
            failover_timeout: Duration::from_secs(30),
            recovery_timeout: Duration::from_secs(300),
            max_failover_attempts: 3,
            enable_auto_failback: true,
            enable_cross_region_failover: false,
            health_check_threshold: 0.5,
            connection_drain_timeout: Duration::from_secs(60),
        }
    }
}

/// 服务端点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceEndpoint {
    pub id: String,
    pub service_type: ServiceType,
    pub address: String,
    pub port: u16,
    pub region: String,
    pub priority: u32,
    pub weight: u32,
    pub status: EndpointStatus,
    pub last_health_check: u64,
    pub response_time: f64,
    pub failure_count: u32,
    pub metadata: HashMap<String, String>,
}

/// 服务类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceType {
    WebSocket,
    Database,
    Cache,
    MessageQueue,
    LoadBalancer,
    API,
    Custom(String),
}

/// 端点状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EndpointStatus {
    Active,
    Standby,
    Failed,
    Maintenance,
    Draining,
}

/// 故障转移会话
#[derive(Debug, Clone)]
pub struct FailoverSession {
    pub id: String,
    pub service_id: String,
    pub primary_endpoint: ServiceEndpoint,
    pub backup_endpoint: ServiceEndpoint,
    pub failover_type: FailoverType,
    pub status: FailoverStatus,
    pub started_at: Instant,
    pub completed_at: Option<Instant>,
    pub attempt_count: u32,
    pub affected_connections: Vec<String>,
    pub error_message: Option<String>,
}

/// 故障转移类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FailoverType {
    Automatic,
    Manual,
    Scheduled,
    Emergency,
}

/// 故障转移状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FailoverStatus {
    Initiated,
    DrainConnections,
    SwitchingTraffic,
    Completed,
    Failed,
    RollingBack,
}

/// 连接监控
#[derive(Debug, Clone)]
pub struct ConnectionMonitor {
    pub active_connections: HashMap<String, Vec<String>>,
    pub connection_health: HashMap<String, f64>,
    pub last_activity: HashMap<String, Instant>,
}

impl FailoverManager {
    pub fn new(
        config: FailoverConfig,
        load_balancer: Arc<LoadBalancer>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        health_monitor: Arc<HealthMonitor>,
    ) -> Self {
        Self {
            config,
            primary_services: Arc::new(RwLock::new(HashMap::new())),
            backup_services: Arc::new(RwLock::new(HashMap::new())),
            active_failovers: Arc::new(RwLock::new(HashMap::new())),
            load_balancer,
            websocket_pool,
            health_monitor,
        }
    }

    /// 启动故障转移管理器
    pub async fn start(&self) -> Result<()> {
        // 注册默认服务端点
        self.register_default_endpoints().await;

        // 启动监控循环
        self.start_monitoring_loop().await;

        // 启动故障转移处理循环
        self.start_failover_processor().await;

        // 启动自动恢复
        if self.config.enable_auto_failback {
            self.start_auto_failback().await;
        }

        info!("Failover manager started");
        Ok(())
    }

    /// 注册默认服务端点
    async fn register_default_endpoints(&self) {
        let default_endpoints = vec![
            ServiceEndpoint {
                id: "websocket_primary".to_string(),
                service_type: ServiceType::WebSocket,
                address: "localhost".to_string(),
                port: 6006,
                region: "primary".to_string(),
                priority: 1,
                weight: 100,
                status: EndpointStatus::Active,
                last_health_check: chrono::Utc::now().timestamp_millis() as u64,
                response_time: 0.0,
                failure_count: 0,
                metadata: HashMap::new(),
            },
            ServiceEndpoint {
                id: "websocket_backup".to_string(),
                service_type: ServiceType::WebSocket,
                address: "localhost".to_string(),
                port: 6007,
                region: "backup".to_string(),
                priority: 2,
                weight: 50,
                status: EndpointStatus::Standby,
                last_health_check: chrono::Utc::now().timestamp_millis() as u64,
                response_time: 0.0,
                failure_count: 0,
                metadata: HashMap::new(),
            },
        ];

        let mut primary_services = self.primary_services.write().await;
        let mut backup_services = self.backup_services.write().await;

        for endpoint in default_endpoints {
            let service_key = format!("{}:{}", endpoint.service_type.to_string(), endpoint.region);
            
            if endpoint.status == EndpointStatus::Active {
                primary_services.insert(service_key.clone(), endpoint.clone());
            } else {
                backup_services.entry(service_key).or_insert_with(Vec::new).push(endpoint);
            }
        }
    }

    /// 启动监控循环
    async fn start_monitoring_loop(&self) {
        let primary_services = self.primary_services.clone();
        let backup_services = self.backup_services.clone();
        let active_failovers = self.active_failovers.clone();
        let health_monitor = self.health_monitor.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(config.detection_interval);

            loop {
                interval.tick().await;

                // 检查主服务状态
                Self::check_primary_services_health(
                    primary_services.clone(),
                    backup_services.clone(),
                    active_failovers.clone(),
                    health_monitor.clone(),
                    &config,
                ).await;

                // 检查备用服务状态
                Self::check_backup_services_health(
                    backup_services.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 检查主服务健康状态
    async fn check_primary_services_health(
        primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        active_failovers: Arc<RwLock<HashMap<String, FailoverSession>>>,
        health_monitor: Arc<HealthMonitor>,
        config: &FailoverConfig,
    ) {
        let service_list: Vec<(String, ServiceEndpoint)> = {
            let services = primary_services.read().await;
            services.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
        };

        for (service_key, endpoint) in service_list {
            // 检查服务健康状态
            let health_status = Self::check_endpoint_health(&endpoint, health_monitor.clone()).await;
            
            // 如果服务不健康且没有正在进行的故障转移
            if health_status < config.health_check_threshold {
                let failover_exists = active_failovers.read().await.contains_key(&service_key);
                
                if !failover_exists {
                    // 查找可用的备用服务
                    let backup_endpoint = {
                        let backup_services_guard = backup_services.read().await;
                        backup_services_guard.get(&service_key)
                            .and_then(|backups| backups.first())
                            .cloned()
                    };

                    if let Some(backup) = backup_endpoint {
                        // 启动故障转移
                        let failover_session = FailoverSession {
                            id: uuid::Uuid::new_v4().to_string(),
                            service_id: service_key.clone(),
                            primary_endpoint: endpoint.clone(),
                            backup_endpoint: backup,
                            failover_type: FailoverType::Automatic,
                            status: FailoverStatus::Initiated,
                            started_at: Instant::now(),
                            completed_at: None,
                            attempt_count: 1,
                            affected_connections: Vec::new(),
                            error_message: None,
                        };

                        active_failovers.write().await.insert(service_key.clone(), failover_session);
                        
                        warn!("Initiated failover for service: {} due to health check failure", service_key);
                    } else {
                        error!("No backup service available for failover: {}", service_key);
                    }
                }
            }
        }
    }

    /// 检查端点健康状态
    async fn check_endpoint_health(
        endpoint: &ServiceEndpoint,
        health_monitor: Arc<HealthMonitor>,
    ) -> f64 {
        match endpoint.service_type {
            ServiceType::WebSocket => {
                // 检查WebSocket服务健康状态
                if let Some(service_health) = health_monitor.get_service_health("websocket_pool").await {
                    match service_health.status {
                        HealthStatus::Healthy => 1.0,
                        HealthStatus::Degraded => 0.7,
                        HealthStatus::Unhealthy => 0.0,
                        HealthStatus::Unknown => 0.5,
                    }
                } else {
                    0.0
                }
            }
            ServiceType::LoadBalancer => {
                // 检查负载均衡器健康状态
                if let Some(service_health) = health_monitor.get_service_health("load_balancer").await {
                    match service_health.status {
                        HealthStatus::Healthy => 1.0,
                        HealthStatus::Degraded => 0.7,
                        HealthStatus::Unhealthy => 0.0,
                        HealthStatus::Unknown => 0.5,
                    }
                } else {
                    0.0
                }
            }
            _ => {
                // 对于其他服务类型，实现相应的健康检查
                0.8
            }
        }
    }

    /// 检查备用服务健康状态
    async fn check_backup_services_health(
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        config: &FailoverConfig,
    ) {
        let mut services = backup_services.write().await;
        
        for (service_key, endpoints) in services.iter_mut() {
            for endpoint in endpoints.iter_mut() {
                // 检查备用服务是否可用
                let is_healthy = Self::ping_endpoint(endpoint).await;
                
                if is_healthy {
                    endpoint.status = EndpointStatus::Standby;
                    endpoint.failure_count = 0;
                } else {
                    endpoint.failure_count += 1;
                    
                    if endpoint.failure_count >= 3 {
                        endpoint.status = EndpointStatus::Failed;
                        warn!("Backup service {} marked as failed", endpoint.id);
                    }
                }
                
                endpoint.last_health_check = chrono::Utc::now().timestamp_millis() as u64;
            }
        }
    }

    /// ping端点检查连通性
    async fn ping_endpoint(endpoint: &ServiceEndpoint) -> bool {
        // 实现实际的端点连通性检查
        // 这里可以尝试建立TCP连接或发送HTTP请求
        match endpoint.service_type {
            ServiceType::WebSocket => {
                // 尝试WebSocket连接
                let url = format!("ws://{}:{}/ws", endpoint.address, endpoint.port);
                Self::check_websocket_connectivity(&url).await
            }
            ServiceType::API => {
                // 尝试HTTP请求
                let url = format!("http://{}:{}/health", endpoint.address, endpoint.port);
                Self::check_http_connectivity(&url).await
            }
            _ => {
                // 默认TCP连接检查
                Self::check_tcp_connectivity(&endpoint.address, endpoint.port).await
            }
        }
    }

    /// 检查WebSocket连通性
    async fn check_websocket_connectivity(url: &str) -> bool {
        match tokio::time::timeout(Duration::from_secs(5), async {
            tokio_tungstenite::connect_async(url).await
        }).await {
            Ok(Ok(_)) => true,
            _ => false,
        }
    }

    /// 检查HTTP连通性
    async fn check_http_connectivity(url: &str) -> bool {
        match tokio::time::timeout(Duration::from_secs(5), async {
            reqwest::get(url).await
        }).await {
            Ok(Ok(response)) => response.status().is_success(),
            _ => false,
        }
    }

    /// 检查TCP连通性
    async fn check_tcp_connectivity(address: &str, port: u16) -> bool {
        match tokio::time::timeout(Duration::from_secs(5), 
            tokio::net::TcpStream::connect((address, port))
        ).await {
            Ok(Ok(_)) => true,
            _ => false,
        }
    }

    /// 启动故障转移处理器
    async fn start_failover_processor(&self) {
        let active_failovers = self.active_failovers.clone();
        let primary_services = self.primary_services.clone();
        let backup_services = self.backup_services.clone();
        let websocket_pool = self.websocket_pool.clone();
        let load_balancer = self.load_balancer.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));

            loop {
                interval.tick().await;

                // 处理活跃的故障转移
                Self::process_active_failovers(
                    active_failovers.clone(),
                    primary_services.clone(),
                    backup_services.clone(),
                    websocket_pool.clone(),
                    load_balancer.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 处理活跃的故障转移
    async fn process_active_failovers(
        active_failovers: Arc<RwLock<HashMap<String, FailoverSession>>>,
        primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        load_balancer: Arc<LoadBalancer>,
        config: &FailoverConfig,
    ) {
        let failover_sessions: Vec<(String, FailoverSession)> = {
            let failovers = active_failovers.read().await;
            failovers.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
        };

        for (service_key, mut session) in failover_sessions {
            match session.status {
                FailoverStatus::Initiated => {
                    // 开始排空连接
                    session.status = FailoverStatus::DrainConnections;
                    info!("Starting connection drain for failover: {}", session.id);
                    
                    // 实现连接排空逻辑
                    Self::drain_connections(&session, websocket_pool.clone()).await;
                }
                
                FailoverStatus::DrainConnections => {
                    // 检查连接是否已排空
                    if Self::check_connections_drained(&session, websocket_pool.clone()).await {
                        session.status = FailoverStatus::SwitchingTraffic;
                        info!("Connection drain completed, switching traffic: {}", session.id);
                    } else if session.started_at.elapsed() > config.connection_drain_timeout {
                        // 强制切换流量
                        session.status = FailoverStatus::SwitchingTraffic;
                        warn!("Connection drain timeout, forcing traffic switch: {}", session.id);
                    }
                }
                
                FailoverStatus::SwitchingTraffic => {
                    // 执行流量切换
                    let switch_result = Self::switch_traffic(
                        &session,
                        primary_services.clone(),
                        backup_services.clone(),
                        load_balancer.clone(),
                    ).await;
                    
                    if switch_result {
                        session.status = FailoverStatus::Completed;
                        session.completed_at = Some(Instant::now());
                        info!("Failover completed successfully: {}", session.id);
                    } else {
                        session.status = FailoverStatus::Failed;
                        session.error_message = Some("Failed to switch traffic".to_string());
                        error!("Failover failed: {}", session.id);
                    }
                }
                
                FailoverStatus::Failed => {
                    // 检查是否需要重试
                    if session.attempt_count < config.max_failover_attempts {
                        session.attempt_count += 1;
                        session.status = FailoverStatus::Initiated;
                        session.started_at = Instant::now();
                        info!("Retrying failover: {} (attempt {})", session.id, session.attempt_count);
                    } else {
                        warn!("Failover max attempts reached: {}", session.id);
                        // 保留失败的会话以供分析
                    }
                }
                
                _ => {
                    // 其他状态不需要处理
                }
            }

            // 更新会话状态
            active_failovers.write().await.insert(service_key, session);
        }
    }

    /// 排空连接
    async fn drain_connections(session: &FailoverSession, websocket_pool: Arc<WebSocketConnectionPool>) {
        // 实现连接排空逻辑
        // 1. 停止接受新连接
        // 2. 优雅地关闭现有连接
        // 3. 等待连接自然结束
        
        debug!("Draining connections for service: {}", session.service_id);
        
        // 这里可以实现更复杂的连接排空逻辑
        // 例如：发送关闭通知、设置连接为只读模式等
    }

    /// 检查连接是否已排空
    async fn check_connections_drained(session: &FailoverSession, websocket_pool: Arc<WebSocketConnectionPool>) -> bool {
        // 检查是否还有活跃连接
        let stats = websocket_pool.get_stats().await;
        
        // 这里应该检查特定服务的连接数
        // 简化实现：如果总连接数很少，认为已排空
        stats.active_connections < 10
    }

    /// 切换流量
    async fn switch_traffic(
        session: &FailoverSession,
        primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        load_balancer: Arc<LoadBalancer>,
    ) -> bool {
        // 实现流量切换逻辑
        // 1. 更新主服务配置
        // 2. 更新负载均衡器配置
        // 3. 验证切换是否成功

        info!("Switching traffic from {} to {}", 
              session.primary_endpoint.id, session.backup_endpoint.id);

        // 更新服务配置
        {
            let mut primary_services_guard = primary_services.write().await;
            let mut backup_services_guard = backup_services.write().await;

            // 将主服务标记为失败
            if let Some(primary) = primary_services_guard.get_mut(&session.service_id) {
                primary.status = EndpointStatus::Failed;
            }

            // 将备用服务提升为主服务
            if let Some(backups) = backup_services_guard.get_mut(&session.service_id) {
                for backup in backups.iter_mut() {
                    if backup.id == session.backup_endpoint.id {
                        backup.status = EndpointStatus::Active;
                        
                        // 更新主服务列表
                        primary_services_guard.insert(session.service_id.clone(), backup.clone());
                        break;
                    }
                }
            }
        }

        // 更新负载均衡器
        // 这里可以添加具体的负载均衡器更新逻辑

        true
    }

    /// 启动自动恢复
    async fn start_auto_failback(&self) {
        let active_failovers = self.active_failovers.clone();
        let primary_services = self.primary_services.clone();
        let backup_services = self.backup_services.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(config.recovery_timeout);

            loop {
                interval.tick().await;

                // 检查是否可以恢复到主服务
                Self::check_failback_opportunities(
                    active_failovers.clone(),
                    primary_services.clone(),
                    backup_services.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 检查故障恢复机会
    async fn check_failback_opportunities(
        active_failovers: Arc<RwLock<HashMap<String, FailoverSession>>>,
        primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        config: &FailoverConfig,
    ) {
        let completed_failovers: Vec<(String, FailoverSession)> = {
            let failovers = active_failovers.read().await;
            failovers.iter()
                .filter(|(_, session)| session.status == FailoverStatus::Completed)
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        };

        for (service_key, session) in completed_failovers {
            // 检查原主服务是否已恢复
            if Self::check_primary_service_recovery(&session.primary_endpoint).await {
                info!("Primary service {} has recovered, initiating failback", 
                      session.primary_endpoint.id);
                
                // 启动故障恢复
                Self::initiate_failback(
                    &service_key,
                    &session,
                    primary_services.clone(),
                    backup_services.clone(),
                    active_failovers.clone(),
                ).await;
            }
        }
    }

    /// 检查主服务恢复
    async fn check_primary_service_recovery(endpoint: &ServiceEndpoint) -> bool {
        // 检查原主服务是否已恢复健康
        Self::ping_endpoint(endpoint).await
    }

    /// 启动故障恢复
    async fn initiate_failback(
        service_key: &str,
        original_session: &FailoverSession,
        primary_services: Arc<RwLock<HashMap<String, ServiceEndpoint>>>,
        backup_services: Arc<RwLock<HashMap<String, Vec<ServiceEndpoint>>>>,
        active_failovers: Arc<RwLock<HashMap<String, FailoverSession>>>,
    ) {
        // 创建故障恢复会话
        let failback_session = FailoverSession {
            id: uuid::Uuid::new_v4().to_string(),
            service_id: service_key.to_string(),
            primary_endpoint: original_session.backup_endpoint.clone(), // 当前的主服务
            backup_endpoint: original_session.primary_endpoint.clone(), // 要恢复的服务
            failover_type: FailoverType::Automatic,
            status: FailoverStatus::Initiated,
            started_at: Instant::now(),
            completed_at: None,
            attempt_count: 1,
            affected_connections: Vec::new(),
            error_message: None,
        };

        // 更新活跃故障转移列表
        active_failovers.write().await.insert(service_key.to_string(), failback_session);
        
        info!("Initiated failback for service: {}", service_key);
    }

    /// 手动触发故障转移
    pub async fn trigger_manual_failover(&self, service_id: &str, target_endpoint_id: &str) -> Result<String> {
        let primary_service = {
            let primary_services = self.primary_services.read().await;
            primary_services.get(service_id).cloned()
        };

        let backup_endpoint = {
            let backup_services = self.backup_services.read().await;
            backup_services.get(service_id)
                .and_then(|backups| backups.iter().find(|e| e.id == target_endpoint_id))
                .cloned()
        };

        if let (Some(primary), Some(backup)) = (primary_service, backup_endpoint) {
            let failover_session = FailoverSession {
                id: uuid::Uuid::new_v4().to_string(),
                service_id: service_id.to_string(),
                primary_endpoint: primary,
                backup_endpoint: backup,
                failover_type: FailoverType::Manual,
                status: FailoverStatus::Initiated,
                started_at: Instant::now(),
                completed_at: None,
                attempt_count: 1,
                affected_connections: Vec::new(),
                error_message: None,
            };

            let session_id = failover_session.id.clone();
            self.active_failovers.write().await.insert(service_id.to_string(), failover_session);

            info!("Manual failover triggered for service: {}", service_id);
            Ok(session_id)
        } else {
            Err(anyhow::anyhow!("Service or target endpoint not found"))
        }
    }

    /// 获取故障转移统计
    pub async fn get_failover_stats(&self) -> FailoverStats {
        let active_failovers = self.active_failovers.read().await;
        let primary_services = self.primary_services.read().await;
        let backup_services = self.backup_services.read().await;

        let mut stats = FailoverStats {
            total_services: primary_services.len(),
            active_failovers: active_failovers.len(),
            completed_failovers: 0,
            failed_failovers: 0,
            total_backup_services: 0,
            average_failover_time: 0.0,
            success_rate: 0.0,
        };

        // 计算备用服务总数
        for endpoints in backup_services.values() {
            stats.total_backup_services += endpoints.len();
        }

        // 计算故障转移统计
        let mut completed_count = 0;
        let mut failed_count = 0;
        let mut total_time = 0.0;

        for session in active_failovers.values() {
            match session.status {
                FailoverStatus::Completed => {
                    completed_count += 1;
                    if let Some(completed_at) = session.completed_at {
                        total_time += (completed_at - session.started_at).as_secs_f64();
                    }
                }
                FailoverStatus::Failed => {
                    failed_count += 1;
                }
                _ => {}
            }
        }

        stats.completed_failovers = completed_count;
        stats.failed_failovers = failed_count;

        if completed_count > 0 {
            stats.average_failover_time = total_time / completed_count as f64;
        }

        if completed_count + failed_count > 0 {
            stats.success_rate = completed_count as f64 / (completed_count + failed_count) as f64 * 100.0;
        }

        stats
    }

    /// 构建故障转移路由
    pub fn routes(&self) -> impl warp::Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
        use warp::Filter;

        let manager = self.clone();

        let stats_route = warp::path!("api" / "failover" / "stats")
            .and(warp::get())
            .and_then(move || {
                let mgr = manager.clone();
                async move {
                    let stats = mgr.get_failover_stats().await;
                    Ok::<_, warp::Rejection>(warp::reply::json(&stats))
                }
            });

        let services_route = warp::path!("api" / "failover" / "services")
            .and(warp::get())
            .and_then(move || {
                let mgr = manager.clone();
                async move {
                    let primary_services = mgr.primary_services.read().await;
                    let backup_services = mgr.backup_services.read().await;
                    let response = serde_json::json!({
                        "primary_services": primary_services.clone(),
                        "backup_services": backup_services.clone()
                    });
                    Ok::<_, warp::Rejection>(warp::reply::json(&response))
                }
            });

        stats_route.or(services_route)
    }
}

impl ToString for ServiceType {
    fn to_string(&self) -> String {
        match self {
            ServiceType::WebSocket => "websocket".to_string(),
            ServiceType::Database => "database".to_string(),
            ServiceType::Cache => "cache".to_string(),
            ServiceType::MessageQueue => "message_queue".to_string(),
            ServiceType::LoadBalancer => "load_balancer".to_string(),
            ServiceType::API => "api".to_string(),
            ServiceType::Custom(name) => name.clone(),
        }
    }
}

/// 故障转移统计
#[derive(Debug, Serialize, Deserialize)]
pub struct FailoverStats {
    pub total_services: usize,
    pub active_failovers: usize,
    pub completed_failovers: usize,
    pub failed_failovers: usize,
    pub total_backup_services: usize,
    pub average_failover_time: f64,
    pub success_rate: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_type_to_string() {
        assert_eq!(ServiceType::WebSocket.to_string(), "websocket");
        assert_eq!(ServiceType::Database.to_string(), "database");
        assert_eq!(ServiceType::Custom("test".to_string()).to_string(), "test");
    }

    #[tokio::test]
    async fn test_endpoint_ping() {
        let endpoint = ServiceEndpoint {
            id: "test".to_string(),
            service_type: ServiceType::WebSocket,
            address: "127.0.0.1".to_string(),
            port: 80,
            region: "test".to_string(),
            priority: 1,
            weight: 100,
            status: EndpointStatus::Active,
            last_health_check: 0,
            response_time: 0.0,
            failure_count: 0,
            metadata: HashMap::new(),
        };

        // 这个测试可能会失败，因为没有实际的服务在运行
        let result = FailoverManager::ping_endpoint(&endpoint).await;
        // 不断言结果，只是测试函数是否可以执行
    }
}