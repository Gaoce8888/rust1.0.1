// 原始模块暂时禁用
// pub mod api;
// pub mod auth;
pub mod frontend;
pub mod websocket;
pub mod swagger;

// 简化版本的路由模块
pub mod api_simple;
pub mod auth_simple;

// 扩展API路由模块
pub mod api_extended;
pub mod api_real;

// 客服认证路由模块
pub mod kefu_auth;

use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::file_manager::FileManager;
use crate::html_template_manager::HtmlTemplateManager;
use crate::user_manager::UserManager;
use crate::voice_message::VoiceMessageManager;
use crate::storage::LocalStorage;
use crate::ai::AIManager;
use crate::handlers::ai::AIHandler;
use crate::auth::kefu_auth::KefuAuthManager;
// Temporarily disabled enterprise modules for compilation
// use crate::load_balancer::LoadBalancer;
// use crate::websocket_pool::WebSocketConnectionPool;
// use crate::api_routes::ApiRoutes;
// use crate::http_fallback::HttpFallbackManager;
// use crate::auto_upgrade::AutoUpgradeManager;
// use crate::performance_optimizer::PerformanceOptimizer;
// use crate::health_monitor::HealthMonitor;
// use crate::failover_manager::FailoverManager;

/// 构建所有路由
pub fn build_all_routes(
    ws_manager: Arc<WebSocketManager>,
    file_manager: Arc<FileManager>,
    html_manager: Arc<HtmlTemplateManager>,
    user_manager: Arc<UserManager>,
    voice_manager: Arc<VoiceMessageManager>,
    storage: Arc<LocalStorage>,
    ai_manager: Arc<AIManager>,
    kefu_auth_manager: Arc<KefuAuthManager>,
    _load_balancer: Option<()>, // placeholder
    _websocket_pool: Option<()>, // placeholder
    _api_routes: Option<()>, // placeholder
    _http_fallback: Option<()>, // placeholder
    _auto_upgrade: Option<()>, // placeholder
    _performance_optimizer: Option<()>, // placeholder
    _health_monitor: Option<()>, // placeholder
    _failover_manager: Option<()>, // placeholder
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 构建各个路由模块（使用简化版本）
    let auth_routes = auth_simple::build_auth_routes(user_manager.clone());
    let simple_api_routes = api_simple::build_api_routes(ws_manager.clone(), file_manager.clone(), html_manager.clone(), voice_manager.clone(), storage.clone());
    
    // 扩展的API路由
    let extended_api_routes = api_extended::build_extended_api_routes(
        ws_manager.clone(),
        user_manager.clone(),
        storage.clone(),
        file_manager.clone(),
    );
    
    // 真实的文件管理API路由
    let real_file_api_routes = api_real::build_real_file_api_routes(
        file_manager.clone(),
    );
    
    let websocket_routes = websocket::build_websocket_routes(ws_manager.clone(), kefu_auth_manager.clone());
    let frontend_routes = frontend::build_frontend_routes();
    
    // Swagger路由应该在最前面，避免被其他路由拦截
    let swagger_routes = swagger::build_swagger_routes();
    
    // AI路由
    let ai_handler = AIHandler::new(ai_manager.clone());
    let ai_routes = ai_handler.routes();
    
    // 客服认证路由
    let kefu_auth_routes = kefu_auth::build_kefu_auth_routes(kefu_auth_manager.clone());
    
    // 企业级路由 - 暂时禁用
    // let enterprise_routes = None;
    // let enterprise_health_routes = None;
    // let performance_routes = None;
    // let failover_routes = None;
    
    // 简单的健康检查路由
    let health_route = warp::path("health").and(warp::get()).map(|| {
        tracing::info!("✅ 健康检查路由被访问");
        warp::reply::json(&serde_json::json!({"status": "ok"}))
    });

    // favicon.ico 路由 - 避免404错误
    let favicon_route = warp::path("favicon.ico").and(warp::get()).map(|| {
        tracing::info!("🎯 Favicon请求");
        warp::reply::with_header(
            warp::reply::with_status(
                "",
                warp::http::StatusCode::NO_CONTENT
            ),
            "Content-Type",
            "image/x-icon"
        )
    });

    // 组合所有路由 - 注意顺序很重要！
    health_route
        .or(favicon_route)
        // 2. Swagger路由应该在API路由之前
        .or(swagger_routes)
        // 3. 认证路由
        .or(auth_routes)
        // 4. 客服认证路由
        .or(kefu_auth_routes)
        // 5. AI路由
        .or(ai_routes)
        // 6. API路由
        .or(simple_api_routes)
        .or(extended_api_routes)
        .or(real_file_api_routes)
        // 7. WebSocket路由
        .or(websocket_routes)
        // 8. 前端路由（静态文件）放在最后
        .or(frontend_routes)
}
