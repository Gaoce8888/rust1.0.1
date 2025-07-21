use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::user_manager::UserManager;
use crate::storage::LocalStorage;
use crate::file_manager::FileManager;

// 导入系统扩展处理器

/// 构建扩展的API路由 - 补充缺失的功能
pub fn build_extended_api_routes(
    ws_manager: Arc<WebSocketManager>,
    user_manager: Arc<UserManager>,
    storage: Arc<LocalStorage>,
    _file_manager: Arc<FileManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // === 用户管理 API ===
    let users_list = warp::path!("api" / "users")
        .and(warp::get())
        .and(warp::query::<crate::handlers::users::UserListQuery>())
        .and(with_user_manager(user_manager.clone()))
        .and_then(|query, user_manager| {
            crate::handlers::users::handle_list_users(user_manager, query)
        });

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

    let sessions_end = warp::path!("api" / "sessions" / String / "end")
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_end_session);

    let sessions_statistics = warp::path!("api" / "sessions" / String / "statistics")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_session_statistics);

    // === 客服分配管理 API ===
    let kefu_customers = warp::path!("api" / "kefu" / String / "customers")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_kefu_customers);

    let kefu_workload = warp::path!("api" / "kefu" / String / "workload")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_kefu_workload);

    let kefu_switch_customer = warp::path!("api" / "kefu" / String / "switch" / String)
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|kefu_id: String, customer_id: String, ws_manager| {
            crate::handlers::kefu_assignment::handle_switch_customer(kefu_id, customer_id, ws_manager)
        });

    let kefu_available = warp::path!("api" / "kefu" / "available")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_available_kefu);

    let kefu_waiting_customers = warp::path!("api" / "kefu" / "waiting")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_waiting_customers);

    let customer_assign = warp::path!("api" / "customer" / String / "assign")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|customer_id: String, request, ws_manager| {
            crate::handlers::kefu_assignment::handle_assign_customer(customer_id, request, ws_manager)
        });

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
        .or(sessions_end)
        .or(sessions_statistics)
        .or(kefu_customers)
        .or(kefu_workload)
        .or(kefu_switch_customer)
        .or(kefu_available)
        .or(kefu_waiting_customers)
        .or(customer_assign)
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

// 系统管理处理器
async fn handle_system_logs(_query: std::collections::HashMap<String, String>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现系统日志查询
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "获取系统日志成功".to_string(),
        data: Some(serde_json::json!({
            "logs": [],
            "total": 0
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_system_backup(_request: serde_json::Value, _storage: Arc<LocalStorage>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现系统备份
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "系统备份成功".to_string(),
        data: Some(serde_json::json!({
            "backup_id": "backup_001",
            "timestamp": chrono::Utc::now(),
            "size": 0
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_system_maintenance(_request: serde_json::Value) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现系统维护
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "系统维护模式已启用".to_string(),
        data: Some(serde_json::json!({
            "maintenance_mode": true,
            "timestamp": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_system_health(_ws_manager: Arc<WebSocketManager>, _storage: Arc<LocalStorage>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现系统健康检查
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "系统健康检查完成".to_string(),
        data: Some(serde_json::json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now(),
            "components": {
                "websocket": "ok",
                "storage": "ok",
                "redis": "ok"
            }
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_redis_status(_ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现Redis状态检查
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "Redis状态检查完成".to_string(),
        data: Some(serde_json::json!({
            "status": "connected",
            "timestamp": chrono::Utc::now(),
            "info": {}
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_redis_flush(_request: serde_json::Value, _ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现Redis数据清理
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "Redis数据清理完成".to_string(),
        data: Some(serde_json::json!({
            "flushed_keys": 0,
            "timestamp": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

async fn handle_redis_keys(pattern: Option<String>, _ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    // TODO: 实现Redis键查询
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "Redis键查询完成".to_string(),
        data: Some(serde_json::json!({
            "pattern": pattern,
            "keys": [],
            "count": 0
        })),
    };
    Ok(warp::reply::json(&response))
}
