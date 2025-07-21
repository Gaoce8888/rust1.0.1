use std::sync::Arc;
use warp::{Reply, Rejection};
use serde::{Deserialize, Serialize};
use crate::websocket::WebSocketManager;
use crate::storage::LocalStorage;
use crate::types::api::ApiResponse;
use crate::message::{UserType};
use chrono::{DateTime, Utc};
use anyhow::Result;

// 请求和响应结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionListQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub kefu_id: Option<String>,
    pub status: Option<String>, // active, completed, transferred
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessagesQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub include_system: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferSessionRequest {
    pub to_kefu_id: String,
    pub reason: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub kefu_id: String,
    pub kefu_name: String,
    pub kehu_id: String,
    pub kehu_name: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub message_count: u32,
    pub last_message: Option<String>,
}

// 获取会话列表 - 连接实际功能
pub async fn handle_list_sessions(
    query: SessionListQuery,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    let mut sessions = Vec::new();
    
    // 如果指定了客服ID，获取该客服的客户列表
    if let Some(kefu_id) = query.kefu_id {
        match ws_manager.get_kefu_customers(&kefu_id).await {
            Ok(customers) => {
                for customer in customers {
                    // 获取客服信息
                    let connections = ws_manager.connections.read().await;
                    let kefu_name = connections.get(&kefu_id)
                        .map(|conn| conn.user_name.clone())
                        .unwrap_or_else(|| "未知客服".to_string());
                    
                    sessions.push(SessionInfo {
                        session_id: format!("{}:{}", customer.id, kefu_id),
                        kefu_id: kefu_id.clone(),
                        kefu_name,
                        kehu_id: customer.id,
                        kehu_name: customer.name,
                        status: match customer.status {
                            crate::message::OnlineStatus::Online => "active".to_string(),
                            crate::message::OnlineStatus::Offline => "completed".to_string(),
                            crate::message::OnlineStatus::Away => "away".to_string(),
                        },
                        created_at: customer.last_activity - chrono::Duration::hours(1), // 估算创建时间
                        updated_at: customer.last_activity,
                        message_count: {
                            // 从Redis获取实际消息数
                            let redis = ws_manager.redis.read().await;
                            let count = redis.get_conversation_message_count(&format!("{}:{}", customer.id, kefu_id))
                                .await
                                .unwrap_or(0);
                            count as u32
                        },
                        last_message: Some(customer.last_message),
                    });
                }
            }
            Err(e) => {
                tracing::warn!("获取客服客户列表失败: {:?}", e);
            }
        }
    } else {
        // 获取所有活跃会话
        let connections = ws_manager.connections.read().await;
        let redis = ws_manager.redis.read().await;
        
        for (user_id, connection) in connections.iter() {
            if connection.user_type == UserType::Kefu {
                // 获取该客服的活跃会话
                if let Ok(active_sessions) = redis.get_kefu_active_sessions(user_id).await {
                    for customer_id in active_sessions {
                        if let Some(customer_conn) = connections.get(&customer_id) {
                            let session_key = format!("{}:{}", customer_id, user_id);
                            
                            // 获取实际消息数
                            let message_count = redis.get_conversation_message_count(&session_key)
                                .await
                                .unwrap_or(0);
                            
                            // 获取最后一条消息
                            let last_message = redis.get_last_message(&session_key)
                                .await
                                .ok();
                            
                            sessions.push(SessionInfo {
                                session_id: session_key,
                                kefu_id: user_id.clone(),
                                kefu_name: connection.user_name.clone(),
                                kehu_id: customer_id.clone(),
                                kehu_name: customer_conn.user_name.clone(),
                                status: match customer_conn.status {
                                    crate::message::OnlineStatus::Online => "active".to_string(),
                                    crate::message::OnlineStatus::Offline => "completed".to_string(),
                                    crate::message::OnlineStatus::Away => "away".to_string(),
                                },
                                created_at: connection.connected_at,
                                updated_at: customer_conn.last_heartbeat,
                                message_count,
                                last_message,
                            });
                        }
                    }
                }
            }
        }
    }

    // 应用过滤条件
    if let Some(status_filter) = query.status {
        sessions.retain(|session| session.status == status_filter);
    }
    
    if let Some(start_date) = query.start_date {
        sessions.retain(|session| session.created_at >= start_date);
    }
    
    if let Some(end_date) = query.end_date {
        sessions.retain(|session| session.created_at <= end_date);
    }

    // 分页处理
    let total = sessions.len();
    let start = ((page - 1) * limit) as usize;
    let end = (start + limit as usize).min(total);
    let paginated_sessions = if start < total {
        sessions[start..end].to_vec()
    } else {
        Vec::new()
    };

    let response = ApiResponse {
        success: true,
        message: "获取会话列表成功".to_string(),
        data: Some(serde_json::json!({
            "sessions": paginated_sessions,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit as usize - 1) / limit as usize
            }
        })),
    };

    Ok(warp::reply::json(&response))
}

// 获取会话详情 - 连接实际功能
pub async fn handle_get_session(
    session_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    // 解析会话ID (格式: kehu_id:kefu_id)
    let parts: Vec<&str> = session_id.split(':').collect();
    if parts.len() != 2 {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "无效的会话ID格式".to_string(),
            Some(400)
        )));
    }
    
    let kehu_id = parts[0];
    let kefu_id = parts[1];
    
    let connections = ws_manager.connections.read().await;
    
    // 获取客服信息
    let kefu_info = connections.get(kefu_id);
    let kehu_info = connections.get(kehu_id);
    
    if kefu_info.is_none() || kehu_info.is_none() {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "会话参与者不在线".to_string(),
            Some(404)
        )));
    }
    
    let kefu_conn = kefu_info.unwrap();
    let kehu_conn = kehu_info.unwrap();
    
    // 获取会话消息数量
    let message_count = match ws_manager.storage.get_recent_messages(kefu_id, kehu_id, 1000) {
        Ok(messages) => messages.len() as u32,
        Err(_) => 0,
    };
    
    // 获取最后一条消息
    let last_message = match ws_manager.storage.get_recent_messages(kefu_id, kehu_id, 1) {
        Ok(messages) => messages.first().map(|msg| msg.content.clone()),
        Err(_) => None,
    };
    
    let session = SessionInfo {
        session_id: session_id.clone(),
        kefu_id: kefu_id.to_string(),
        kefu_name: kefu_conn.user_name.clone(),
        kehu_id: kehu_id.to_string(),
        kehu_name: kehu_conn.user_name.clone(),
        status: match kehu_conn.status {
            crate::message::OnlineStatus::Online => "active".to_string(),
            crate::message::OnlineStatus::Offline => "completed".to_string(),
            crate::message::OnlineStatus::Away => "away".to_string(),
        },
        created_at: kefu_conn.connected_at.min(kehu_conn.connected_at),
        updated_at: kefu_conn.last_heartbeat.max(kehu_conn.last_heartbeat),
        message_count,
        last_message,
    };

    // 计算会话统计信息
    let duration_seconds = (session.updated_at - session.created_at).num_seconds() as u32;
    let avg_response_time = 30; // TODO: 计算实际平均响应时间

    let response = ApiResponse {
        success: true,
        message: "获取会话详情成功".to_string(),
        data: Some(serde_json::json!({
            "session": session,
            "participants": {
                "kefu": {
                    "id": kefu_id,
                    "name": kefu_conn.user_name,
                    "status": format!("{:?}", kefu_conn.status),
                    "avatar": None::<String>
                },
                "kehu": {
                    "id": kehu_id,
                    "name": kehu_conn.user_name,
                    "status": format!("{:?}", kehu_conn.status),
                    "avatar": None::<String>
                }
            },
            "statistics": {
                "duration_seconds": duration_seconds,
                "message_count": message_count,
                "avg_response_time_seconds": avg_response_time
            }
        })),
    };

    Ok(warp::reply::json(&response))
}

// 获取会话消息历史 - 连接实际功能
pub async fn handle_get_session_messages(
    session_id: String,
    query: SessionMessagesQuery,
    _ws_manager: Arc<WebSocketManager>,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    let include_system = query.include_system.unwrap_or(false);
    
    // 解析会话ID
    let parts: Vec<&str> = session_id.split(':').collect();
    if parts.len() != 2 {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "无效的会话ID格式".to_string(),
            Some(400)
        )));
    }
    
    let kehu_id = parts[0];
    let kefu_id = parts[1];
    
    // 从存储获取消息
    let all_messages = match storage.get_recent_messages(kefu_id, kehu_id, 10000) {
        Ok(messages) => messages,
        Err(e) => {
            tracing::warn!("获取会话消息失败: {:?}", e);
            vec![]
        }
    };
    
    // 过滤系统消息
    let filtered_messages: Vec<serde_json::Value> = all_messages
        .into_iter()
        .filter(|msg| {
            if !include_system {
                // 过滤掉系统消息（这里假设系统消息有特定标识）
                !msg.content.starts_with("[系统]") && !msg.content.starts_with("[System]")
            } else {
                true
            }
        })
        .map(|msg| serde_json::json!({
            "id": msg.id,
            "from": msg.from,
            "to": msg.to,
            "content": msg.content,
            "content_type": msg.content_type.map(|ct| format!("{:?}", ct)),
            "timestamp": msg.timestamp,
            "url": msg.url
        }))
        .collect();
    
    // 分页处理
    let total = filtered_messages.len();
    let start = ((page - 1) * limit) as usize;
    let end = (start + limit as usize).min(total);
    let paginated_messages = if start < total {
        filtered_messages[start..end].to_vec()
    } else {
        Vec::new()
    };

    let response = ApiResponse {
        success: true,
        message: "获取会话消息成功".to_string(),
        data: Some(serde_json::json!({
            "session_id": session_id,
            "messages": paginated_messages,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": end < total
            }
        })),
    };

    Ok(warp::reply::json(&response))
}

// 转接会话 - 连接实际功能
pub async fn handle_transfer_session(
    session_id: String,
    request: TransferSessionRequest,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    // 解析会话ID
    let parts: Vec<&str> = session_id.split(':').collect();
    if parts.len() != 2 {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "无效的会话ID格式".to_string(),
            Some(400)
        )));
    }
    
    let kehu_id = parts[0];
    let from_kefu_id = parts[1];
    let to_kefu_id = request.to_kefu_id;
    
    // 验证目标客服是否存在且在线
    let connections = ws_manager.connections.read().await;
    if !connections.contains_key(&to_kefu_id) {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "目标客服不在线".to_string(),
            Some(404)
        )));
    }
    
    // 执行会话转接
    match ws_manager.switch_customer_session(&to_kefu_id, kehu_id).await {
        Ok(success) => {
            if success {
                let response = ApiResponse {
                    success: true,
                    message: format!("会话已成功转接给客服 {}", to_kefu_id),
                    data: Some(serde_json::json!({
                        "session_id": session_id,
                        "from_kefu_id": from_kefu_id,
                        "to_kefu_id": to_kefu_id,
                        "transfer_time": Utc::now(),
                        "reason": request.reason,
                        "note": request.note
                    })),
                };
                Ok(warp::reply::json(&response))
            } else {
                Err(warp::reject::custom(crate::types::api::ApiError::new(
                    "会话转接失败".to_string(),
                    Some(500)
                )))
            }
        }
        Err(e) => {
            tracing::error!("会话转接错误: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("会话转接失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 结束会话 - 连接实际功能
pub async fn handle_end_session(
    session_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    // 解析会话ID
    let parts: Vec<&str> = session_id.split(':').collect();
    if parts.len() != 2 {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "无效的会话ID格式".to_string(),
            Some(400)
        )));
    }
    
    let kehu_id = parts[0];
    let kefu_id = parts[1];
    
    // 清除会话关系
    let redis = ws_manager.redis.write().await;
    match redis.clear_session(kehu_id, kefu_id).await {
        Ok(_) => {
            let response = ApiResponse {
                success: true,
                message: "会话已结束".to_string(),
                data: Some(serde_json::json!({
                    "session_id": session_id,
                    "ended_at": Utc::now(),
                    "duration_seconds": 0, // TODO: 计算实际持续时间
                    "message_count": 0 // TODO: 获取实际消息数
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("结束会话失败: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("结束会话失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 获取会话统计 - 连接实际功能
pub async fn handle_session_statistics(
    session_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    // 解析会话ID
    let parts: Vec<&str> = session_id.split(':').collect();
    if parts.len() != 2 {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "无效的会话ID格式".to_string(),
            Some(400)
        )));
    }
    
    let kehu_id = parts[0];
    let kefu_id = parts[1];
    
    // 获取会话消息
    let messages = ws_manager.storage.get_recent_messages(kefu_id, kehu_id, 10000).unwrap_or_default();
    
    // 计算统计信息
    let total_messages = messages.len();
    let kefu_messages = messages.iter().filter(|msg| msg.from == kefu_id).count();
    let kehu_messages = messages.iter().filter(|msg| msg.from == kehu_id).count();
    
    // 计算平均响应时间（简化版本）
    let mut response_times = Vec::new();
    let mut last_kehu_time = None;
    
    for msg in &messages {
        if msg.from == kehu_id {
            last_kehu_time = Some(msg.timestamp);
        } else if msg.from == kefu_id {
            if let Some(kehu_time) = last_kehu_time {
                let response_time = (msg.timestamp - kehu_time).num_seconds() as u32;
                response_times.push(response_time);
            }
        }
    }
    
    let avg_response_time = if !response_times.is_empty() {
        response_times.iter().sum::<u32>() / response_times.len() as u32
    } else {
        0
    };
    
    let first_response_time = response_times.first().copied().unwrap_or(0);
    
    // 计算会话持续时间
    let duration_seconds = if let (Some(first_msg), Some(last_msg)) = (messages.first(), messages.last()) {
        (last_msg.timestamp - first_msg.timestamp).num_seconds() as u32
    } else {
        0
    };
    
    let response = ApiResponse {
        success: true,
        message: "获取会话统计成功".to_string(),
        data: Some(serde_json::json!({
            "session_id": session_id,
            "statistics": {
                "total_messages": total_messages,
                "kefu_messages": kefu_messages,
                "kehu_messages": kehu_messages,
                "avg_response_time_seconds": avg_response_time,
                "first_response_time_seconds": first_response_time,
                "duration_seconds": duration_seconds,
                "satisfaction_score": null // TODO: 实现满意度评分
            }
        })),
    };

    Ok(warp::reply::json(&response))
}
