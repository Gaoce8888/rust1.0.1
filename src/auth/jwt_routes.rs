use std::sync::Arc;
use warp::{Filter, Reply, Rejection};
use serde_json::json;
use crate::auth::jwt_auth::{JwtAuthManager, LoginRequest, LoginResponse};
use crate::types::api::{ApiResponse, ApiError};

/// 构建JWT认证路由
pub fn build_jwt_auth_routes(
    auth_manager: Arc<JwtAuthManager>,
) -> impl Filter<Extract = (impl Reply,), Error = Rejection> + Clone {
    let auth_manager_clone = auth_manager.clone();
    
    // 登录路由
    let login_route = warp::path("auth")
        .and(warp::path("login"))
        .and(warp::post())
        .and(warp::body::json())
        .and(with_auth_manager(auth_manager.clone()))
        .and_then(handle_login);

    // 登出路由
    let logout_route = warp::path("auth")
        .and(warp::path("logout"))
        .and(warp::post())
        .and(extract_token())
        .and(with_auth_manager(auth_manager.clone()))
        .and_then(handle_logout);

    // 验证token路由
    let validate_route = warp::path("auth")
        .and(warp::path("validate"))
        .and(warp::get())
        .and(extract_token())
        .and(with_auth_manager(auth_manager.clone()))
        .and_then(handle_validate_token);

    // 获取在线用户列表路由
    let online_users_route = warp::path("auth")
        .and(warp::path("online"))
        .and(warp::get())
        .and(warp::query())
        .and(with_auth_manager(auth_manager.clone()))
        .and_then(handle_get_online_users);

    // 心跳检测路由
    let heartbeat_route = warp::path("auth")
        .and(warp::path("heartbeat"))
        .and(warp::post())
        .and(extract_token())
        .and(with_auth_manager(auth_manager))
        .and_then(handle_heartbeat);

    login_route
        .or(logout_route)
        .or(validate_route)
        .or(online_users_route)
        .or(heartbeat_route)
}

/// 登录处理器
async fn handle_login(
    request: LoginRequest,
    auth_manager: Arc<JwtAuthManager>,
) -> Result<impl Reply, Rejection> {
    match auth_manager.login(request).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                message: "登录成功".to_string(),
                data: Some(json!(response)),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            let api_response = ApiResponse {
                success: false,
                message: e.message,
                data: None,
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

/// 登出处理器
async fn handle_logout(
    token: String,
    auth_manager: Arc<JwtAuthManager>,
) -> Result<impl Reply, Rejection> {
    // 验证token获取用户ID
    let claims = auth_manager.verify_token(&token).await
        .map_err(|e| warp::reject::custom(e))?;

    // 执行登出
    match auth_manager.logout(&claims.sub).await {
        Ok(_) => {
            let api_response = ApiResponse {
                success: true,
                message: "登出成功".to_string(),
                data: None,
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            let api_response = ApiResponse {
                success: false,
                message: e.message,
                data: None,
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

/// 验证token处理器
async fn handle_validate_token(
    token: String,
    auth_manager: Arc<JwtAuthManager>,
) -> Result<impl Reply, Rejection> {
    match auth_manager.verify_token(&token).await {
        Ok(claims) => {
            let api_response = ApiResponse {
                success: true,
                message: "token有效".to_string(),
                data: Some(json!({
                    "user_id": claims.sub,
                    "username": claims.username,
                    "user_type": claims.user_type,
                    "expires_at": claims.exp
                })),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            let api_response = ApiResponse {
                success: false,
                message: e.message,
                data: None,
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

/// 获取在线用户列表处理器
async fn handle_get_online_users(
    query: std::collections::HashMap<String, String>,
    auth_manager: Arc<JwtAuthManager>,
) -> Result<impl Reply, Rejection> {
    let user_type = query.get("user_type").map(|s| s.as_str());
    let online_users = auth_manager.get_online_users(user_type).await;

    let api_response = ApiResponse {
        success: true,
        message: "获取在线用户列表成功".to_string(),
        data: Some(json!({
            "users": online_users,
            "total": online_users.len()
        })),
    };
    Ok(warp::reply::json(&api_response))
}

/// 心跳检测处理器
async fn handle_heartbeat(
    token: String,
    auth_manager: Arc<JwtAuthManager>,
) -> Result<impl Reply, Rejection> {
    // 验证token并更新活动时间
    match auth_manager.verify_token(&token).await {
        Ok(claims) => {
            let api_response = ApiResponse {
                success: true,
                message: "心跳检测成功".to_string(),
                data: Some(json!({
                    "user_id": claims.sub,
                    "timestamp": chrono::Utc::now().timestamp()
                })),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            let api_response = ApiResponse {
                success: false,
                message: e.message,
                data: None,
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

/// 从请求头提取token的过滤器
fn extract_token() -> impl Filter<Extract = (String,), Error = Rejection> + Clone {
    warp::header::<String>("authorization")
        .and_then(|auth_header: String| async move {
            if auth_header.starts_with("Bearer ") {
                Ok(auth_header[7..].to_string())
            } else {
                Err(warp::reject::custom(ApiError::new(
                    "无效的Authorization头".to_string(),
                    Some(401)
                )))
            }
        })
}

/// 注入认证管理器的过滤器
fn with_auth_manager(
    auth_manager: Arc<JwtAuthManager>,
) -> impl Filter<Extract = (Arc<JwtAuthManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || auth_manager.clone())
}