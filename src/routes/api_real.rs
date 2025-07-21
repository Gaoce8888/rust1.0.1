use std::sync::Arc;
use warp::Filter;
use crate::file_manager::{FileManager, FileListRequest};
use crate::types::api::ApiResponse;

/// 构建真实的文件管理API路由
pub fn build_real_file_api_routes(
    file_manager: Arc<FileManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 文件列表路由（真实实现）
    let file_list_route = warp::path!("api" / "file" / "list")
        .and(warp::get())
        .and(warp::query())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_real_file_list);

    // 文件上传路由（真实实现）
    let file_upload_route = warp::path!("api" / "file" / "upload")
        .and(warp::post())
        .and(warp::multipart::form().max_length(50 * 1024 * 1024)) // 50MB限制
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_real_file_upload);

    // 文件下载路由（真实实现）
    let file_download_route = warp::path!("api" / "file" / "download" / String)
        .and(warp::get())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_real_file_download);

    // 文件删除路由（真实实现）
    let file_delete_route = warp::path!("api" / "file" / String)
        .and(warp::delete())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_real_file_delete);

    // 文件信息路由
    let file_info_route = warp::path!("api" / "file" / "info" / String)
        .and(warp::get())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_file_info);

    // 批量删除路由
    let file_bulk_delete_route = warp::path!("api" / "file" / "bulk-delete")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_bulk_file_delete);

    // 文件搜索路由
    let file_search_route = warp::path!("api" / "file" / "search")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_file_manager(file_manager.clone()))
        .and_then(handle_file_search);

    // 组合所有文件管理路由
    file_list_route
        .or(file_upload_route)
        .or(file_download_route)
        .or(file_delete_route)
        .or(file_info_route)
        .or(file_bulk_delete_route)
        .or(file_search_route)
}

// Helper function
fn with_file_manager(file_manager: Arc<FileManager>) -> impl Filter<Extract = (Arc<FileManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || file_manager.clone())
}

// === 真实的文件处理函数 ===

use serde::{Deserialize, Serialize};
use warp::multipart::FormData;
use warp::Reply;
use futures_util::TryStreamExt;
use bytes::BufMut;
use crate::file_manager_ext::FileManagerExt;
use crate::message::ContentType;

// 使用 types 模块中的 FileListQuery，不要重复定义
use crate::types::api::FileListQuery;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileSearchRequest {
    pub keyword: String,
    pub category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkDeleteRequest {
    pub file_ids: Vec<String>,
}

// 获取文件列表（真实实现）
async fn handle_real_file_list(
    query: FileListQuery,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    // 构建 FileListRequest
    let request = FileListRequest {
        category: query.category.as_ref().and_then(|c| {
            match c.as_str() {
                "image" => Some(ContentType::Image),
                "file" => Some(ContentType::File),
                "voice" => Some(ContentType::Voice),
                "video" => Some(ContentType::Video),
                _ => None,
            }
        }),
        uploaded_by: None,
        page,
        limit,
        sort_by: "uploaded_at".to_string(),
        sort_order: "desc".to_string(),
    };
    
    // 从FileManager获取文件列表
    match file_manager.list_files(request).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                message: "文件列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "files": response.files,
                    "total": response.total,
                    "page": response.page,
                    "limit": response.limit,
                    "has_more": response.has_more,
                    "total_pages": ((f64::from(response.total) / f64::from(response.limit)).ceil()) as u32
                })),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("获取文件列表失败: {e}"),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 文件上传（真实实现）
async fn handle_real_file_upload(
    form: FormData,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let parts: Vec<_> = form.try_collect().await.map_err(|e| {
        tracing::error!("文件上传失败: {:?}", e);
        warp::reject::reject()
    })?;

    let mut file_data = None;
    let mut file_name = None;
    let mut category = "default".to_string();
    let mut user_id = "anonymous".to_string();

    // 解析表单数据
    for part in parts {
        match part.name() {
            "file" => {
                file_name = part.filename().map(std::string::ToString::to_string);
                let data = part.stream().try_fold(Vec::new(), |mut vec, data| {
                    vec.put(data);
                    async move { Ok(vec) }
                }).await.map_err(|e| {
                    tracing::error!("读取文件数据失败: {:?}", e);
                    warp::reject::reject()
                })?;
                file_data = Some(data);
            }
            "category" => {
                if let Ok(data) = part.stream().try_fold(Vec::new(), |mut vec, data| {
                    vec.put(data);
                    async move { Ok(vec) }
                }).await {
                    if let Ok(text) = String::from_utf8(data) {
                        category = text;
                    }
                }
            }
            "user_id" => {
                if let Ok(data) = part.stream().try_fold(Vec::new(), |mut vec, data| {
                    vec.put(data);
                    async move { Ok(vec) }
                }).await {
                    if let Ok(text) = String::from_utf8(data) {
                        user_id = text;
                    }
                }
            }
            _ => {}
        }
    }

    // 验证文件数据
    let (data, name) = if let (Some(d), Some(n)) = (file_data, file_name) { (d, n) } else {
        let response: ApiResponse<()> = ApiResponse {
            success: false,
            message: "未找到有效的文件数据".to_string(),
            data: None,
        };
        return Ok(warp::reply::json(&response));
    };

    // 保存文件
    match file_manager.save_file(&name, &data, &category, &user_id).await {
        Ok(file_info) => {
            let response = ApiResponse {
                success: true,
                message: "文件上传成功".to_string(),
                data: Some(file_info),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("文件上传失败: {e}"),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 文件下载（真实实现）
async fn handle_real_file_download(
    file_id: String,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match file_manager.get_file(&file_id).await {
        Ok((data, metadata)) => {
            Ok(warp::reply::with_header(
                data,
                "Content-Type",
                metadata.content_type.unwrap_or_else(|| "application/octet-stream".to_string())
            ).into_response())
        }
        Err(e) => {
            tracing::error!("文件下载失败: {}", e);
            Err(warp::reject::not_found())
        }
    }
}

// 文件删除（真实实现）
async fn handle_real_file_delete(
    file_id: String,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 使用系统用户ID进行删除操作
    match file_manager.delete_file(&file_id, "system").await {
        Ok(_) => {
            let response = ApiResponse {
                success: true,
                message: format!("文件 {file_id} 删除成功"),
                data: Some(serde_json::json!({
                    "file_id": file_id,
                    "deleted_at": chrono::Utc::now()
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("文件删除失败: {e}"),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 获取文件信息
async fn handle_file_info(
    file_id: String,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match file_manager.get_file_info(&file_id).await {
        Ok(info) => {
            let response = ApiResponse {
                success: true,
                message: "获取文件信息成功".to_string(),
                data: Some(info),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("获取文件信息失败: {e}"),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 批量删除文件
async fn handle_bulk_file_delete(
    request: BulkDeleteRequest,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut success_count = 0;
    let mut failed_ids = Vec::new();

    for file_id in &request.file_ids {
        // 使用系统用户ID进行删除操作
        match file_manager.delete_file(file_id, "system").await {
            Ok(_) => success_count += 1,
            Err(_) => failed_ids.push(file_id.clone()),
        }
    }

    let response = ApiResponse {
        success: failed_ids.is_empty(),
        message: format!("批量删除完成: 成功 {}, 失败 {}", success_count, failed_ids.len()),
        data: Some(serde_json::json!({
            "total": request.file_ids.len(),
            "success_count": success_count,
            "failed_ids": failed_ids,
            "deleted_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

// 文件搜索
async fn handle_file_search(
    request: FileSearchRequest,
    file_manager: Arc<FileManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match file_manager.search_files(&request.keyword, request.category.as_deref()).await {
        Ok(results) => {
            let response = ApiResponse {
                success: true,
                message: format!("搜索完成，找到 {} 个文件", results.len()),
                data: Some(serde_json::json!({
                    "results": results,
                    "keyword": request.keyword,
                    "total": results.len()
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response: ApiResponse<()> = ApiResponse {
                success: false,
                message: format!("文件搜索失败: {e}"),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}
