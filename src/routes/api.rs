use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::file_manager::FileManager;
use crate::html_template_manager::HtmlTemplateManager;
use crate::react_template_manager::ReactTemplateManager;
use crate::routes::react_template;
use crate::voice_message::VoiceMessageManager;
use crate::auth::middleware::extract_user_info;
use crate::handlers::system::*;

/// 构建API路由
pub fn build_api_routes(
    ws_manager: Arc<WebSocketManager>,
    file_manager: Arc<FileManager>,
    html_manager: Arc<HtmlTemplateManager>,
    react_manager: Arc<ReactTemplateManager>,
    voice_manager: Arc<VoiceMessageManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 系统配置路由
    let config_route = warp::path!("api" / "config")
        .and(warp::get())
        .and_then(|| async {
            handle_get_config().await
        });

    // 在线用户列表路由 - 临时简化实现
    let users_route = warp::path!("api" / "users")
        .and(warp::get())
        .and_then(|| async {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "获取在线用户列表成功".to_string(),
                data: Some(serde_json::json!({
                    "total_connections": 0,
                    "kefu_connections": 0,
                    "kehu_connections": 0,
                })),
            };
            Ok(warp::reply::json(&response))
        });

    // 公开的在线用户状态路由（不需要身份验证）
    let ws_manager_public = ws_manager.clone();
    let public_users_route = warp::path!("api" / "users" / "online")
        .and(warp::get())
        .and_then(move || {
            let ws_manager = ws_manager_public.clone();
            async move {
                handle_get_public_online_users(ws_manager).await
            }
        });

    // 实时在线用户检测API
    let ws_manager_realtime = ws_manager.clone();
    let realtime_users_route = warp::path!("api" / "realtime" / "users")
        .and(warp::get())
        .and_then(move || {
            let ws_manager = ws_manager_realtime.clone();
            async move {
                handle_get_realtime_users(ws_manager).await
            }
        });

    // WebSocket统计路由 - 临时简化实现
    let websocket_stats_route = warp::path!("api" / "websocket" / "stats")
        .and(warp::get())
        .and_then(|| async {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "获取WebSocket统计信息成功".to_string(),
                data: Some(serde_json::json!({
                    "total_connections": 0,
                    "kefu_connections": 0,
                    "kehu_connections": 0,
                    "total_messages": 0,
                })),
            };
            Ok(warp::reply::json(&response))
        });

    // 文件管理路由 - 临时简化实现
    let file_list_route = warp::path!("api" / "file" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "文件列表获取成功".to_string(),
                data: Some(serde_json::json!({"files": []})),
            };
            Ok(warp::reply::json(&response))
        });

    // 语音消息路由 - 临时简化实现
    let voice_list_route = warp::path!("api" / "voice" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "语音列表获取成功".to_string(),
                data: Some(serde_json::json!({"voices": []})),
            };
            Ok(warp::reply::json(&response))
        });

    // HTML模板路由 - 临时简化实现
    let template_list_route = warp::path!("api" / "template" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "模板列表获取成功".to_string(),
                data: Some(serde_json::json!({"templates": []})),
            };
            Ok(warp::reply::json(&response))
        });

    // React模板路由
    let react_template_routes = react_template::create_react_template_routes(react_manager.clone());

    // 组合所有路由
    config_route
        .or(users_route)
        .or(public_users_route)
        .or(realtime_users_route)
        .or(websocket_stats_route)
        .or(file_list_route)
        .or(voice_list_route)
        .or(template_list_route)
        .or(react_template_routes)
} 