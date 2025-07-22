use std::sync::Arc;
use anyhow::Result;
use tracing::{info, error};
use crate::config::{init_config, AppConfig};
use crate::file_manager::FileManager;
use crate::html_template_manager::HtmlTemplateManager;
use crate::redis_client::RedisManager;
use crate::redis_pool::{RedisPoolManager, RedisPoolConfig};
use crate::storage::LocalStorage;
use crate::user_manager::UserManager;
use crate::voice_message::VoiceMessageManager;
use crate::websocket::WebSocketManager;
use crate::ai::AIManager;
use crate::auth::{JwtAuthManager, CustomerManager, HeartbeatService, start_heartbeat_service_background};
use crate::platform;
// Temporarily disabled enterprise modules for compilation
// use crate::load_balancer::{LoadBalancer, LoadBalancerConfig, LoadBalancingStrategy};
// use crate::websocket_pool::{WebSocketConnectionPool, WebSocketPoolConfig};
// use crate::api_routes::ApiRoutes;
// use crate::http_fallback::HttpFallbackManager;
// use crate::auto_upgrade::AutoUpgradeManager;
// use crate::performance_optimizer::{PerformanceOptimizer, OptimizerConfig};
// use crate::health_monitor::HealthMonitor;
// use crate::failover_manager::{FailoverManager, FailoverConfig};

/// 系统组件集合
pub struct SystemComponents {
    /// Redis管理器，用于缓存和消息队列
    #[allow(dead_code)] // 系统核心组件，间接使用
    pub redis_manager: RedisManager,
    /// Redis连接池管理器
    pub redis_pool: Arc<RedisPoolManager>,
    /// 本地存储管理器
    #[allow(dead_code)] // 系统核心组件，间接使用
    pub storage: LocalStorage,
    pub file_manager: Arc<FileManager>,
    pub html_manager: Arc<HtmlTemplateManager>,
    pub user_manager: Arc<UserManager>,
    pub voice_manager: Arc<VoiceMessageManager>,
    pub ws_manager: Arc<WebSocketManager>,
    pub ai_manager: Arc<AIManager>,
    pub jwt_auth_manager: Arc<JwtAuthManager>,
    pub customer_manager: Arc<CustomerManager>,
    #[allow(dead_code)]
    pub heartbeat_service: Arc<HeartbeatService>,
    // 企业级组件 - 暂时禁用以修复编译
    // pub load_balancer: Arc<LoadBalancer>,
    // pub websocket_pool: Arc<WebSocketConnectionPool>,
    // pub api_routes: Arc<ApiRoutes>,
    // pub http_fallback: Arc<HttpFallbackManager>,
    // pub auto_upgrade: Arc<AutoUpgradeManager>,
    // pub performance_optimizer: Arc<PerformanceOptimizer>,
    // pub health_monitor: Arc<HealthMonitor>,
    // pub failover_manager: Arc<FailoverManager>,
}

/// 初始化系统组件
pub async fn initialize_system_components() -> Result<SystemComponents> {
    // 创建平台特定的目录结构
    if let Err(e) = platform::create_platform_directories() {
        error!("创建平台目录失败: {:?}", e);
        return Err(anyhow::anyhow!("创建平台目录失败: {}", e));
    }
    info!("✅ 平台目录结构创建成功");
    
    // 加载配置
    init_config().map_err(|e| anyhow::anyhow!("配置加载失败: {}", e))?;
    let config = AppConfig::get();
    info!("配置加载成功: {} v{}", config.app.name, config.app.version);

    // 初始化Redis连接池
    let redis_url = format!("redis://{}:{}", config.redis.host, config.redis.port);
    let redis_manager = match RedisManager::with_default_pool(&redis_url) {
        Ok(manager) => {
            info!("Redis连接池初始化成功: {}", redis_url);
            if let Some(metrics) = manager.get_pool_metrics() {
                info!(
                    "连接池配置: 最大连接数={}, 当前连接数={}",
                    metrics.total_connections, metrics.active_connections
                );
            }
            manager
        }
        Err(e) => {
            error!("Redis连接池初始化失败: {:?}", e);
            return Err(e);
        }
    };

    // 初始化Redis连接池管理器
    let redis_pool_config = RedisPoolConfig {
        url: redis_url.clone(),
        max_size: 10,
        min_idle: Some(2),
        connection_timeout: std::time::Duration::from_secs(5),
        idle_timeout: Some(std::time::Duration::from_secs(300)),
        max_lifetime: Some(std::time::Duration::from_secs(3600)),
        recycle_timeout: std::time::Duration::from_secs(2),
    };
    let redis_pool = Arc::new(RedisPoolManager::new(redis_pool_config)?);
    info!("✅ Redis连接池管理器初始化成功");

    // 初始化本地存储
    let storage = match LocalStorage::new(&config.storage.data_dir) {
        Ok(storage) => {
            info!("本地存储初始化成功: {}", config.storage.data_dir);
            storage
        }
        Err(e) => {
            error!("本地存储初始化失败: {:?}", e);
            return Err(e);
        }
    };

    // 初始化文件管理器
    let file_manager = match FileManager::new(config.storage.clone()) {
        Ok(manager) => {
            info!("文件管理器初始化成功: {}", config.storage.blobs_dir);
            Arc::new(manager)
        }
        Err(e) => {
            error!("文件管理器初始化失败: {:?}", e);
            return Err(e);
        }
    };

    // 初始化HTML模板管理器
            let html_manager = match HtmlTemplateManager::new(config.storage.clone()).await {
            Ok(manager) => {
                info!("HTML模板管理器初始化成功");
                Arc::new(manager)
            }
        Err(e) => {
            error!("HTML模板管理器初始化失败: {:?}", e);
            return Err(e);
        }
    };

    // 初始化用户管理器
    let user_config_path = std::path::PathBuf::from(&config.storage.data_dir).join("users.json");
    let user_manager = match UserManager::new(user_config_path.to_str().unwrap()) {
        Ok(manager) => {
            info!("用户管理器初始化成功");
            Arc::new(manager)
        }
        Err(e) => {
            error!("用户管理器初始化失败: {:?}", e);
            return Err(anyhow::anyhow!("用户管理器初始化失败: {}", e));
        }
    };

    // 初始化语音消息管理器
    let voice_storage_path = std::path::PathBuf::from(&config.storage.data_dir).join("voice");
    let voice_manager = match VoiceMessageManager::new(voice_storage_path) {
        Ok(manager) => {
            info!("语音消息管理器初始化成功");
            Arc::new(manager)
        }
        Err(e) => {
            error!("语音消息管理器初始化失败: {:?}", e);
            return Err(anyhow::anyhow!("语音消息管理器初始化失败: {}", e));
        }
    };

    // 初始化WebSocket管理器
    let ws_manager = Arc::new(WebSocketManager::new(redis_manager.clone(), storage.clone()));
    info!("WebSocket管理器初始化成功");

    // 初始化AI管理器
    let ai_manager = Arc::new(AIManager::new());
    info!("AI管理器初始化成功");

    // 初始化JWT认证管理器
    let jwt_auth_manager = Arc::new(JwtAuthManager::new(redis_pool.clone()));
    // 初始化默认用户
    if let Err(e) = jwt_auth_manager.initialize_default_users().await {
        error!("初始化默认用户失败: {:?}", e);
        return Err(anyhow::anyhow!("初始化默认用户失败: {}", e));
    }
    info!("✅ JWT认证管理器初始化成功");

    // 初始化客户管理器
    let customer_manager = Arc::new(CustomerManager::new(redis_pool.clone()));
    info!("✅ 客户管理器初始化成功");

    // 初始化心跳检测服务
    let heartbeat_service = Arc::new(HeartbeatService::new(redis_pool.clone(), customer_manager.clone()));
    info!("✅ 心跳检测服务初始化成功");

    // 企业级组件初始化 - 暂时禁用以修复编译
    /*
    // 初始化负载均衡器
    let load_balancer_config = LoadBalancerConfig {
        strategy: LoadBalancingStrategy::RoundRobin,
        health_check_interval: Duration::from_secs(30),
        max_failures: 3,
    };
    let load_balancer = Arc::new(LoadBalancer::new(load_balancer_config));

    // 初始化WebSocket连接池
    let pool_config = WebSocketPoolConfig {
        max_connections: 1000,
        connection_timeout: Duration::from_secs(30),
        idle_timeout: Duration::from_secs(300),
    };
    let websocket_pool = Arc::new(WebSocketConnectionPool::new(pool_config));

    // 初始化API路由
    let api_routes = Arc::new(ApiRoutes::new(load_balancer.clone(), websocket_pool.clone()));

    // 初始化HTTP回退管理器
    let http_fallback = Arc::new(HttpFallbackManager::new());

    // 初始化自动升级管理器
    let auto_upgrade = Arc::new(AutoUpgradeManager::new());

    // 初始化性能优化器
    let optimizer_config = OptimizerConfig {
        enable_compression: true,
        enable_caching: true,
        cache_ttl: Duration::from_secs(3600),
    };
    let performance_optimizer = Arc::new(PerformanceOptimizer::new(optimizer_config));

    // 初始化健康监控器
    let health_monitor = Arc::new(HealthMonitor::new());

    // 初始化故障转移管理器
    let failover_config = FailoverConfig {
        enable_auto_failover: true,
        failover_threshold: 3,
        recovery_timeout: Duration::from_secs(60),
    };
    let failover_manager = Arc::new(FailoverManager::new(failover_config));
    */

    info!("🎉 所有系统组件初始化完成");

    Ok(SystemComponents {
        redis_manager,
        redis_pool,
        storage,
        file_manager,
        html_manager,
        user_manager,
        voice_manager,
        ws_manager,
        ai_manager,
        jwt_auth_manager,
        customer_manager,
        heartbeat_service,
        // 企业级组件 - 暂时禁用以修复编译
        // load_balancer,
        // websocket_pool,
        // api_routes,
        // http_fallback,
        // auto_upgrade,
        // performance_optimizer,
        // health_monitor,
        // failover_manager,
    })
}

/// 启动后台任务
pub async fn start_background_tasks(components: &SystemComponents) {
    info!("🚀 启动后台任务...");

    // 启动心跳检测服务
    if let Err(e) = start_heartbeat_service_background(
        components.redis_pool.clone(),
        components.customer_manager.clone(),
    ).await {
        error!("💥 启动心跳检测服务失败: {}", e);
    }

    // 启动WebSocket心跳检查器
    components.ws_manager.start_heartbeat_checker().await;

    info!("✅ 后台任务启动完成");
}