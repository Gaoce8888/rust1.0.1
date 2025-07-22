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
use crate::auth::{CustomerManager, CustomerApiRoutes};
use crate::redis_pool::RedisPoolManager;

/// 路由构建器配置结构体
pub struct RouteBuilderConfig {
    pub ws_manager: Arc<WebSocketManager>,
    pub file_manager: Arc<FileManager>,
    pub html_manager: Arc<HtmlTemplateManager>,
    pub user_manager: Arc<UserManager>,
    pub voice_manager: Arc<VoiceMessageManager>,
    pub storage: Arc<LocalStorage>,
    pub ai_manager: Arc<AIManager>,
    #[allow(dead_code)]
    pub customer_manager: Arc<CustomerManager>,
    pub redis_pool: Arc<RedisPoolManager>,
}

/// 构建所有路由
pub fn build_all_routes(config: RouteBuilderConfig) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 构建各个路由模块（使用简化版本）
    let auth_routes = auth_simple::build_auth_routes(config.user_manager.clone());
    let simple_api_routes = api_simple::build_api_routes(config.ws_manager.clone(), config.file_manager.clone(), config.html_manager.clone(), config.voice_manager.clone(), config.storage.clone());
    
    // 扩展的API路由
    let extended_api_routes = api_extended::build_extended_api_routes(
        config.ws_manager.clone(),
        config.user_manager.clone(),
        config.storage.clone(),
        config.file_manager.clone(),
    );
    
    // 真实的文件管理API路由
    let real_file_api_routes = api_real::build_real_file_api_routes(
        config.file_manager.clone(),
    );
    
    let websocket_routes = websocket::build_websocket_routes(config.ws_manager.clone());
    let frontend_routes = frontend::build_frontend_routes();
    
    // Swagger路由应该在最前面，避免被其他路由拦截
    let swagger_routes = swagger::build_swagger_routes();
    
    // AI路由
    let ai_handler = AIHandler::new(config.ai_manager.clone());
    let ai_routes = ai_handler.routes();
    
    // 客户管理API路由
    let customer_api_routes = CustomerApiRoutes::new(config.redis_pool.clone()).create_routes();
    
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
        // 4. 客户管理API路由
        .or(customer_api_routes)
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
