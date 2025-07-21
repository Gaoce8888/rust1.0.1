/// WebSocket处理器模块
/// 
/// 提供WebSocket连接管理、消息路由、实时通信功能。
/// 支持多用户并发连接、消息广播、状态同步等特性。
/// 
/// # 功能特性
/// - WebSocket连接建立和管理
/// - 实时消息路由和转发
/// - 用户在线状态检测
/// - 连接统计和监控
/// - 心跳检测和自动重连
/// - 消息压缩和优化
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;
use tracing::info;
use warp::{reject::Rejection, reply::Reply};

use crate::{
    types::{
        api::ApiResponse,
        auth::AppUserInfo,
    },
    websocket::WebSocketManager,
};

/// 获取WebSocket连接统计处理函数
/// 
/// 获取当前WebSocket连接的统计信息
#[allow(dead_code)] // 将在WebSocket管理API路由中使用
pub async fn handle_get_websocket_stats(
    ws_manager: Arc<WebSocketManager>,
    _user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("🔗 获取WebSocket连接统计");

    let stats = ws_manager.get_connection_stats().await;

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "获取WebSocket统计成功".to_string(),
        data: Some(stats),
    }))
}

/// 获取在线用户列表处理函数
/// 
/// 获取当前在线的用户列表
#[allow(dead_code)] // 将在用户管理API路由中使用
pub async fn handle_get_online_users(
    ws_manager: Arc<WebSocketManager>,
    _user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("👥 获取在线用户列表");

    let realtime_users = ws_manager.get_realtime_online_users().await;
    let total_count = ws_manager.get_realtime_online_count().await;

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "获取在线用户列表成功".to_string(),
        data: Some(json!({
            "users": realtime_users,
            "total_count": total_count,
            "detection_method": "实时WebSocket连接检测",
            "confidence": 1.0,
            "timestamp": chrono::Utc::now(),
        })),
    }))
}

/// 强制断开用户连接处理函数
/// 
/// 管理员功能：强制断开指定用户的WebSocket连接
#[allow(dead_code)] // 将在管理员API路由中使用
pub async fn handle_disconnect_user(
    ws_manager: Arc<WebSocketManager>,
    user_id: String,
    admin_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("👮 管理员 {} 强制断开用户 {} 的连接", admin_info.id, user_id);

    // 这里可以添加权限检查，确保只有管理员可以执行此操作
    
    // 调用WebSocketManager的disconnect_user方法
    let disconnected = ws_manager.disconnect_user(&user_id).await;

    if disconnected {
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            message: format!("成功断开用户 {} 的连接", user_id),
            data: Some(json!({"user_id": user_id})),
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse {
            success: false,
            message: format!("用户 {} 未在线或断开失败", user_id),
            data: None::<()>,
        }))
    }
}

/// 广播消息处理函数
/// 
/// 向所有在线用户广播消息
#[allow(dead_code)] // 将在管理员API路由中使用
pub async fn handle_broadcast_message(
    ws_manager: Arc<WebSocketManager>,
    message: String,
    admin_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("📢 管理员 {} 广播消息", admin_info.id);

    // 调用WebSocketManager的broadcast_to_all方法
    let broadcast_count = ws_manager.broadcast_to_all(&message).await;

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: format!("消息已广播给 {} 个用户", broadcast_count),
        data: Some(json!({
            "message": message,
            "broadcast_count": broadcast_count,
            "timestamp": chrono::Utc::now(),
        })),
    }))
}

/// 检查用户在线状态处理函数
/// 
/// 检查指定用户的在线状态
#[allow(dead_code)] // 将在用户状态API路由中使用
pub async fn handle_check_user_status(
    ws_manager: Arc<WebSocketManager>,
    user_id: String,
    _user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("🔍 检查用户 {} 的在线状态", user_id);

    let is_online = ws_manager.is_user_realtime_online(&user_id).await;
    let last_seen = ws_manager.get_user_last_seen(&user_id).await;

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "用户状态检查完成".to_string(),
        data: Some(json!({
            "user_id": user_id,
            "is_online": is_online,
            "last_seen": last_seen,
            "check_time": chrono::Utc::now(),
        })),
    }))
}

/// 获取WebSocket健康状态处理函数
/// 
/// 获取WebSocket服务的健康状态信息
#[allow(dead_code)] // 将在健康检查API路由中使用
pub async fn handle_get_websocket_health(
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    info!("💚 检查WebSocket服务健康状态");

    let stats = ws_manager.get_connection_stats().await;
    let uptime = ws_manager.get_uptime().await;
    
    let health_status = if stats.total_connections > 0 {
        "healthy"
    } else {
        "warning"
    };

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "WebSocket服务健康状态".to_string(),
        data: Some(json!({
            "status": health_status,
            "uptime_seconds": uptime,
            "connections": stats,
            "timestamp": chrono::Utc::now(),
        })),
    }))
} 