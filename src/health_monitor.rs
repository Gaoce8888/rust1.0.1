use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

use crate::load_balancer::{LoadBalancer, ServerNode, ServerStatus};
use crate::websocket_pool::WebSocketConnectionPool;
use crate::performance_optimizer::PerformanceOptimizer;

/// 健康监控管理器
#[derive(Clone)]
pub struct HealthMonitor {
    services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
    load_balancer: Arc<LoadBalancer>,
    websocket_pool: Arc<WebSocketConnectionPool>,
    performance_optimizer: Arc<PerformanceOptimizer>,
    config: HealthMonitorConfig,
    alerts: Arc<RwLock<Vec<HealthAlert>>>,
}

/// 健康监控配置
#[derive(Debug, Clone)]
pub struct HealthMonitorConfig {
    pub check_interval: Duration,
    pub health_check_timeout: Duration,
    pub failure_threshold: u32,
    pub recovery_threshold: u32,
    pub enable_auto_recovery: bool,
    pub enable_failover: bool,
    pub alert_cooldown: Duration,
    pub max_alerts: usize,
}

impl Default for HealthMonitorConfig {
    fn default() -> Self {
        Self {
            check_interval: Duration::from_secs(30),
            health_check_timeout: Duration::from_secs(10),
            failure_threshold: 3,
            recovery_threshold: 2,
            enable_auto_recovery: true,
            enable_failover: true,
            alert_cooldown: Duration::from_secs(300),
            max_alerts: 100,
        }
    }
}

/// 服务健康状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub service_name: String,
    pub service_type: ServiceType,
    pub status: HealthStatus,
    pub last_check: u64,
    pub response_time: f64,
    pub error_count: u32,
    pub success_count: u32,
    pub availability: f64,
    pub details: HashMap<String, String>,
    pub dependencies: Vec<String>,
}

/// 服务类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceType {
    LoadBalancer,
    WebSocketPool,
    PerformanceOptimizer,
    Database,
    Cache,
    External,
    Custom(String),
}

/// 健康状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// 健康检查结果
#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    pub service_name: String,
    pub status: HealthStatus,
    pub response_time: f64,
    pub error_message: Option<String>,
    pub details: HashMap<String, String>,
}

/// 健康警告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthAlert {
    pub id: String,
    pub service_name: String,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub message: String,
    pub timestamp: u64,
    pub resolved: bool,
    pub resolution_time: Option<u64>,
}

/// 警告类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertType {
    ServiceDown,
    ServiceDegraded,
    HighResponseTime,
    HighErrorRate,
    DependencyFailure,
    ResourceExhaustion,
    Custom(String),
}

/// 警告严重程度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// 系统健康概览
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemHealthOverview {
    pub overall_status: HealthStatus,
    pub total_services: usize,
    pub healthy_services: usize,
    pub degraded_services: usize,
    pub unhealthy_services: usize,
    pub system_uptime: u64,
    pub average_response_time: f64,
    pub total_requests: u64,
    pub error_rate: f64,
    pub active_alerts: usize,
    pub last_updated: u64,
}

impl HealthMonitor {
    pub fn new(
        load_balancer: Arc<LoadBalancer>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        performance_optimizer: Arc<PerformanceOptimizer>,
        config: HealthMonitorConfig,
    ) -> Self {
        Self {
            services: Arc::new(RwLock::new(HashMap::new())),
            load_balancer,
            websocket_pool,
            performance_optimizer,
            config,
            alerts: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// 启动健康监控
    pub async fn start(&self) -> Result<()> {
        // 注册核心服务
        self.register_core_services().await;

        // 启动健康检查循环
        self.start_health_check_loop().await;

        // 启动自动恢复
        if self.config.enable_auto_recovery {
            self.start_auto_recovery().await;
        }

        // 启动故障转移
        if self.config.enable_failover {
            self.start_failover_monitor().await;
        }

        info!("Health monitor started");
        Ok(())
    }

    /// 注册核心服务
    async fn register_core_services(&self) {
        let core_services = vec![
            ServiceHealth {
                service_name: "load_balancer".to_string(),
                service_type: ServiceType::LoadBalancer,
                status: HealthStatus::Unknown,
                last_check: 0,
                response_time: 0.0,
                error_count: 0,
                success_count: 0,
                availability: 100.0,
                details: HashMap::new(),
                dependencies: vec![],
            },
            ServiceHealth {
                service_name: "websocket_pool".to_string(),
                service_type: ServiceType::WebSocketPool,
                status: HealthStatus::Unknown,
                last_check: 0,
                response_time: 0.0,
                error_count: 0,
                success_count: 0,
                availability: 100.0,
                details: HashMap::new(),
                dependencies: vec![],
            },
            ServiceHealth {
                service_name: "performance_optimizer".to_string(),
                service_type: ServiceType::PerformanceOptimizer,
                status: HealthStatus::Unknown,
                last_check: 0,
                response_time: 0.0,
                error_count: 0,
                success_count: 0,
                availability: 100.0,
                details: HashMap::new(),
                dependencies: vec![],
            },
        ];

        let mut services = self.services.write().await;
        for service in core_services {
            services.insert(service.service_name.clone(), service);
        }
    }

    /// 启动健康检查循环
    async fn start_health_check_loop(&self) {
        let services = self.services.clone();
        let load_balancer = self.load_balancer.clone();
        let websocket_pool = self.websocket_pool.clone();
        let performance_optimizer = self.performance_optimizer.clone();
        let alerts = self.alerts.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(config.check_interval);

            loop {
                interval.tick().await;

                // 检查所有服务
                Self::perform_health_checks(
                    services.clone(),
                    load_balancer.clone(),
                    websocket_pool.clone(),
                    performance_optimizer.clone(),
                    alerts.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 执行健康检查
    async fn perform_health_checks(
        services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
        load_balancer: Arc<LoadBalancer>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        performance_optimizer: Arc<PerformanceOptimizer>,
        alerts: Arc<RwLock<Vec<HealthAlert>>>,
        config: &HealthMonitorConfig,
    ) {
        let service_names: Vec<String> = {
            let services_guard = services.read().await;
            services_guard.keys().cloned().collect()
        };

        for service_name in service_names {
            let check_result = Self::check_service_health(
                &service_name,
                load_balancer.clone(),
                websocket_pool.clone(),
                performance_optimizer.clone(),
                config,
            ).await;

            // 更新服务状态
            {
                let mut services_guard = services.write().await;
                if let Some(service) = services_guard.get_mut(&service_name) {
                    let previous_status = service.status.clone();
                    
                    service.status = check_result.status.clone();
                    service.last_check = chrono::Utc::now().timestamp_millis() as u64;
                    service.response_time = check_result.response_time;
                    service.details = check_result.details;

                    // 更新统计
                    if check_result.status == HealthStatus::Healthy {
                        service.success_count += 1;
                    } else {
                        service.error_count += 1;
                    }

                    // 计算可用性
                    let total_checks = service.success_count + service.error_count;
                    if total_checks > 0 {
                        service.availability = (service.success_count as f64 / total_checks as f64) * 100.0;
                    }

                    // 检查状态变化
                    if previous_status != check_result.status {
                        Self::handle_status_change(
                            &service_name,
                            previous_status,
                            check_result.status.clone(),
                            alerts.clone(),
                        ).await;
                    }
                }
            }
        }
    }

    /// 检查单个服务健康状态
    async fn check_service_health(
        service_name: &str,
        load_balancer: Arc<LoadBalancer>,
        websocket_pool: Arc<WebSocketConnectionPool>,
        performance_optimizer: Arc<PerformanceOptimizer>,
        config: &HealthMonitorConfig,
    ) -> HealthCheckResult {
        let start_time = Instant::now();
        let mut result = HealthCheckResult {
            service_name: service_name.to_string(),
            status: HealthStatus::Unknown,
            response_time: 0.0,
            error_message: None,
            details: HashMap::new(),
        };

        // 根据服务类型执行不同的健康检查
        match service_name {
            "load_balancer" => {
                result = Self::check_load_balancer_health(load_balancer, config).await;
            }
            "websocket_pool" => {
                result = Self::check_websocket_pool_health(websocket_pool, config).await;
            }
            "performance_optimizer" => {
                result = Self::check_performance_optimizer_health(performance_optimizer, config).await;
            }
            _ => {
                result.status = HealthStatus::Unknown;
                result.error_message = Some("Unknown service type".to_string());
            }
        }

        result.response_time = start_time.elapsed().as_millis() as f64;
        result
    }

    /// 检查负载均衡器健康状态
    async fn check_load_balancer_health(
        load_balancer: Arc<LoadBalancer>,
        _config: &HealthMonitorConfig,
    ) -> HealthCheckResult {
        let mut result = HealthCheckResult {
            service_name: "load_balancer".to_string(),
            status: HealthStatus::Healthy,
            response_time: 0.0,
            error_message: None,
            details: HashMap::new(),
        };

        match load_balancer.get_server_stats().await {
            Ok(stats) => {
                result.details.insert("total_servers".to_string(), stats.total_servers.to_string());
                result.details.insert("healthy_servers".to_string(), stats.healthy_servers.to_string());
                result.details.insert("unhealthy_servers".to_string(), stats.unhealthy_servers.to_string());
                result.details.insert("success_rate".to_string(), format!("{:.2}%", stats.success_rate * 100.0));

                // 评估健康状态
                if stats.healthy_servers == 0 {
                    result.status = HealthStatus::Unhealthy;
                    result.error_message = Some("No healthy servers available".to_string());
                } else if stats.healthy_servers < stats.total_servers / 2 {
                    result.status = HealthStatus::Degraded;
                    result.error_message = Some("Less than half of servers are healthy".to_string());
                } else {
                    result.status = HealthStatus::Healthy;
                }
            }
            Err(e) => {
                result.status = HealthStatus::Unhealthy;
                result.error_message = Some(format!("Failed to get load balancer stats: {}", e));
            }
        }

        result
    }

    /// 检查WebSocket连接池健康状态
    async fn check_websocket_pool_health(
        websocket_pool: Arc<WebSocketConnectionPool>,
        _config: &HealthMonitorConfig,
    ) -> HealthCheckResult {
        let mut result = HealthCheckResult {
            service_name: "websocket_pool".to_string(),
            status: HealthStatus::Healthy,
            response_time: 0.0,
            error_message: None,
            details: HashMap::new(),
        };

        let stats = websocket_pool.get_stats().await;
        
        result.details.insert("total_connections".to_string(), stats.total_connections.to_string());
        result.details.insert("active_connections".to_string(), stats.active_connections.to_string());
        result.details.insert("total_messages".to_string(), stats.total_messages.to_string());
        result.details.insert("bytes_transferred".to_string(), stats.bytes_transferred.to_string());

        // 评估健康状态
        if stats.error_rate > 10.0 {
            result.status = HealthStatus::Degraded;
            result.error_message = Some(format!("High error rate: {:.2}%", stats.error_rate));
        } else if stats.average_response_time > 5000.0 {
            result.status = HealthStatus::Degraded;
            result.error_message = Some(format!("High response time: {:.2}ms", stats.average_response_time));
        } else {
            result.status = HealthStatus::Healthy;
        }

        result
    }

    /// 检查性能优化器健康状态
    async fn check_performance_optimizer_health(
        performance_optimizer: Arc<PerformanceOptimizer>,
        _config: &HealthMonitorConfig,
    ) -> HealthCheckResult {
        let mut result = HealthCheckResult {
            service_name: "performance_optimizer".to_string(),
            status: HealthStatus::Healthy,
            response_time: 0.0,
            error_message: None,
            details: HashMap::new(),
        };

        let stats = performance_optimizer.get_optimization_stats().await;
        let metrics = performance_optimizer.get_current_metrics().await;

        result.details.insert("total_rules".to_string(), stats.total_rules.to_string());
        result.details.insert("enabled_rules".to_string(), stats.enabled_rules.to_string());
        result.details.insert("active_optimizations".to_string(), stats.active_optimizations.to_string());
        result.details.insert("success_rate".to_string(), format!("{:.2}%", stats.success_rate));
        result.details.insert("cpu_usage".to_string(), format!("{:.2}%", metrics.cpu_usage));
        result.details.insert("memory_usage".to_string(), format!("{:.2}%", metrics.memory_usage));

        // 评估健康状态
        if metrics.cpu_usage > 95.0 || metrics.memory_usage > 95.0 {
            result.status = HealthStatus::Unhealthy;
            result.error_message = Some("Critical resource usage".to_string());
        } else if metrics.cpu_usage > 85.0 || metrics.memory_usage > 85.0 {
            result.status = HealthStatus::Degraded;
            result.error_message = Some("High resource usage".to_string());
        } else {
            result.status = HealthStatus::Healthy;
        }

        result
    }

    /// 处理状态变化
    async fn handle_status_change(
        service_name: &str,
        previous_status: HealthStatus,
        new_status: HealthStatus,
        alerts: Arc<RwLock<Vec<HealthAlert>>>,
    ) {
        let alert_type = match new_status {
            HealthStatus::Unhealthy => AlertType::ServiceDown,
            HealthStatus::Degraded => AlertType::ServiceDegraded,
            _ => return,
        };

        let severity = match new_status {
            HealthStatus::Unhealthy => AlertSeverity::Critical,
            HealthStatus::Degraded => AlertSeverity::Warning,
            _ => AlertSeverity::Info,
        };

        let alert = HealthAlert {
            id: uuid::Uuid::new_v4().to_string(),
            service_name: service_name.to_string(),
            alert_type,
            severity,
            message: format!("Service {} status changed from {:?} to {:?}", 
                           service_name, previous_status, new_status),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            resolved: false,
            resolution_time: None,
        };

        // 添加警告
        let mut alerts_guard = alerts.write().await;
        alerts_guard.push(alert.clone());

        // 限制警告数量
        if alerts_guard.len() > 100 {
            alerts_guard.remove(0);
        }

        match alert.severity {
            AlertSeverity::Critical => error!("CRITICAL: {}", alert.message),
            AlertSeverity::Error => error!("ERROR: {}", alert.message),
            AlertSeverity::Warning => warn!("WARNING: {}", alert.message),
            AlertSeverity::Info => info!("INFO: {}", alert.message),
        }
    }

    /// 启动自动恢复
    async fn start_auto_recovery(&self) {
        let services = self.services.clone();
        let load_balancer = self.load_balancer.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));

            loop {
                interval.tick().await;

                // 检查需要恢复的服务
                Self::attempt_auto_recovery(
                    services.clone(),
                    load_balancer.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 尝试自动恢复
    async fn attempt_auto_recovery(
        services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
        load_balancer: Arc<LoadBalancer>,
        config: &HealthMonitorConfig,
    ) {
        let unhealthy_services: Vec<String> = {
            let services_guard = services.read().await;
            services_guard.iter()
                .filter(|(_, service)| service.status == HealthStatus::Unhealthy)
                .map(|(name, _)| name.clone())
                .collect()
        };

        for service_name in unhealthy_services {
            info!("Attempting auto recovery for service: {}", service_name);
            
            // 根据服务类型执行不同的恢复操作
            match service_name.as_str() {
                "load_balancer" => {
                    // 尝试重新检查服务器状态
                    if let Err(e) = load_balancer.get_server_stats().await {
                        warn!("Failed to recover load balancer: {}", e);
                    }
                }
                "websocket_pool" => {
                    // 可以尝试重启连接池或清理僵尸连接
                    info!("Attempting to recover websocket pool");
                }
                "performance_optimizer" => {
                    // 可以尝试重置优化器状态
                    info!("Attempting to recover performance optimizer");
                }
                _ => {
                    warn!("Unknown service for auto recovery: {}", service_name);
                }
            }
        }
    }

    /// 启动故障转移监控
    async fn start_failover_monitor(&self) {
        let services = self.services.clone();
        let load_balancer = self.load_balancer.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(10));

            loop {
                interval.tick().await;

                // 检查是否需要故障转移
                Self::check_failover_conditions(
                    services.clone(),
                    load_balancer.clone(),
                    &config,
                ).await;
            }
        });
    }

    /// 检查故障转移条件
    async fn check_failover_conditions(
        services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
        load_balancer: Arc<LoadBalancer>,
        config: &HealthMonitorConfig,
    ) {
        let services_guard = services.read().await;
        
        // 检查负载均衡器是否需要故障转移
        if let Some(lb_service) = services_guard.get("load_balancer") {
            if lb_service.status == HealthStatus::Unhealthy {
                info!("Load balancer is unhealthy, checking failover conditions");
                
                // 检查是否有健康的服务器
                if let Ok(stats) = load_balancer.get_server_stats().await {
                    if stats.healthy_servers == 0 {
                        warn!("No healthy servers available, failover required");
                        // 这里可以实现故障转移逻辑
                    }
                }
            }
        }
    }

    /// 获取系统健康概览
    pub async fn get_system_health_overview(&self) -> SystemHealthOverview {
        let services = self.services.read().await;
        let alerts = self.alerts.read().await;

        let total_services = services.len();
        let healthy_services = services.values().filter(|s| s.status == HealthStatus::Healthy).count();
        let degraded_services = services.values().filter(|s| s.status == HealthStatus::Degraded).count();
        let unhealthy_services = services.values().filter(|s| s.status == HealthStatus::Unhealthy).count();

        // 计算总体状态
        let overall_status = if unhealthy_services > 0 {
            HealthStatus::Unhealthy
        } else if degraded_services > 0 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };

        // 计算平均响应时间
        let total_response_time: f64 = services.values().map(|s| s.response_time).sum();
        let average_response_time = if total_services > 0 {
            total_response_time / total_services as f64
        } else {
            0.0
        };

        // 计算错误率
        let total_requests: u64 = services.values().map(|s| s.success_count + s.error_count).sum::<u32>() as u64;
        let total_errors: u64 = services.values().map(|s| s.error_count).sum::<u32>() as u64;
        let error_rate = if total_requests > 0 {
            (total_errors as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };

        SystemHealthOverview {
            overall_status,
            total_services,
            healthy_services,
            degraded_services,
            unhealthy_services,
            system_uptime: 0, // 应该实现实际的系统运行时间
            average_response_time,
            total_requests,
            error_rate,
            active_alerts: alerts.iter().filter(|a| !a.resolved).count(),
            last_updated: chrono::Utc::now().timestamp_millis() as u64,
        }
    }

    /// 获取服务健康状态
    pub async fn get_service_health(&self, service_name: &str) -> Option<ServiceHealth> {
        self.services.read().await.get(service_name).cloned()
    }

    /// 获取所有警告
    pub async fn get_alerts(&self) -> Vec<HealthAlert> {
        self.alerts.read().await.clone()
    }

    /// 解决警告
    pub async fn resolve_alert(&self, alert_id: &str) -> Result<()> {
        let mut alerts = self.alerts.write().await;
        
        if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.resolved = true;
            alert.resolution_time = Some(chrono::Utc::now().timestamp_millis() as u64);
            info!("Alert resolved: {}", alert_id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Alert not found: {}", alert_id))
        }
    }

    /// 构建健康监控路由
    pub fn routes(&self) -> impl warp::Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
        use warp::Filter;

        let health_monitor = self.clone();

        let health_route = warp::path!("api" / "health" / "status")
            .and(warp::get())
            .and_then(move || {
                let monitor = health_monitor.clone();
                async move {
                    let overview = monitor.get_system_health_overview().await;
                    Ok::<_, warp::Rejection>(warp::reply::json(&overview))
                }
            });

        let services_route = warp::path!("api" / "health" / "services")
            .and(warp::get())
            .and_then(move || {
                let monitor = health_monitor.clone();
                async move {
                    let services = monitor.services.read().await;
                    let service_list: Vec<_> = services.values().cloned().collect();
                    Ok::<_, warp::Rejection>(warp::reply::json(&service_list))
                }
            });

        health_route.or(services_route)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::websocket_pool::WebSocketPoolConfig;
    use crate::performance_optimizer::OptimizerConfig;
    use crate::load_balancer::LoadBalancingStrategy;

    #[tokio::test]
    async fn test_health_monitor_creation() {
        let load_balancer = Arc::new(LoadBalancer::new(LoadBalancingStrategy::RoundRobin));
        let websocket_pool = Arc::new(WebSocketConnectionPool::new(WebSocketPoolConfig::default()));
        let performance_optimizer = Arc::new(PerformanceOptimizer::new(OptimizerConfig::default()));
        let config = HealthMonitorConfig::default();

        let monitor = HealthMonitor::new(
            load_balancer,
            websocket_pool,
            performance_optimizer,
            config,
        );

        assert_eq!(monitor.services.read().await.len(), 0);
        assert_eq!(monitor.alerts.read().await.len(), 0);
    }

    #[tokio::test]
    async fn test_system_health_overview() {
        let load_balancer = Arc::new(LoadBalancer::new(LoadBalancingStrategy::RoundRobin));
        let websocket_pool = Arc::new(WebSocketConnectionPool::new(WebSocketPoolConfig::default()));
        let performance_optimizer = Arc::new(PerformanceOptimizer::new(OptimizerConfig::default()));
        let config = HealthMonitorConfig::default();

        let monitor = HealthMonitor::new(
            load_balancer,
            websocket_pool,
            performance_optimizer,
            config,
        );

        monitor.register_core_services().await;

        let overview = monitor.get_system_health_overview().await;
        assert_eq!(overview.total_services, 3);
        assert_eq!(overview.overall_status, HealthStatus::Healthy);
    }
}