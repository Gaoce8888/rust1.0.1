use std::sync::Arc;
use warp::Filter;
use crate::user_manager::{UserManager, LoginRequest};
use crate::auth::middleware::extract_user_info;
use crate::handlers::auth::*;

/// 构建认证路由
pub fn build_auth_routes(
    user_manager: Arc<UserManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 登录路由
    let user_manager_login = user_manager.clone();
    let login_route = warp::path!("auth" / "login")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(move |login_req: LoginRequest| {
            let user_manager = user_manager_login.clone();
            async move { handle_login(login_req, user_manager).await }
        });

    // 强制登录路由
    let user_manager_force_login = user_manager.clone();
    let force_login_route = warp::path!("auth" / "force-login")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(move |login_req: LoginRequest| {
            let user_manager = user_manager_force_login.clone();
            async move { handle_force_login(login_req, user_manager).await }
        });

    // 登出路由
    let user_manager_logout = user_manager.clone();
    let logout_route = warp::path!("auth" / "logout")
        .and(warp::post())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and_then(move |query: std::collections::HashMap<String, String>| {
            let user_manager = user_manager_logout.clone();
            async move { 
                if let Some(session_id) = query.get("session_id") {
                    handle_logout(session_id.clone(), user_manager).await
                } else {
                    let response = crate::types::api::SuccessResponse {
                        success: true,
                        message: "登出成功".to_string(),
                    };
                    Ok::<_, warp::Rejection>(warp::reply::json(&response))
                }
            }
        });

    // 会话验证路由
    let user_manager_validate = user_manager.clone();
    let validate_route = warp::path!("auth" / "validate")
        .and(warp::get())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and_then(move |query: std::collections::HashMap<String, String>| {
            let user_manager = user_manager_validate.clone();
            async move { 
                if let Some(session_id) = query.get("session_id") {
                    handle_validate_session(session_id.clone(), user_manager).await
                } else {
                    let response = crate::types::api::ApiResponse {
                        success: true,
                        message: "会话验证成功".to_string(),
                        data: Some(serde_json::json!({"valid": false, "reason": "missing_session_id"})),
                    };
                    Ok::<_, warp::Rejection>(warp::reply::json(&response))
                }
            }
        });

    // 会话列表路由
    let user_manager_sessions = user_manager.clone();
    let sessions_route = warp::path!("auth" / "sessions")
        .and(warp::get())
        .and_then(move || {
            let user_manager = user_manager_sessions.clone();
            async move { handle_get_sessions(user_manager).await }
        });

    // 心跳检测路由
    let user_manager_heartbeat = user_manager.clone();
    let heartbeat_route = warp::path!("auth" / "heartbeat")
        .and(warp::post())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and_then(move |query: std::collections::HashMap<String, String>| {
            let user_manager = user_manager_heartbeat.clone();
            async move { 
                if let Some(session_id) = query.get("session_id") {
                    handle_heartbeat(session_id.clone(), user_manager).await
                } else {
                    let response = crate::types::api::ApiError {
                        success: false,
                        message: "会话ID无效".to_string(),
                        code: Some(400),
                        details: None,
                    };
                    Ok::<_, warp::Rejection>(warp::reply::with_status(
                        warp::reply::json(&response),
                        warp::http::StatusCode::BAD_REQUEST,
                    ))
                }
            }
        });

    // 实时检查路由
    let realtime_check_route = warp::path!("auth" / "realtime-check" / String)
        .and(warp::get())
        .and_then(|username: String| async move {
            handle_realtime_check(username).await
        });

    // 用户在线信息路由
    let user_online_info_route = warp::path!("auth" / "user-online-info" / String)
        .and(warp::get())
        .and(extract_user_info())
        .and_then(|username: String, user_info| async move {
            handle_user_online_info(username, user_info).await
        });

    // 组合所有路由
    login_route
        .or(force_login_route)
        .or(logout_route)
        .or(validate_route)
        .or(sessions_route)
        .or(heartbeat_route)
        .or(realtime_check_route)
        .or(user_online_info_route)
} 