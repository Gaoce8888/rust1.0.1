use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::file_manager::FileManager;
use crate::user_manager::UserManager;
use crate::storage::LocalStorage;

// 导入系统扩展处理器
use crate::handlers::system_extended::*;

/// 构建扩展的API路由 - 补充缺失的功能
pub fn build_extended_api_routes(
    ws_manager: Arc<WebSocketManager>,
    user_manager: Arc<UserManager>,
    storage: Arc<LocalStorage>,
    _file_manager: Arc<FileManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // === 用户管理 API ===
    let users_list = warp::path!("api" / "users" / "list")
        .and(warp::get())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_list_users);

    let users_create = warp::path!("api" / "users" / "create")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_create_user);

    let users_get = warp::path!("api" / "users" / String)
        .and(warp::get())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_get_user);

    let users_update = warp::path!("api" / "users" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_user);

    let users_delete = warp::path!("api" / "users" / String)
        .and(warp::delete())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_delete_user);

    let users_permissions = warp::path!("api" / "users" / String / "permissions")
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_permissions);

    let users_status = warp::path!("api" / "users" / String / "status")
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_user_status);

    // === 消息管理 API ===
    let messages_list = warp::path!("api" / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_list_messages);

    let messages_get = warp::path!("api" / "messages" / String)
        .and(warp::get())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_get_message);

    let messages_search = warp::path!("api" / "messages" / "search")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_search_messages);

    let messages_export = warp::path!("api" / "messages" / "export")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_export_messages);

    let messages_delete = warp::path!("api" / "messages" / String)
        .and(warp::delete())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_delete_message);

    // === 会话管理 API ===
    let sessions_list = warp::path!("api" / "sessions" / "list")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_list_sessions);

    let sessions_get = warp::path!("api" / "sessions" / String)
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_get_session);

    let sessions_messages = warp::path!("api" / "sessions" / String / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::sessions::handle_get_session_messages);

    let sessions_transfer = warp::path!("api" / "sessions" / String / "transfer")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_transfer_session);

    // === 统计分析 API ===
    let analytics_overview = warp::path!("api" / "analytics" / "overview")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_overview);

    let analytics_messages = warp::path!("api" / "analytics" / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_messages);

    let analytics_users = warp::path!("api" / "analytics" / "users")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_users);

    let analytics_performance = warp::path!("api" / "analytics" / "performance")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_performance);

    // === 系统管理 API ===
    let system_logs = warp::path!("api" / "system" / "logs")
        .and(warp::get())
        .and(warp::query())
        .and_then(handle_system_logs);

    let system_backup = warp::path!("api" / "system" / "backup")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(handle_system_backup);

    let system_maintenance = warp::path!("api" / "system" / "maintenance")
        .and(warp::put())
        .and(warp::body::json())
        .and_then(handle_system_maintenance);

    let system_health = warp::path!("api" / "system" / "health")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(handle_system_health);

    // === Redis管理 API ===
    let redis_status = warp::path!("api" / "redis" / "status")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(handle_redis_status);

    let redis_flush = warp::path!("api" / "redis" / "flush")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(handle_redis_flush);

    let redis_keys = warp::path!("api" / "redis" / "keys")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|query: std::collections::HashMap<String, String>, ws_manager| {
            let pattern = query.get("pattern").cloned();
            handle_redis_keys(pattern, ws_manager)
        });

    // 组合所有路由
    users_list
        .or(users_create)
        .or(users_get)
        .or(users_update)
        .or(users_delete)
        .or(users_permissions)
        .or(users_status)
        .or(messages_list)
        .or(messages_get)
        .or(messages_search)
        .or(messages_export)
        .or(messages_delete)
        .or(sessions_list)
        .or(sessions_get)
        .or(sessions_messages)
        .or(sessions_transfer)
        .or(analytics_overview)
        .or(analytics_messages)
        .or(analytics_users)
        .or(analytics_performance)
        .or(system_logs)
        .or(system_backup)
        .or(system_maintenance)
        .or(system_health)
        .or(redis_status)
        .or(redis_flush)
        .or(redis_keys)
}

// Helper functions
fn with_ws_manager(ws_manager: Arc<WebSocketManager>) -> impl Filter<Extract = (Arc<WebSocketManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || ws_manager.clone())
}

fn with_user_manager(user_manager: Arc<UserManager>) -> impl Filter<Extract = (Arc<UserManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || user_manager.clone())
}

fn with_storage(storage: Arc<LocalStorage>) -> impl Filter<Extract = (Arc<LocalStorage>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || storage.clone())
}
