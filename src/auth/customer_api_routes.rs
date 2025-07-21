use anyhow::Result;
use serde::Serialize;
use std::sync::Arc;
use warp::{Filter, Reply};
use warp::http::StatusCode;
use tracing::{info, warn, error};

use crate::auth::{CustomerManager, CustomerConnectRequest, CustomerDisconnectRequest, CustomerHeartbeatRequest};
use crate::redis_pool::RedisPoolManager;
use crate::auth::api_routes::ApiResponse;

/// 客户状态信息
#[derive(Debug, Serialize)]
pub struct CustomerStatusInfo {
    pub customer_id: String,
    pub customer_name: String,
    pub is_connected: bool,
    pub assigned_kefu_id: Option<String>,
    pub connect_time: Option<chrono::DateTime<chrono::Utc>>,
    pub last_heartbeat: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
}

/// 客户API路由管理器
pub struct CustomerApiRoutes {
    customer_manager: Arc<CustomerManager>,
}

impl CustomerApiRoutes {
    /// 创建新的客户API路由管理器
    pub fn new(redis_pool: Arc<RedisPoolManager>, kefu_auth_manager: Arc<crate::auth::KefuAuthManager>) -> Self {
        let customer_manager = Arc::new(CustomerManager::new(redis_pool, kefu_auth_manager));
        Self { customer_manager }
    }

    /// 创建客户API路由
    pub fn create_routes(
        &self,
    ) -> impl Filter<Extract = impl Reply, Error = warp::Rejection> + Clone {
        let customer_manager = self.customer_manager.clone();
        
        // 客户连接路由
        let connect_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("connect"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_customer_connect);

        // 客户断开路由
        let disconnect_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("disconnect"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_customer_disconnect);

        // 客户心跳路由
        let heartbeat_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("heartbeat"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_customer_heartbeat);

        // 获取连接的客户列表路由
        let connected_list_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("connected"))
            .and(warp::get())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_get_connected_customers);

        // 获取客户状态路由
        let status_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("status"))
            .and(warp::path::param())
            .and(warp::get())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_get_customer_status);

        // 获取客服的客户列表路由
        let kefu_customers_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("kefu"))
            .and(warp::path::param())
            .and(warp::get())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_get_kefu_customers);

        // 获取连接的客户数量路由
        let count_route = warp::path("api")
            .and(warp::path("customer"))
            .and(warp::path("count"))
            .and(warp::get())
            .and(with_customer_manager(customer_manager.clone()))
            .and_then(handle_get_connected_count);

        // 合并所有路由
        connect_route
            .or(disconnect_route)
            .or(heartbeat_route)
            .or(connected_list_route)
            .or(status_route)
            .or(kefu_customers_route)
            .or(count_route)
    }
}

/// 依赖注入辅助函数
fn with_customer_manager(
    customer_manager: Arc<CustomerManager>,
) -> impl Filter<Extract = (Arc<CustomerManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || customer_manager.clone())
}

/// 处理客户连接
async fn handle_customer_connect(
    request: CustomerConnectRequest,
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    info!("🔗 处理客户连接请求: {} ({})", request.customer_name, request.customer_id);

    match customer_manager.customer_connect(request).await {
        Ok(response) => {
            if response.success {
                info!("✅ 客户连接成功: {}", response.assigned_kefu_id.as_ref().unwrap_or(&"等待分配".to_string()));
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::success(response)),
                    StatusCode::OK,
                ))
            } else {
                warn!("❌ 客户连接失败: {}", response.message);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::<()>::error(response.message, response.error_code)),
                    StatusCode::BAD_REQUEST,
                ))
            }
        }
        Err(e) => {
            error!("💥 客户连接处理错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "服务器内部错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理客户断开连接
async fn handle_customer_disconnect(
    request: CustomerDisconnectRequest,
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    let customer_id = request.customer_id.clone();
    let session_id = request.session_id.clone();
    
    info!("🔌 处理客户断开连接: {} (session: {})", customer_id, session_id);

    match customer_manager.customer_disconnect(request).await {
        Ok(response) => {
            if response.success {
                info!("✅ 客户断开连接成功: {}", customer_id);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::success(response)),
                    StatusCode::OK,
                ))
            } else {
                warn!("❌ 客户断开连接失败: {}", response.message);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::<()>::error(response.message, response.error_code)),
                    StatusCode::BAD_REQUEST,
                ))
            }
        }
        Err(e) => {
            error!("💥 客户断开连接处理错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "服务器内部错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理客户心跳
async fn handle_customer_heartbeat(
    request: CustomerHeartbeatRequest,
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    match customer_manager.customer_heartbeat(request).await {
        Ok(response) => {
            if response.success {
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::success(response)),
                    StatusCode::OK,
                ))
            } else {
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::<()>::error(response.message, response.error_code)),
                    StatusCode::BAD_REQUEST,
                ))
            }
        }
        Err(e) => {
            error!("💥 客户心跳处理错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "服务器内部错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取连接的客户列表
async fn handle_get_connected_customers(
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    match customer_manager.get_connected_customers().await {
        Ok(connected_customers) => {
            let status_list: Vec<CustomerStatusInfo> = connected_customers
                .into_iter()
                .map(|connection| CustomerStatusInfo {
                    customer_id: connection.customer_id,
                    customer_name: connection.customer_name,
                    is_connected: true,
                    assigned_kefu_id: connection.assigned_kefu_id,
                    connect_time: Some(connection.connect_time),
                    last_heartbeat: Some(connection.last_heartbeat),
                    status: match connection.status {
                        crate::auth::CustomerStatus::Waiting => "等待分配".to_string(),
                        crate::auth::CustomerStatus::Connected => "已连接".to_string(),
                        crate::auth::CustomerStatus::Disconnected => "已断开".to_string(),
                    },
                })
                .collect();

            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(status_list)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取连接的客户列表错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取连接的客户列表失败".to_string(),
                    Some("FETCH_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取客户状态
async fn handle_get_customer_status(
    customer_id: String,
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    match customer_manager.is_customer_connected(&customer_id).await {
        Ok(is_connected) => {
            let status_info = CustomerStatusInfo {
                customer_id: customer_id.clone(),
                customer_name: "".to_string(), // 需要从数据库获取
                is_connected,
                assigned_kefu_id: None,
                connect_time: None,
                last_heartbeat: None,
                status: if is_connected { "已连接".to_string() } else { "未连接".to_string() },
            };

            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(status_info)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取客户状态错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取客户状态失败".to_string(),
                    Some("FETCH_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取客服的客户列表
async fn handle_get_kefu_customers(
    kefu_id: String,
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    match customer_manager.get_kefu_customers(&kefu_id).await {
        Ok(customers) => {
            let status_list: Vec<CustomerStatusInfo> = customers
                .into_iter()
                .map(|connection| CustomerStatusInfo {
                    customer_id: connection.customer_id,
                    customer_name: connection.customer_name,
                    is_connected: true,
                    assigned_kefu_id: connection.assigned_kefu_id,
                    connect_time: Some(connection.connect_time),
                    last_heartbeat: Some(connection.last_heartbeat),
                    status: match connection.status {
                        crate::auth::CustomerStatus::Waiting => "等待分配".to_string(),
                        crate::auth::CustomerStatus::Connected => "已连接".to_string(),
                        crate::auth::CustomerStatus::Disconnected => "已断开".to_string(),
                    },
                })
                .collect();

            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(status_list)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取客服的客户列表错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取客服的客户列表失败".to_string(),
                    Some("FETCH_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取连接的客户数量
async fn handle_get_connected_count(
    customer_manager: Arc<CustomerManager>,
) -> Result<impl Reply, warp::Rejection> {
    match customer_manager.get_connected_customer_count().await {
        Ok(count) => {
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(count)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取连接的客户数量错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取连接的客户数量失败".to_string(),
                    Some("COUNT_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}