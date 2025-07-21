#![allow(dead_code)]

use std::sync::Arc;
use tracing::{info, warn};
use crate::types::{
    AppUserInfo, 
    auth::{RealtimeUserStatus, UserOnlineInfo, UserOfflineInfo}
};
use crate::user_manager::{UserManager, LoginRequest};

/// 处理用户登录
#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "登录成功", body = LoginResponse),
        (status = 400, description = "请求参数错误", body = crate::types::api::ApiError),
        (status = 401, description = "用户名或密码错误", body = crate::types::api::ApiError),
    ),
    tag = "认证"
)]
pub async fn handle_login(
    login_req: LoginRequest,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("🔐 处理登录请求: 用户名={}", login_req.username);
    
    let ip_address = None; // 这里可以从请求中提取IP地址
    let response = user_manager.authenticate(&login_req.username, &login_req.password, ip_address).await;
    
    if response.success {
        info!("✅ 登录成功: {}", login_req.username);
    } else {
        warn!("❌ 登录失败: {} - {}", login_req.username, response.message);
    }
    
    Ok(warp::reply::json(&response))
}

/// 处理强制登录
#[utoipa::path(
    post,
    path = "/auth/force-login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "强制登录成功", body = LoginResponse),
        (status = 400, description = "请求参数错误", body = crate::types::api::ApiError),
        (status = 401, description = "用户名或密码错误", body = crate::types::api::ApiError),
    ),
    tag = "认证"
)]
pub async fn handle_force_login(
    login_req: LoginRequest,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("🔧 处理强制登录请求: 用户名={}", login_req.username);
    
    let ip_address = None; // 这里可以从请求中提取IP地址
    let response = user_manager.force_authenticate(&login_req.username, &login_req.password, ip_address).await;
    
    if response.success {
        info!("✅ 强制登录成功: {}", login_req.username);
    } else {
        warn!("❌ 强制登录失败: {} - {}", login_req.username, response.message);
    }
    
    Ok(warp::reply::json(&response))
}

/// 处理用户登出
#[utoipa::path(
    post,
    path = "/auth/logout",
    params(
        ("session_id" = String, Query, description = "会话ID")
    ),
    responses(
        (status = 200, description = "登出成功", body = crate::types::api::SuccessResponse),
        (status = 400, description = "会话ID无效", body = crate::types::api::ApiError),
    ),
    tag = "认证"
)]
pub async fn handle_logout(
    session_id: String,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("🔓 处理登出请求: 会话ID={}", session_id);
    
    let success = user_manager.logout(&session_id).await;
    
    if success {
        info!("✅ 用户登出成功: {}", session_id);
        Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "message": "登出成功"
        })))
    } else {
        warn!("❌ 用户登出失败: {}", session_id);
        Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": "登出失败，可能会话已过期"
        })))
    }
}

/// 处理会话验证
#[utoipa::path(
    get,
    path = "/auth/validate",
    params(
        ("session_id" = String, Query, description = "会话ID")
    ),
    responses(
        (status = 200, description = "会话验证成功", body = crate::types::api::ApiResponse<crate::user_manager::UserInfo>),
        (status = 401, description = "会话无效或已过期", body = crate::types::api::ApiError),
    ),
    tag = "认证"
)]
pub async fn handle_validate_session(
    session_id: String,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("🔍 处理会话验证请求: 会话ID={}", session_id);
    
    match user_manager.validate_session(&session_id).await {
        Some(session) => {
            info!("✅ 会话验证成功: {}", session.username);
            let user_info = crate::user_manager::UserInfo {
                id: session.user_id.clone(),
                username: session.username.clone(),
                display_name: session.display_name.clone(),
                role: session.role.clone(),
                permissions: vec![], // 这里可以添加权限逻辑
            };
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": "会话有效",
                "data": user_info
            })))
        }
        None => {
            warn!("❌ 会话验证失败: {}", session_id);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "会话无效或已过期"
            })))
        }
    }
}

/// 处理获取所有会话
#[utoipa::path(
    get,
    path = "/auth/sessions",
    responses(
        (status = 200, description = "获取会话列表成功", body = crate::types::api::ApiResponse<Vec<crate::user_manager::Session>>),
    ),
    tag = "认证"
)]
pub async fn handle_get_sessions(
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("📋 处理获取会话列表请求");
    
    let sessions = user_manager.get_active_sessions().await;
    
    info!("✅ 获取到 {} 个活跃会话", sessions.len());
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "获取会话列表成功",
        "data": sessions
    })))
}

/// 处理心跳检测
#[utoipa::path(
    post,
    path = "/auth/heartbeat",
    params(
        ("session_id" = String, Query, description = "会话ID")
    ),
    responses(
        (status = 200, description = "心跳检测成功", body = crate::types::api::SuccessResponse),
        (status = 400, description = "会话ID无效", body = crate::types::api::ApiError),
    ),
    tag = "认证"
)]
pub async fn handle_heartbeat(
    session_id: String,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("💓 处理心跳检测请求: 会话ID={}", session_id);
    
    let success = user_manager.heartbeat(&session_id).await;
    
    if success {
        info!("✅ 心跳检测成功: {}", session_id);
        Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "message": "心跳检测成功"
        })))
    } else {
        warn!("❌ 心跳检测失败: {}", session_id);
        Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": "心跳检测失败，可能会话已过期"
        })))
    }
}

/// 处理实时用户状态检查
#[utoipa::path(
    get,
    path = "/auth/realtime-check/{username}",
    params(
        ("username" = String, Path, description = "用户名")
    ),
    responses(
        (status = 200, description = "实时状态检查成功", body = RealtimeUserStatus),
    ),
    tag = "认证"
)]
pub async fn handle_realtime_check(
    username: String,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("🔍 处理实时用户状态检查请求: 用户名={}", username);
    
    let is_online = user_manager.is_user_session_active(&username).await;
    
    let status = RealtimeUserStatus {
        success: true,
        username: username.clone(),
        is_online,
        check_time: chrono::Utc::now(),
        detection_method: "session_based".to_string(),
        confidence: if is_online { 1.0 } else { 0.8 },
    };
    
    info!("✅ 实时状态检查完成: {} = {}", username, is_online);
    Ok(warp::reply::json(&status))
}

/// 处理用户在线信息获取
#[utoipa::path(
    get,
    path = "/auth/user-online-info/{username}",
    params(
        ("username" = String, Path, description = "用户名")
    ),
    responses(
        (status = 200, description = "获取用户在线信息成功", body = UserOnlineInfo),
        (status = 404, description = "用户不在线", body = crate::types::auth::UserOfflineInfo),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "认证"
)]
pub async fn handle_user_online_info(
    username: String,
    user_info: AppUserInfo,
    user_manager: Arc<UserManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    info!("📊 处理用户在线信息获取请求: 用户名={}, 请求者={}", username, user_info.name);
    
    match user_manager.get_user_online_info(&username).await {
        Some((session_id, last_activity, ip_address)) => {
            let online_info = UserOnlineInfo {
                success: true,
                username: username.clone(),
                session_id,
                last_activity,
                ip_address,
                is_truly_online: true,
                check_time: chrono::Utc::now(),
            };
            
            info!("✅ 用户在线信息获取成功: {}", username);
            Ok(warp::reply::json(&online_info))
        }
        None => {
            let offline_info = UserOfflineInfo {
                success: true,
                username: username.clone(),
                is_online: false,
                message: "用户不在线".to_string(),
                check_time: chrono::Utc::now(),
            };
            
            info!("📴 用户不在线: {}", username);
            Ok(warp::reply::json(&offline_info))
        }
    }
} 