use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use warp::{Filter, Reply};
use warp::http::StatusCode;
use tracing::{info, warn, error};

use crate::auth::{KefuAuthManager, KefuLoginRequest, KefuLogoutRequest, KefuHeartbeatRequest};
use crate::redis_pool::RedisPoolManager;

/// API响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: u64,
    pub error_code: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: "Success".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            error_code: None,
        }
    }

    pub fn error(message: String, error_code: Option<String>) -> Self {
        Self {
            success: false,
            data: None,
            message,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            error_code,
        }
    }
}

/// 客服状态信息
#[derive(Debug, Serialize)]
pub struct KefuStatusInfo {
    pub kefu_id: String,
    pub username: String,
    pub real_name: String,
    pub is_online: bool,
    pub login_time: Option<chrono::DateTime<chrono::Utc>>,
    pub last_heartbeat: Option<chrono::DateTime<chrono::Utc>>,
    pub current_customers: u32,
    pub max_customers: u32,
}

/// 客服认证API路由管理器
pub struct KefuAuthApiRoutes {
    auth_manager: Arc<KefuAuthManager>,
}

impl KefuAuthApiRoutes {
    /// 创建新的客服认证API路由管理器
    pub fn new(redis_pool: Arc<RedisPoolManager>) -> Self {
        let auth_manager = Arc::new(KefuAuthManager::new(redis_pool));
        Self { auth_manager }
    }

    /// 使用现有的客服认证管理器创建API路由
    pub fn with_manager(auth_manager: Arc<KefuAuthManager>) -> Self {
        Self { auth_manager }
    }

    /// 创建客服认证API路由
    pub fn create_routes(
        &self,
    ) -> impl Filter<Extract = impl Reply, Error = warp::Rejection> + Clone {
        let auth_manager = self.auth_manager.clone();
        
        // 客服登录路由
        let login_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("login"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_kefu_login);

        // 客服下线路由
        let logout_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("logout"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_kefu_logout);

        // 客服心跳路由
        let heartbeat_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("heartbeat"))
            .and(warp::post())
            .and(warp::body::json())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_kefu_heartbeat);

        // 获取在线客服列表路由
        let online_list_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("online"))
            .and(warp::get())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_get_online_kefu);

        // 获取客服状态路由
        let status_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("status"))
            .and(warp::path::param())
            .and(warp::get())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_get_kefu_status);

        // 强制下线客服路由（管理员功能）
        let force_logout_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("force-logout"))
            .and(warp::path::param())
            .and(warp::post())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_force_kefu_logout);

        // 获取在线客服数量路由
        let count_route = warp::path("api")
            .and(warp::path("kefu"))
            .and(warp::path("count"))
            .and(warp::get())
            .and(with_auth_manager(auth_manager.clone()))
            .and_then(handle_get_online_count);

        // 合并所有路由
        login_route
            .or(logout_route)
            .or(heartbeat_route)
            .or(online_list_route)
            .or(status_route)
            .or(force_logout_route)
            .or(count_route)
    }
}

/// 依赖注入辅助函数
fn with_auth_manager(
    auth_manager: Arc<KefuAuthManager>,
) -> impl Filter<Extract = (Arc<KefuAuthManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || auth_manager.clone())
}

/// 处理客服登录
async fn handle_kefu_login(
    request: KefuLoginRequest,
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    info!("🔐 处理客服登录请求: {}", request.username);

    match auth_manager.kefu_login(request).await {
        Ok(response) => {
            if response.success {
                info!("✅ 客服登录成功: {}", response.kefu_info.as_ref().unwrap().username);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::success(response)),
                    StatusCode::OK,
                ))
            } else {
                warn!("❌ 客服登录失败: {}", response.message);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::<()>::error(response.message, response.error_code)),
                    StatusCode::BAD_REQUEST,
                ))
            }
        }
        Err(e) => {
            error!("💥 客服登录处理错误: {}", e);
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

/// 处理客服下线
async fn handle_kefu_logout(
    request: KefuLogoutRequest,
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    let kefu_id = request.kefu_id.clone();
    let session_id = request.session_id.clone();
    
    info!("🔴 处理客服下线请求: {} (session: {})", kefu_id, session_id);

    match auth_manager.kefu_logout(request).await {
        Ok(response) => {
            if response.success {
                info!("✅ 客服下线成功: {}", kefu_id);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::success(response)),
                    StatusCode::OK,
                ))
            } else {
                warn!("❌ 客服下线失败: {}", response.message);
                Ok(warp::reply::with_status(
                    warp::reply::json(&ApiResponse::<()>::error(response.message, response.error_code)),
                    StatusCode::BAD_REQUEST,
                ))
            }
        }
        Err(e) => {
            error!("💥 客服下线处理错误: {}", e);
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

/// 处理客服心跳
async fn handle_kefu_heartbeat(
    request: KefuHeartbeatRequest,
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    match auth_manager.kefu_heartbeat(request).await {
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
            error!("💥 客服心跳处理错误: {}", e);
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

/// 处理获取在线客服列表
async fn handle_get_online_kefu(
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    match auth_manager.get_online_kefu_list().await {
        Ok(online_kefu) => {
            let status_list: Vec<KefuStatusInfo> = online_kefu
                .into_iter()
                .map(|status| KefuStatusInfo {
                    kefu_id: status.kefu_id,
                    username: status.username,
                    real_name: status.real_name,
                    is_online: status.is_online,
                    login_time: Some(status.login_time),
                    last_heartbeat: Some(status.last_heartbeat),
                    current_customers: status.current_customers,
                    max_customers: status.max_customers,
                })
                .collect();

            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(status_list)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取在线客服列表错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取在线客服列表失败".to_string(),
                    Some("FETCH_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取客服状态
async fn handle_get_kefu_status(
    kefu_id: String,
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    match auth_manager.is_kefu_online(&kefu_id).await {
        Ok(is_online) => {
            let status_info = KefuStatusInfo {
                kefu_id: kefu_id.clone(),
                username: "".to_string(), // 需要从数据库获取
                real_name: "".to_string(), // 需要从数据库获取
                is_online,
                login_time: None,
                last_heartbeat: None,
                current_customers: 0,
                max_customers: 0,
            };

            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(status_info)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取客服状态错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取客服状态失败".to_string(),
                    Some("FETCH_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理强制下线客服
async fn handle_force_kefu_logout(
    kefu_id: String,
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    info!("🔴 强制下线客服: {}", kefu_id);

    match auth_manager.force_kefu_logout(&kefu_id).await {
        Ok(_) => {
            info!("✅ 强制下线客服成功: {}", kefu_id);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success("强制下线成功")),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 强制下线客服错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "强制下线失败".to_string(),
                    Some("FORCE_LOGOUT_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 处理获取在线客服数量
async fn handle_get_online_count(
    auth_manager: Arc<KefuAuthManager>,
) -> Result<impl Reply, warp::Rejection> {
    match auth_manager.get_online_kefu_count().await {
        Ok(count) => {
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(count)),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            error!("💥 获取在线客服数量错误: {}", e);
            Ok(warp::reply::with_status(
                warp::reply::json(&ApiResponse::<()>::error(
                    "获取在线客服数量失败".to_string(),
                    Some("COUNT_ERROR".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}