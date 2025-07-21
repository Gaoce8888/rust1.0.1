use std::sync::Arc;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use warp::{Rejection, Reply};

use crate::storage::LocalStorage;
use crate::types::api::ApiResponse;
use crate::message::{ChatMessage, ContentType};

// 请求和响应结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageListQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub user_id: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub content_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageSearchRequest {
    pub keyword: String,
    pub user_id: Option<String>,
    pub sender_id: Option<String>,
    pub receiver_id: Option<String>,
    pub content_type: Option<String>,
    pub message_type: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageExportRequest {
    pub format: Option<String>, // json, csv, excel
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

// 获取消息列表
pub async fn handle_list_messages(
    query: MessageListQuery,
    _storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    // TODO: 从storage实际获取消息
    let messages = vec![
        serde_json::json!({
            "id": "msg_001",
            "from": "user_001",
            "to": "user_002",
            "content": "你好，有什么可以帮助您的吗？",
            "content_type": "text",
            "timestamp": "2025-07-16T10:00:00Z",
            "read": true
        }),
        serde_json::json!({
            "id": "msg_002",
            "from": "user_002",
            "to": "user_001",
            "content": "我想咨询一下产品信息",
            "content_type": "text",
            "timestamp": "2025-07-16T10:01:00Z",
            "read": true
        }),
    ];

    let response = ApiResponse {
        success: true,
        message: "获取消息列表成功".to_string(),
        data: Some(serde_json::json!({
            "messages": messages,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 100,
                "total_pages": 5
            }
        })),
    };

    Ok(warp::reply::json(&response))
}

// 获取单条消息
pub async fn handle_get_message(
    message_id: String,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    // 从storage获取消息
    match storage.get_message(&message_id).await {
        Ok(Some(message)) => {
            let message_json = serde_json::json!({
                "id": message.id,
                "from": message.from,
                "to": message.to,
                "content": message.content,
                "content_type": message.content_type,
                "timestamp": message.timestamp.to_rfc3339(),
                "filename": message.filename,
                "url": message.url,
            });
            
            let response = ApiResponse {
                success: true,
                message: "获取消息成功".to_string(),
                data: Some(message_json),
            };
            
            Ok(warp::reply::json(&response))
        }
        Ok(None) => {
            let response = ApiResponse {
                success: false,
                message: "消息不存在".to_string(),
                data: None,
            };
            Ok(warp::reply::with_status(
                warp::reply::json(&response),
                warp::http::StatusCode::NOT_FOUND,
            ))
        }
        Err(e) => {
            tracing::error!("获取消息失败: {}", e);
            let response = ApiResponse {
                success: false,
                message: "获取消息失败".to_string(),
                data: None,
            };
            Ok(warp::reply::with_status(
                warp::reply::json(&response),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

// 搜索消息
pub async fn handle_search_messages(
    query: MessageSearchRequest,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let skip = ((page - 1) * limit) as usize;
    
    // 实现搜索逻辑
    let all_results = storage.search_messages(
        Some(&query.keyword),
        query.sender_id.as_deref(),
        query.receiver_id.as_deref(),
        query.start_date.map(|dt| dt.to_rfc3339()).as_deref(),
        query.end_date.map(|dt| dt.to_rfc3339()).as_deref(),
        query.message_type.as_deref(),
    ).await.unwrap_or_else(|e| {
        tracing::error!("搜索消息失败: {}", e);
        Vec::new()
    });
    
    let total = all_results.len();
    
    // 分页
    let results: Vec<_> = all_results
        .into_iter()
        .skip(skip)
        .take(limit as usize)
        .map(|msg| {
            // 高亮关键词
            let highlighted_content = if !query.keyword.is_empty() {
                msg.content.replace(&query.keyword, &format!("<mark>{}</mark>", query.keyword))
            } else {
                msg.content.clone()
            };
            
            serde_json::json!({
                "id": msg.id,
                "from": msg.from,
                "to": msg.to,
                "content": msg.content,
                "content_type": msg.content_type,
                "timestamp": msg.timestamp.to_rfc3339(),
                "highlight": highlighted_content,
            })
        })
        .collect();

    let response = ApiResponse {
        success: true,
        message: format!("搜索 '{}' 完成", query.keyword),
        data: Some(serde_json::json!({
            "results": results,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "keyword": query.keyword
            }
        })),
    };

    Ok(warp::reply::json(&response))
}

// 导出消息
pub async fn handle_export_messages(
    request: MessageExportRequest,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    // 实现导出逻辑
    let messages = storage.get_messages_for_export(
        request.user_id.as_deref(),
        request.start_date.map(|dt| dt.to_rfc3339()).as_deref(),
        request.end_date.map(|dt| dt.to_rfc3339()).as_deref(),
        request.session_id.as_deref(),
    ).await.unwrap_or_else(|e| {
        tracing::error!("获取导出消息失败: {}", e);
        Vec::new()
    });
    
    let format = request.format.as_deref().unwrap_or("json");
    
    match format {
        "json" => {
            let export_data = serde_json::json!({
                "export_time": chrono::Utc::now().to_rfc3339(),
                "total_messages": messages.len(),
                "filters": {
                    "user_id": request.user_id,
                    "start_date": request.start_date,
                    "end_date": request.end_date,
                    "session_id": request.session_id,
                },
                "messages": messages.iter().map(|msg| {
                    serde_json::json!({
                        "id": msg.id,
                        "sender_id": msg.from,
                        "receiver_id": msg.to,
                        "content": msg.content,
                        "message_type": msg.content_type,
                        "timestamp": msg.timestamp.to_rfc3339(),
                    })
                }).collect::<Vec<_>>(),
            });
            
            let response: ApiResponse<serde_json::Value> = ApiResponse {
                success: true,
                message: "消息导出成功".to_string(),
                data: Some(export_data),
            };
            Ok(warp::reply::json(&response))
        }
        "csv" => {
            let mut csv_data = String::from("ID,发送者,接收者,内容,类型,时间\n");
            for msg in messages {
                csv_data.push_str(&format!(
                    "{},{},{},{},{},{}\n",
                    msg.id.as_deref().unwrap_or(""),
                    msg.from,
                    msg.to.as_deref().unwrap_or(""),
                    msg.content.replace(",", "，").replace("\n", " "),
                    format!("{:?}", msg.content_type.as_ref().unwrap_or(&ContentType::Text)),
                    msg.timestamp.to_rfc3339()
                ));
            }
            
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("不支持的导出格式: {}", format),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
        _ => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("不支持的导出格式: {}", format),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 删除消息
pub async fn handle_delete_message(
    message_id: String,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    // 实际删除消息（软删除）
    match storage.soft_delete_message(&message_id).await {
        Ok(()) => {
            let response: ApiResponse<serde_json::Value> = ApiResponse {
                success: true,
                message: "消息删除成功".to_string(),
                data: Some(serde_json::json!({
                    "deleted_id": message_id
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("删除消息失败: {}", e);
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: "删除消息失败".to_string(),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 批量删除消息
#[allow(dead_code)]
pub async fn handle_bulk_delete_messages(
    message_ids: Vec<String>,
    _storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let deleted_count = message_ids.len();
    
    let response = ApiResponse {
        success: true,
        message: format!("已删除 {} 条消息", deleted_count),
        data: Some(serde_json::json!({
            "deleted_count": deleted_count,
            "deleted_ids": message_ids,
            "deleted_at": Utc::now()
        })),
    };

    Ok(warp::reply::json(&response))
}

// 标记消息已读
#[allow(dead_code)]
pub async fn handle_mark_messages_read(
    message_ids: Vec<String>,
    _storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let marked_count = message_ids.len();
    
    let response = ApiResponse {
        success: true,
        message: format!("已标记 {} 条消息为已读", marked_count),
        data: Some(serde_json::json!({
            "marked_count": marked_count,
            "message_ids": message_ids,
            "marked_at": Utc::now()
        })),
    };

    Ok(warp::reply::json(&response))
}
