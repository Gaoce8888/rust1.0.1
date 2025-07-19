use std::sync::Arc;
use anyhow::Result;
use tracing::{info, error};
use crate::config::{init_config, AppConfig};
use crate::file_manager::FileManager;
use crate::html_template_manager::HtmlTemplateManager;
use crate::redis_client::RedisManager;
use crate::storage::LocalStorage;
use crate::user_manager::UserManager;
use crate::voice_message::VoiceMessageManager;
use crate::websocket::WebSocketManager;
use crate::ai::AIManager;
use crate::auth::kefu_auth::KefuAuthManager;
// Enterprise modules removed for cleaner codebase

/// 系统组件集合
pub struct SystemComponents {
    /// Redis管理器，用于缓存和消息队列
    #[allow(dead_code)] // 系统核心组件，间接使用
    pub redis_manager: RedisManager,
    /// 本地存储管理器
    #[allow(dead_code)] // 系统核心组件，间接使用
    pub storage: LocalStorage,
    pub file_manager: Arc<FileManager>,
    pub html_manager: Arc<HtmlTemplateManager>,
    pub user_manager: Arc<UserManager>,
    pub voice_manager: Arc<VoiceMessageManager>,
    pub ws_manager: Arc<WebSocketManager>,
    pub ai_manager: Arc<AIManager>,
    pub kefu_auth_manager: Arc<KefuAuthManager>,
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
    let user_manager = match UserManager::new("config/users.json") {
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
    let voice_manager = match VoiceMessageManager::new(std::path::PathBuf::from("data/voice")) {
        Ok(manager) => {
            info!("🎤 语音消息管理器初始化成功");
            Arc::new(manager)
        }
        Err(e) => {
            error!("🎤 语音消息管理器初始化失败: {:?}", e);
            return Err(anyhow::anyhow!("语音消息管理器初始化失败: {}", e));
        }
    };

    // 创建WebSocket管理器
    let ws_manager = Arc::new(WebSocketManager::new(redis_manager.clone(), storage.clone()));

    // 初始化AI管理器
    let ai_manager = Arc::new(AIManager::new());
    info!("🤖 AI管理器初始化成功");

    // 初始化客服认证管理器
    let kefu_auth_manager = if let Some(pool_manager) = redis_manager.get_pool_manager() {
        let manager = KefuAuthManager::new(pool_manager);
        match manager.initialize_default_accounts().await {
            Ok(()) => {
                info!("🔐 客服认证管理器初始化成功");
                Arc::new(manager)
            }
            Err(e) => {
                error!("🔐 客服认证管理器初始化失败: {:?}", e);
                return Err(anyhow::anyhow!("客服认证管理器初始化失败: {}", e));
            }
        }
    } else {
        error!("🔐 Redis连接池未启用，无法初始化客服认证管理器");
        return Err(anyhow::anyhow!("Redis连接池未启用"));
    };

    // 企业级组件初始化 - 暂时禁用以修复编译
    // info!("🏢 开始初始化企业级组件...");
    info!("🏢 企业级组件暂时禁用，正在修复编译错误...");

    Ok(SystemComponents {
        redis_manager,
        storage,
        file_manager,
        html_manager,
        user_manager,
        voice_manager,
        ws_manager,
        ai_manager,
        kefu_auth_manager,
        // 企业级组件 - 暂时禁用
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
    // 启动心跳检查
    components.ws_manager.start_heartbeat_checker().await;
    info!("✅ 基于会话的在线状态检测已启用 - 基于活动时间判断");

    // 启动AI处理器
    match components.ai_manager.start_processing().await { Err(e) => {
        error!("🤖 AI处理器启动失败: {}", e);
    } _ => {
        info!("🤖 AI处理器已启动，开始处理任务队列");
    }}

    // 启动定期会话清理任务
    {
        let user_manager_clone = components.user_manager.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600)); // 每小时清理一次
            loop {
                interval.tick().await;
                info!("🧹 开始定期清理过期会话...");
                user_manager_clone.cleanup_expired_sessions().await;
            }
        });
        info!("✅ 会话清理任务已启动，每小时清理一次过期会话");
    }

    // 企业级组件启动 - 暂时禁用
    // info!("🏢 启动企业级后台任务...");
    // info!("✅ 企业级后台任务启动完成");
    info!("🏢 企业级后台任务暂时禁用");
}