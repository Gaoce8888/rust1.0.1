use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::file_manager::FileManager;
use crate::html_template_manager::HtmlTemplateManager;
use crate::voice_message::VoiceMessageManager;
use crate::storage::LocalStorage;
use crate::types::api::{ApiResponse, IpLocationQuery, ClientRegisterInfo};
use crate::handlers::system::{handle_get_config, handle_get_public_online_users, handle_get_realtime_users};
use crate::handlers::client::{handle_client_register, handle_ip_location};

/// 构建简化的API路由
pub fn build_api_routes(
    ws_manager: Arc<WebSocketManager>,
    _file_manager: Arc<FileManager>,
    _html_manager: Arc<HtmlTemplateManager>,
    _voice_manager: Arc<VoiceMessageManager>,
    storage: Arc<LocalStorage>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 系统配置路由
    let config_route = warp::path!("api" / "config")
        .and(warp::get())
        .and_then(|| async {
            handle_get_config().await
        });

    // 在线用户列表路由（无需认证）
    let ws_manager_users = ws_manager.clone();
    let users_route = warp::path!("api" / "users")
        .and(warp::get())
        .and_then(move || {
            let ws_manager = ws_manager_users.clone();
            async move {
                // 直接获取统计信息，无需认证
                let stats = ws_manager.get_connection_stats().await;
                let response = ApiResponse {
                    success: true,
                    message: "获取在线用户列表成功".to_string(),
                    data: Some(serde_json::json!({
                        "total_connections": stats.total_connections,
                        "kefu_connections": stats.kefu_connections,
                        "kehu_connections": stats.kehu_connections,
                    })),
                };
                Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
            }
        });

    // 公开的在线用户状态路由
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

    // 用户信息API
    let user_info_route = warp::path!("api" / "user" / "info")
        .and(warp::get())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "获取用户信息成功".to_string(),
                data: Some(serde_json::json!({
                    "id": "current_user_id",
                    "username": "current_user",
                    "display_name": "当前用户",
                    "role": "kefu",
                    "avatar": "https://via.placeholder.com/150",
                    "status": "online",
                    "permissions": ["chat", "view_users", "manage_files"],
                    "last_login": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 用户状态更新API
    let user_status_route = warp::path!("api" / "user" / "status")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(|status_data: serde_json::Value| async move {
            let response = ApiResponse {
                success: true,
                message: "用户状态更新成功".to_string(),
                data: Some(serde_json::json!({
                    "user_id": "current_user_id",
                    "status": status_data.get("status").unwrap_or(&serde_json::json!("online")),
                    "updated_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // WebSocket统计路由（无需认证）
    let ws_manager_stats = ws_manager.clone();
    let websocket_stats_route = warp::path!("api" / "websocket" / "stats")
        .and(warp::get())
        .and_then(move || {
            let ws_manager = ws_manager_stats.clone();
            async move {
                // 直接获取统计信息，无需认证
                let stats = ws_manager.get_connection_stats().await;
                let response = ApiResponse {
                    success: true,
                    message: "获取WebSocket统计信息成功".to_string(),
                    data: Some(serde_json::json!({
                        "total_connections": stats.total_connections,
                        "kefu_connections": stats.kefu_connections,
                        "kehu_connections": stats.kehu_connections,
                        "total_messages": 0,
                    })),
                };
                Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
            }
        });

    // 文件管理路由
    let file_list_route = warp::path!("api" / "file" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "文件列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "files": [
                        {
                            "file_id": "mock_file_id_001",
                            "filename": "sample_document.pdf",
                            "size": 2048,
                            "category": "document",
                            "upload_time": "2025-07-14T22:00:00Z",
                            "uploaded_by": "admin"
                        },
                        {
                            "file_id": "mock_file_id_002", 
                            "filename": "sample_image.jpg",
                            "size": 1536,
                            "category": "image",
                            "upload_time": "2025-07-14T21:30:00Z",
                            "uploaded_by": "admin"
                        }
                    ],
                    "total": 2,
                    "page": 1,
                    "limit": 10
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    let file_upload_route = warp::path!("api" / "file" / "upload")
        .and(warp::post())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "文件上传成功".to_string(),
                data: Some(serde_json::json!({
                    "file_id": "mock_file_id_001",
                    "filename": "uploaded_file.txt",
                    "size": 1024,
                    "upload_time": "2025-07-14T22:30:00Z",
                    "access_url": "http://localhost:6006/api/file/download/mock_file_id_001"
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 兼容的文件上传路径（前端使用/api/upload）
    let file_upload_compat_route = warp::path!("api" / "upload")
        .and(warp::post())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "文件上传成功".to_string(),
                data: Some(serde_json::json!({
                    "file_id": "mock_file_id_002",
                    "filename": "uploaded_file_compat.txt",
                    "size": 1024,
                    "upload_time": "2025-07-14T22:30:00Z",
                    "access_url": "http://localhost:6006/api/file/download/mock_file_id_002"
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    let file_download_route = warp::path!("api" / "file" / "download" / String)
        .and(warp::get())
        .and_then(|file_id: String| async move {
            let response = format!("Mock file content for {file_id}");
            Result::<_, warp::Rejection>::Ok(warp::reply::with_header(
                response,
                "Content-Type",
                "text/plain"
            ))
        });

    // 添加文件删除路由
    let file_delete_route = warp::path!("api" / "file" / String)
        .and(warp::delete())
        .and_then(|file_id: String| async move {
            tracing::info!("🗑️ 删除文件请求: {}", file_id);
            let response = ApiResponse {
                success: true,
                message: format!("文件 {file_id} 删除成功"),
                data: Some(serde_json::json!({
                    "file_id": file_id,
                    "deleted_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 消息历史API
    let messages_route = warp::path!("api" / "messages" / String)
        .and(warp::get())
        .and_then(|user_id: String| async move {
            let response = ApiResponse {
                success: true,
                message: "获取消息历史成功".to_string(),
                data: Some(serde_json::json!({
                    "messages": [
                        {
                            "id": "msg_001",
                            "senderId": "user_001",
                            "receiverId": user_id,
                            "text": "你好，有什么可以帮助您的吗？",
                            "type": "text",
                            "time": "2025-01-14T10:00:00Z",
                            "status": "read"
                        },
                        {
                            "id": "msg_002",
                            "senderId": user_id,
                            "receiverId": "user_001",
                            "text": "我想咨询一下产品信息",
                            "type": "text",
                            "time": "2025-01-14T10:01:00Z",
                            "status": "read"
                        }
                    ],
                    "total": 2,
                    "user_id": user_id
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 消息列表API
    let messages_list_route = warp::path!("api" / "messages")
        .and(warp::get())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "获取消息列表成功".to_string(),
                data: Some(serde_json::json!({
                    "conversations": [
                        {
                            "id": "conv_001",
                            "participants": [
                                {
                                    "id": "user_001",
                                    "name": "客服001",
                                    "role": "support",
                                    "status": "online"
                                },
                                {
                                    "id": "user_002",
                                    "name": "客户001",
                                    "role": "customer",
                                    "status": "online"
                                }
                            ],
                            "lastMessage": {
                                "id": "msg_001",
                                "text": "你好，有什么可以帮助您的吗？",
                                "time": "2025-01-14T10:00:00Z",
                                "senderId": "user_001"
                            },
                            "unreadCount": 0
                        }
                    ],
                    "total": 1
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 语音消息路由
    let voice_list_route = warp::path!("api" / "voice" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "语音列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "voices": [
                        {
                            "voice_id": "mock_voice_id_001",
                            "from": "admin",
                            "to": "customer_001",
                            "duration": 5,
                            "format": "webm",
                            "upload_time": "2025-07-14T22:00:00Z"
                        },
                        {
                            "voice_id": "mock_voice_id_002",
                            "from": "customer_001", 
                            "to": "admin",
                            "duration": 3,
                            "format": "webm",
                            "upload_time": "2025-07-14T21:45:00Z"
                        }
                    ]
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    let voice_upload_route = warp::path!("api" / "voice" / "upload")
        .and(warp::post())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "语音上传成功".to_string(),
                data: Some(serde_json::json!({
                    "voice_id": "mock_voice_id_001",
                    "file_id": "mock_file_id_voice_001",
                    "duration": 5,
                    "format": "webm",
                    "file_size": 8192,
                    "upload_time": "2025-07-14T22:30:00Z",
                    "access_url": "http://localhost:6006/api/voice/download/mock_voice_id_001"
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // 添加语音下载路由
    let voice_download_route = warp::path!("api" / "voice" / "download" / String)
        .and(warp::get())
        .and_then(|voice_id: String| async move {
            tracing::info!("🎤 下载语音请求: {}", voice_id);
            // 模拟返回音频数据
            let mock_audio_data = vec![0u8; 1024]; // 模拟音频数据
            Result::<_, warp::Rejection>::Ok(
                warp::reply::with_header(
                    mock_audio_data,
                    "Content-Type",
                    "audio/webm"
                )
            )
        });

    // HTML模板路由
    let template_list_route = warp::path!("api" / "template" / "list")
        .and(warp::get())
        .and_then(|| async {
            let response = ApiResponse {
                success: true,
                message: "模板列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "templates": [
                        {
                            "template_id": "template_001",
                            "name": "欢迎消息模板",
                            "description": "新客户欢迎消息",
                            "category": "greeting",
                            "created_at": "2025-07-14T20:00:00Z",
                            "updated_at": "2025-07-14T21:00:00Z"
                        },
                        {
                            "template_id": "template_002",
                            "name": "问题解答模板",
                            "description": "常见问题快速回复",
                            "category": "faq", 
                            "created_at": "2025-07-14T19:00:00Z",
                            "updated_at": "2025-07-14T20:30:00Z"
                        }
                    ]
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    let template_get_route = warp::path!("api" / "template" / "get" / String)
        .and(warp::get())
        .and_then(|template_id: String| async move {
            let response = ApiResponse {
                success: true,
                message: "获取模板成功".to_string(),
                data: Some(serde_json::json!({
                    "template_id": template_id,
                    "content": "<h1>Mock Template</h1>",
                    "variables": []
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    let template_create_route = warp::path!("api" / "template" / "create")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(|template_req: serde_json::Value| async move {
            let template_id = format!("template_{}", chrono::Utc::now().timestamp());
            let response = ApiResponse {
                success: true,
                message: "模板创建成功".to_string(),
                data: Some(serde_json::json!({
                    "template_id": template_id,
                    "name": template_req.get("name").unwrap_or(&serde_json::json!("新模板")).as_str().unwrap_or("新模板"),
                    "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
                })),
            };
            Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
        });

    // === 客户端API路由 ===
    
    // IP地理位置查询路由
    let ip_location_route = warp::path!("api" / "client" / "location")
        .and(warp::get())
        .and(warp::query::<IpLocationQuery>())
        .and_then(move |query: IpLocationQuery| {
            async move {
                handle_ip_location(query).await
            }
        });

    // 客户端信息注册路由
    let storage_register = storage.clone();
    let client_register_route = warp::path!("api" / "client" / "register-info")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(move |register_info: ClientRegisterInfo| {
            let storage = storage_register.clone();
            async move {
                handle_client_register(register_info, storage).await
            }
        });

    // 客户端信息查询路由 (额外功能)
    let storage_query = storage.clone();
    let client_info_route = warp::path!("api" / "client" / "info" / String)
        .and(warp::get())
        .and_then(move |client_id: String| {
            let storage = storage_query.clone();
            async move {
                tracing::info!("🔍 查询客户端信息: {}", client_id);
                
                let storage_key = format!("client:{client_id}");
                if let Ok(Some(data)) = storage.get(&storage_key).await {
                    let response = ApiResponse {
                        success: true,
                        message: "客户端信息查询成功".to_string(),
                        data: Some(serde_json::from_str::<serde_json::Value>(&data).unwrap_or_default()),
                    };
                    Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
                } else {
                    let response = ApiResponse {
                        success: false,
                        message: "客户端信息不存在".to_string(),
                        data: None::<()>,
                    };
                    Result::<_, warp::Rejection>::Ok(warp::reply::json(&response))
                }
            }
        });

    // 组合所有路由
    config_route
        .or(users_route)
        .or(public_users_route)
        .or(realtime_users_route)
        .or(user_info_route)
        .or(user_status_route)
        .or(websocket_stats_route)
        .or(file_list_route)
        .or(file_upload_route)
        .or(file_upload_compat_route)
        .or(file_download_route)
        .or(file_delete_route)  // 添加文件删除路由
        .or(messages_route)
        .or(messages_list_route)
        .or(voice_list_route)
        .or(voice_upload_route)
        .or(voice_download_route)  // 添加语音下载路由
        .or(template_list_route)
        .or(template_get_route)
        .or(template_create_route)
        .or(ip_location_route)
        .or(client_register_route)
        .or(client_info_route)
}