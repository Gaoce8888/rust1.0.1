use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::user_manager::UserManager;
use crate::storage::LocalStorage;

/// 构建完整的API路由 - 集成所有未使用的处理器
pub fn build_complete_api_routes(
    ws_manager: Arc<WebSocketManager>,
    _user_manager: Arc<UserManager>,
    storage: Arc<LocalStorage>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // === 系统信息和健康检查 ===
    let system_info = warp::path!("api" / "system" / "info")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_system_info);

    let system_health_check = warp::path!("api" / "system" / "health")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::system::handle_system_health);

    let online_users = warp::path!("api" / "system" / "online-users")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_online_users);

    // === 高级消息功能 ===
    let bulk_delete_messages = warp::path!("api" / "messages" / "bulk-delete")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_bulk_delete_messages);

    let mark_messages_read = warp::path!("api" / "messages" / "mark-read")
        .and(warp::put())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_mark_messages_read);

    // === 高级会话功能 ===
    let end_session = warp::path!("api" / "sessions" / String / "end")
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_end_session);

    let session_statistics = warp::path!("api" / "sessions" / "statistics")
        .and(warp::get())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::sessions::handle_session_statistics);

    // === 客户匹配客服 ===
    let customer_request_kefu = warp::path!("api" / "customer" / "request-kefu")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(handle_customer_request_kefu);

    let customer_info = warp::path!("api" / "customer" / "info" / String)
        .and(warp::get())
        .and_then(handle_customer_info);

    // === 报表和分析 ===
    let generate_report = warp::path!("api" / "analytics" / "report")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_generate_report);

    let business_insights = warp::path!("api" / "analytics" / "insights")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_business_insights);

    // === WebSocket统计 ===
    let websocket_stats = warp::path!("api" / "stats" / "websocket")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|ws_manager: Arc<WebSocketManager>| async move {
            let stats = ws_manager.get_connection_stats().await;
            Ok::<_, warp::Rejection>(warp::reply::json(&stats))
        });

    // === 实时连接管理 ===
    let connection_list = warp::path!("api" / "connections" / "list")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_list_connections);

    let connection_details = warp::path!("api" / "connections" / String)
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_connection_details);

    let disconnect_user = warp::path!("api" / "connections" / String / "disconnect")
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_disconnect_user);

    // === 性能监控 ===
    let performance_metrics = warp::path!("api" / "metrics" / "performance")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_performance_metrics);

    let resource_usage = warp::path!("api" / "metrics" / "resources")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::system::handle_resource_usage);

    // 组合所有路由
    system_info
        .or(system_health_check)
        .or(online_users)
        .or(bulk_delete_messages)
        .or(mark_messages_read)
        .or(end_session)
        .or(session_statistics)
        .or(customer_request_kefu)
        .or(customer_info)
        .or(generate_report)
        .or(business_insights)
        .or(websocket_stats)
        .or(connection_list)
        .or(connection_details)
        .or(disconnect_user)
        .or(performance_metrics)
        .or(resource_usage)
}

// Helper functions
fn with_ws_manager(ws_manager: Arc<WebSocketManager>) -> impl Filter<Extract = (Arc<WebSocketManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || ws_manager.clone())
}

fn with_storage(
    storage: Arc<LocalStorage>,
) -> impl Filter<Extract = (Arc<LocalStorage>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || storage.clone())
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct CustomerRequestKefuPayload {
    customer_id: String,
    customer_name: String,
    issue_type: Option<String>,
}

#[derive(Debug, Serialize)]
struct CustomerRequestKefuResponse {
    success: bool,
    message: String,
    kefu_id: Option<String>,
    kefu_name: Option<String>,
    queue_position: Option<usize>,
}

/// 处理客户请求客服
async fn handle_customer_request_kefu(
    payload: CustomerRequestKefuPayload,
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("🙋 客户 {} 请求分配客服", payload.customer_id);

    // TODO: 实际应该调用客服分配系统
    // 这里暂时返回模拟数据
    let response = CustomerRequestKefuResponse {
        success: true,
        message: "客服分配成功".to_string(),
        kefu_id: Some("kefu001".to_string()),
        kefu_name: Some("客服小王".to_string()),
        queue_position: None,
    };

    Ok(warp::reply::json(&response))
}

/// 获取客户信息
async fn handle_customer_info(
    customer_id: String,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("📋 获取客户信息: {}", customer_id);

    // 返回模拟的客户信息
    let customer_info = serde_json::json!({
        "success": true,
        "data": {
            "customer_id": customer_id,
            "name": "测试客户",
            "created_time": chrono::Utc::now().to_rfc3339(),
            "last_active": chrono::Utc::now().to_rfc3339(),
            "total_sessions": 5,
            "assigned_kefu": null
        }
    });

    Ok(warp::reply::json(&customer_info))
}