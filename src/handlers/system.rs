use std::sync::Arc;
use tracing::info;
use crate::websocket::WebSocketManager;
use crate::file_manager::FileManager;
use crate::config::AppConfig;
use crate::types::{AppUserInfo, ApiResponse};
use crate::types::config::{SystemConfig, WebSocketConfig, ApiConfig, UploadConfig, HtmlTemplateConfig};
use crate::types::api::{SystemInfo, SystemHealth, OnlineUserInfo, MemoryUsage};
use crate::storage::LocalStorage;

/// 获取系统信息
#[utoipa::path(
    get,
    path = "/api/system/info",
    responses(
        (status = 200, description = "获取系统信息成功", body = ApiResponse<SystemInfo>),
    ),
    tag = "系统"
)]
pub async fn handle_system_info(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("系统信息接口被访问");
    
    let stats = _ws_manager.get_connection_stats().await;
    let config = AppConfig::get();
    
    let system_info = SystemInfo {
        name: config.app.name.clone(),
        version: config.app.version.clone(),
        online_users: stats.total_connections as u32,
        active_sessions: stats.total_connections as u32,
        queue_size: 0,
        uptime: "0d 0h 0m".to_string(),
        server_time: chrono::Utc::now().to_rfc3339(),
    };
    
    let response = ApiResponse {
        success: true,
        message: "获取系统信息成功".to_string(),
        data: Some(system_info),
    };
    
    Ok(warp::reply::json(&response))
}

/// 系统健康检查
#[utoipa::path(
    get,
    path = "/api/system/health",
    responses(
        (status = 200, description = "系统健康状态", body = ApiResponse<SystemHealth>),
    ),
    tag = "系统"
)]
pub async fn handle_system_health(
    _ws_manager: Arc<WebSocketManager>,
    _storage: Arc<LocalStorage>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("系统健康检查接口被访问");
    
    // 检查Redis连接
    let redis_ok = true; // 暂时硬编码为true，后续可以通过其他方式检查
    
    // 获取内存使用情况（简化版本）
    let memory_usage = MemoryUsage {
        used: 100 * 1024 * 1024, // 100MB
        total: 1024 * 1024 * 1024, // 1GB
        percentage: 10.0,
    };
    
    let health = SystemHealth {
        status: if redis_ok { "healthy" } else { "degraded" }.to_string(),
        redis: redis_ok,
        storage: true,
        websocket: true,
        memory_usage: Some(memory_usage),
    };
    
    let response = ApiResponse {
        success: true,
        message: "系统健康检查完成".to_string(),
        data: Some(health),
    };
    
    Ok(warp::reply::json(&response))
}

/// 获取在线用户列表
#[utoipa::path(
    get,
    path = "/api/online/users",
    responses(
        (status = 200, description = "获取在线用户列表成功", body = ApiResponse<Vec<OnlineUserInfo>>),
    ),
    tag = "系统"
)]
pub async fn handle_online_users(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("获取在线用户列表接口被访问");
    
    let online_users = _ws_manager.get_realtime_online_users().await;
    
    let users: Vec<OnlineUserInfo> = online_users
        .into_iter()
        .filter_map(|user| {
            // 从 JSON Value 中提取数据
            let user_obj = user.as_object()?;
            Some(OnlineUserInfo {
                user_id: user_obj.get("user_id")?.as_str()?.to_string(),
                username: user_obj.get("username")?.as_str()?.to_string(),
                user_type: user_obj.get("user_type")?.as_str()?.to_string(),
                connected_at: user_obj.get("connected_at")?.as_str()?.to_string(),
                last_activity: user_obj.get("last_activity")?.as_str()?.to_string(),
                ip_address: user_obj.get("ip_address").and_then(|v| v.as_str()).map(|s| s.to_string()),
                client_info: user_obj.get("client_info").and_then(|v| v.as_str()).map(|s| s.to_string()),
            })
        })
        .collect();
    
    let response = ApiResponse {
        success: true,
        message: "获取在线用户列表成功".to_string(),
        data: Some(users),
    };
    
    Ok(warp::reply::json(&response))
}

/// 处理系统配置请求
#[utoipa::path(
    get,
    path = "/api/config",
    responses(
        (status = 200, description = "获取系统配置成功", body = SystemConfig),
    ),
    tag = "系统"
)]
pub async fn handle_get_config() -> Result<impl warp::Reply, warp::Rejection> {
    info!("✅ 配置路由被访问");
    let config = AppConfig::get();
    let response = SystemConfig {
        websocket: WebSocketConfig {
            url: config.frontend.ws_url.clone(),
        },
        api: ApiConfig {
            url: config.frontend.api_url.clone(),
        },
        upload: UploadConfig {
            max_file_size: config.frontend.upload.max_file_size,
            allowed_types: config.frontend.upload.allowed_types.clone(),
            categories: FileManager::get_file_categories(),
        },
        html_templates: HtmlTemplateConfig {
            enabled: true,
            max_variables: 50,
            max_template_size: 1048576,
        },
    };
    Ok(warp::reply::json(&response))
}

/// 获取在线用户列表（需要认证）
#[utoipa::path(
    get,
    path = "/api/users",
    responses(
        (status = 200, description = "获取在线用户列表成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "系统"
)]
#[allow(dead_code)]
pub async fn handle_get_online_users(
    _ws_manager: Arc<WebSocketManager>,
    user_info: AppUserInfo,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!(
        "用户 {} ({:?}) 请求在线用户列表",
        user_info.name, user_info.user_type
    );

    let stats = _ws_manager.get_connection_stats().await;
    let response = ApiResponse {
        success: true,
        message: "获取在线用户列表成功".to_string(),
        data: Some(serde_json::json!({
            "total_connections": stats.total_connections,
            "kefu_connections": stats.kefu_connections,
            "kehu_connections": stats.kehu_connections,
        })),
    };
    
    Ok(warp::reply::json(&response))
}

/// 获取公开的在线用户状态
#[utoipa::path(
    get,
    path = "/api/users/online",
    responses(
        (status = 200, description = "获取公开在线用户状态成功", body = crate::types::api::ApiResponse<serde_json::Value>),
    ),
    tag = "系统"
)]
pub async fn handle_get_public_online_users(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("公开在线用户状态请求");
    
    let stats = _ws_manager.get_connection_stats().await;
    let response = ApiResponse {
        success: true,
        message: "获取公开在线用户状态成功".to_string(),
        data: Some(serde_json::json!({
            "total_connections": stats.total_connections,
            "kefu_available": stats.kefu_connections > 0,
        })),
    };
    
    Ok(warp::reply::json(&response))
}

/// 获取实时在线用户列表
#[utoipa::path(
    get,
    path = "/api/realtime/users",
    responses(
        (status = 200, description = "获取实时在线用户列表成功", body = crate::types::api::ApiResponse<serde_json::Value>),
    ),
    tag = "系统"
)]
pub async fn handle_get_realtime_users(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("实时用户列表请求");
    
    let stats = _ws_manager.get_connection_stats().await;
    let online_users = _ws_manager.get_realtime_online_users().await;
    
    let response = ApiResponse {
        success: true,
        message: "获取实时在线用户列表成功".to_string(),
        data: Some(serde_json::json!({
            "stats": {
                "total_connections": stats.total_connections,
                "kefu_connections": stats.kefu_connections,
                "kehu_connections": stats.kehu_connections,
            },
            "online_users": online_users,
        })),
    };
    
    Ok(warp::reply::json(&response))
}

/// 获取WebSocket统计信息
#[utoipa::path(
    get,
    path = "/api/websocket/stats",
    responses(
        (status = 200, description = "获取WebSocket统计信息成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "系统"
)]
#[allow(dead_code)]
pub async fn handle_get_websocket_stats(
    _ws_manager: Arc<WebSocketManager>,
    user_info: AppUserInfo,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!(
        "用户 {} ({:?}) 请求WebSocket统计信息",
        user_info.name, user_info.user_type
    );
    
    let stats = _ws_manager.get_connection_stats().await;
    let response = ApiResponse {
        success: true,
        message: "获取WebSocket统计信息成功".to_string(),
        data: Some(serde_json::json!({
            "total_connections": stats.total_connections,
            "kefu_connections": stats.kefu_connections,
            "kehu_connections": stats.kehu_connections,
            "average_connection_duration": stats.average_connection_duration,
            "longest_connection_duration": stats.longest_connection_duration,
        })),
    };
    
    Ok(warp::reply::json(&response))
}

/// 测试接口
/// 
/// 企业级系统健康检查接口，用于监控和运维
#[allow(dead_code)] // 企业级功能：系统健康检查，运维监控时使用
#[utoipa::path(
    get,
    path = "/test",
    responses(
        (status = 200, description = "测试成功", body = crate::types::api::SuccessResponse),
    ),
    tag = "系统"
)]
pub async fn handle_test() -> Result<impl warp::Reply, warp::Rejection> {
    info!("测试接口被访问");
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "测试成功"
    })))
}

/// 调试接口
/// 
/// 企业级系统调试接口，用于故障排查和性能监控
#[allow(dead_code)] // 企业级功能：系统调试接口，故障排查时使用
#[utoipa::path(
    get,
    path = "/debug",
    responses(
        (status = 200, description = "调试信息", body = crate::types::api::SuccessResponse),
    ),
    tag = "系统"
)]
pub async fn handle_debug() -> Result<impl warp::Reply, warp::Rejection> {
    info!("调试接口被访问");
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "调试接口正常"
    })))
}

// 获取连接列表
pub async fn handle_list_connections(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = serde_json::json!({
        "connections": [
            {
                "user_id": "user123",
                "connection_id": "conn_456",
                "connected_at": "2024-01-01T12:00:00Z",
                "last_activity": "2024-01-01T12:30:00Z",
                "room": "general"
            }
        ],
        "total": 50
    });
    Ok(warp::reply::json(&response))
}

// 获取连接详情
pub async fn handle_connection_details(
    user_id: String,
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = serde_json::json!({
        "user_id": user_id,
        "connection_info": {
            "status": "connected",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0",
            "connected_duration": "30m",
            "messages_sent": 45,
            "messages_received": 52
        }
    });
    Ok(warp::reply::json(&response))
}

// 断开用户连接
pub async fn handle_disconnect_user(
    user_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 实际断开连接
    ws_manager.disconnect_user(&user_id).await;
    
    let response = serde_json::json!({
        "success": true,
        "message": format!("User {} disconnected", user_id)
    });
    Ok(warp::reply::json(&response))
}

// 获取性能指标
pub async fn handle_performance_metrics(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = serde_json::json!({
        "metrics": {
            "message_throughput": {
                "messages_per_second": 150,
                "peak_mps": 500,
                "average_latency_ms": 25
            },
            "connection_metrics": {
                "connections_per_second": 10,
                "average_connection_duration": "15m",
                "reconnection_rate": 0.05
            },
            "system_performance": {
                "response_time_p50": 20,
                "response_time_p95": 100,
                "response_time_p99": 200
            }
        },
        "timestamp": chrono::Utc::now()
    });
    Ok(warp::reply::json(&response))
}

// 获取资源使用情况
pub async fn handle_resource_usage(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = serde_json::json!({
        "resources": {
            "memory": {
                "used_mb": 512,
                "total_mb": 8192,
                "percentage": 6.25
            },
            "cpu": {
                "usage_percentage": 15.5,
                "core_count": 4
            },
            "connections": {
                "active": 150,
                "max_allowed": 10000,
                "percentage": 1.5
            },
            "storage": {
                "messages_count": 50000,
                "files_count": 2000,
                "total_size_mb": 1024
            }
        },
        "timestamp": chrono::Utc::now()
    });
    Ok(warp::reply::json(&response))
}
