/// HTML模板处理器模块
/// 
/// 提供HTML模板的创建、更新、删除、渲染等功能。
/// 支持变量替换、条件渲染、循环等高级特性。
/// 
/// # 功能特性
/// - HTML模板CRUD操作
/// - 动态变量替换
/// - 模板预览和渲染
/// - 模板分类管理
/// - 批量操作支持
/// - 模板导入导出
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;
use tracing::{error, info};
use warp::{reject::Rejection, reply::Reply};

use crate::{
    html_template_manager::{
        HtmlTemplateManager, HtmlTemplateCreateRequest, HtmlTemplateUpdateRequest,
        HtmlRenderRequest, HtmlTemplateListRequest,
    },
    types::{
        api::{ApiResponse, TemplateListQuery},
        auth::AppUserInfo,
    },
};

/// 创建HTML模板处理函数
/// 
/// 创建新的HTML模板
#[utoipa::path(
    post,
    path = "/api/template/create",
    request_body = HtmlTemplateCreateRequest,
    responses(
        (status = 200, description = "模板创建成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 400, description = "请求参数错误", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 将在模板管理API路由中使用
pub async fn handle_create_template(
    template_manager: Arc<HtmlTemplateManager>,
    create_request: HtmlTemplateCreateRequest,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("📝 用户 {} 创建HTML模板: {}", user_info.id, create_request.name);

    let mut request = create_request;
    request.created_by = user_info.id;

    match template_manager.create_template(request).await {
        Ok(template) => {
            info!("📝 HTML模板创建成功: {}", template.id);
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "模板创建成功".to_string(),
                data: Some(json!({
                    "template_id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "created_at": template.created_at,
                })),
            }))
        }
        Err(e) => {
            error!("创建HTML模板失败: {}", e);
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "创建模板失败".to_string(),
                data: None::<()>,
            }))
        }
    }
}

/// 获取HTML模板处理函数
/// 
/// 根据模板ID获取模板详情
#[utoipa::path(
    get,
    path = "/api/template/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    responses(
        (status = 200, description = "获取模板详情成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板查询API，已在Swagger文档中定义
pub async fn handle_get_template(
    template_manager: Arc<HtmlTemplateManager>,
    template_id: String,
    _user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("🔍 获取HTML模板: {}", template_id);

    match template_manager.get_template(&template_id).await {
        Ok(Some(template)) => {
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "获取模板成功".to_string(),
                data: Some(json!({
                    "template_id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "content": template.content,
                    "variables": template.variables,
                    "created_at": template.created_at,
                    "updated_at": template.updated_at,
                })),
            }))
        }
        Ok(None) => {
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "模板不存在".to_string(),
                data: None::<()>,
            }))
        }
        Err(e) => {
            error!("获取HTML模板失败: {}", e);
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "获取模板失败".to_string(),
                data: None::<()>,
            }))
        }
    }
}

/// 更新HTML模板处理函数
/// 
/// 更新指定模板的内容
#[utoipa::path(
    put,
    path = "/api/template/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    request_body = HtmlTemplateUpdateRequest,
    responses(
        (status = 200, description = "模板更新成功", body = crate::types::api::SuccessResponse),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板更新API，已在Swagger文档中定义
pub async fn handle_update_template(
    template_manager: Arc<HtmlTemplateManager>,
    template_id: String,
    update_request: HtmlTemplateUpdateRequest,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("📝 用户 {} 更新HTML模板: {}", user_info.id, template_id);

    match template_manager.update_template(&template_id, update_request).await {
        Ok(_template) => {
            info!("📝 HTML模板更新成功: {}", template_id);
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "模板更新成功".to_string(),
                data: None::<()>,
            }))
        }
        Err(e) => {
            error!("更新HTML模板失败: {}", e);
            let message = if e.to_string().contains("not found") {
                "模板不存在"
            } else {
                "更新模板失败"
            };
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: message.to_string(),
                data: None::<()>,
            }))
        }
    }
}

/// 删除HTML模板处理函数
/// 
/// 删除指定的模板
#[utoipa::path(
    delete,
    path = "/api/template/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    responses(
        (status = 200, description = "模板删除成功", body = crate::types::api::SuccessResponse),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板删除API，已在Swagger文档中定义
pub async fn handle_delete_template(
    template_manager: Arc<HtmlTemplateManager>,
    template_id: String,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("🗑️ 用户 {} 删除HTML模板: {}", user_info.id, template_id);

    match template_manager.delete_template(&template_id).await {
        Ok(true) => {
            info!("🗑️ HTML模板删除成功: {}", template_id);
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "模板删除成功".to_string(),
                data: None::<()>,
            }))
        }
        Ok(false) => {
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "模板不存在".to_string(),
                data: None::<()>,
            }))
        }
        Err(e) => {
            error!("删除HTML模板失败: {}", e);
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "删除模板失败".to_string(),
                data: None::<()>,
            }))
        }
    }
}

/// 渲染HTML模板处理函数
/// 
/// 根据模板ID和变量数据渲染HTML
#[utoipa::path(
    post,
    path = "/api/template/render",
    request_body = HtmlRenderRequest,
    responses(
        (status = 200, description = "模板渲染成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板渲染API，已在Swagger文档中定义
pub async fn handle_render_template(
    template_manager: Arc<HtmlTemplateManager>,
    render_request: HtmlRenderRequest,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("🖼️ 用户 {} 渲染HTML模板: {}", user_info.id, render_request.template_id);

    match template_manager.render_template(render_request).await {
        Ok(render_response) => {
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "模板渲染成功".to_string(),
                data: Some(json!({
                    "message_id": render_response.message_id,
                    "template_id": render_response.template_id,
                    "rendered_html": render_response.rendered_html,
                    "rendered_css": render_response.rendered_css,
                    "rendered_js": render_response.rendered_js,
                })),
            }))
        }
        Err(e) => {
            error!("渲染HTML模板失败: {}", e);
            let message = if e.to_string().contains("not found") {
                "模板不存在"
            } else {
                "模板渲染失败"
            };
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: message.to_string(),
                data: None::<()>,
            }))
        }
    }
}

// 添加占位符函数以满足Swagger配置需求
/// 处理模板列表获取
#[utoipa::path(
    get,
    path = "/api/template/list",
    params(
        ("page" = Option<u32>, Query, description = "页码"),
        ("limit" = Option<u32>, Query, description = "每页条目数"),
        ("category" = Option<String>, Query, description = "模板分类"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
    ),
    responses(
        (status = 200, description = "获取模板列表成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板列表API，已在Swagger文档中定义
pub async fn handle_template_list(
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求模板列表", user_info.name);
    
    // 这里应该实现模板列表获取逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板列表功能待实现"
    })))
}

/// 处理模板创建
#[utoipa::path(
    post,
    path = "/api/template",
    request_body = crate::html_template_manager::HtmlTemplateCreateRequest,
    responses(
        (status = 200, description = "模板创建成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 400, description = "请求参数错误", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板创建API，已在Swagger文档中定义
pub async fn handle_template_create(
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求创建模板", user_info.name);
    
    // 这里应该实现模板创建逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板创建功能待实现"
    })))
}

/// 处理模板更新
#[utoipa::path(
    put,
    path = "/api/template/update/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    request_body = crate::html_template_manager::HtmlTemplateUpdateRequest,
    responses(
        (status = 200, description = "模板更新成功", body = crate::types::api::SuccessResponse),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板更新API路由版本，已在Swagger文档中定义
pub async fn handle_template_update(
    template_id: String,
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求更新模板: {}", user_info.name, template_id);
    
    // 这里应该实现模板更新逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板更新功能待实现"
    })))
}

/// 处理模板删除
#[utoipa::path(
    delete,
    path = "/api/template/delete/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    responses(
        (status = 200, description = "模板删除成功", body = crate::types::api::SuccessResponse),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板删除API路由版本，已在Swagger文档中定义
pub async fn handle_template_delete(
    template_id: String,
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求删除模板: {}", user_info.name, template_id);
    
    // 这里应该实现模板删除逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板删除功能待实现"
    })))
}

/// 处理模板获取
#[utoipa::path(
    get,
    path = "/api/template/get/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    responses(
        (status = 200, description = "获取模板成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板获取API路由版本，已在Swagger文档中定义
pub async fn handle_template_get(
    template_id: String,
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求获取模板: {}", user_info.name, template_id);
    
    // 这里应该实现模板获取逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板获取功能待实现"
    })))
}

/// 处理模板渲染
#[utoipa::path(
    post,
    path = "/api/template/render/{template_id}",
    params(
        ("template_id" = String, Path, description = "模板ID")
    ),
    request_body = crate::html_template_manager::HtmlRenderRequest,
    responses(
        (status = 200, description = "模板渲染成功", body = crate::types::api::ApiResponse<serde_json::Value>),
        (status = 404, description = "模板不存在", body = crate::types::api::ApiError),
        (status = 401, description = "需要认证", body = crate::types::api::ApiError),
    ),
    security(
        ("user_info" = [])
    ),
    tag = "模板"
)]
#[allow(dead_code)] // 企业级功能：模板渲染API路由版本，已在Swagger文档中定义
pub async fn handle_template_render(
    template_id: String,
    _template_manager: Arc<HtmlTemplateManager>,
    user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("用户 {} 请求渲染模板: {}", user_info.name, template_id);
    
    // 这里应该实现模板渲染逻辑
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "模板渲染功能待实现"
    })))
}

/// 预览HTML模板处理函数
/// 
/// 预览HTML模板渲染效果
#[allow(dead_code)] // 将在模板预览API路由中使用
pub async fn handle_preview_template(
    template_manager: Arc<HtmlTemplateManager>,
    template_id: String,
    _user_info: AppUserInfo,
) -> Result<Box<dyn Reply>, Rejection> {
    info!("📝 预览HTML模板: {}", template_id);

    match template_manager.preview_template(&template_id, None).await {
        Ok(html_content) => {
            let response = warp::reply::with_header(
                html_content,
                "content-type",
                "text/html; charset=utf-8",
            );
            Ok(Box::new(response))
        }
        Err(e) => {
            error!("模板预览失败: {:?}", e);
            let error_html = format!(
                r#"
                <!DOCTYPE html>
                <html>
                <head><title>预览错误</title></head>
                <body>
                    <h1>模板预览失败</h1>
                    <p>{}</p>
                </body>
                </html>
                "#,
                e
            );
            let response = warp::reply::with_header(
                error_html,
                "content-type",
                "text/html; charset=utf-8",
            );
            Ok(Box::new(response))
        }
    }
}

/// 获取模板列表处理函数
/// 
/// 获取HTML模板列表，支持分页和过滤
#[allow(dead_code)] // 将在模板列表API路由中使用
pub async fn handle_list_templates(
    template_manager: Arc<HtmlTemplateManager>,
    query: TemplateListQuery,
    _user_info: AppUserInfo,
) -> Result<impl Reply, Rejection> {
    info!("📝 获取HTML模板列表: {:?}", query);

    let request = HtmlTemplateListRequest {
        category: query.category,
        tags: None,
        created_by: None,
        is_active: None,
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(20),
        sort_by: "updated_at".to_string(),
        sort_order: "desc".to_string(),
        search: query.search,
    };

    match template_manager.list_templates(request).await {
        Ok(response) => {
            Ok(warp::reply::json(&ApiResponse {
                success: true,
                message: "获取模板列表成功".to_string(),
                data: Some(response),
            }))
        }
        Err(e) => {
            error!("获取模板列表失败: {:?}", e);
            Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "获取模板列表失败".to_string(),
                data: None::<()>,
            }))
        }
    }
}

/// 获取模板分类处理函数
/// 
/// 获取所有可用的模板分类
#[allow(dead_code)] // 将在模板分类API路由中使用
pub async fn handle_get_template_categories(
    _template_manager: Arc<HtmlTemplateManager>,
) -> Result<impl Reply, Rejection> {
    info!("📝 获取模板分类");

    // 提供默认的模板分类
    let categories = vec![
        json!({"name": "通知", "description": "通知类模板", "color": "#007bff"}),
        json!({"name": "营销", "description": "营销推广模板", "color": "#28a745"}),
        json!({"name": "报告", "description": "报告类模板", "color": "#dc3545"}),
        json!({"name": "邮件", "description": "邮件模板", "color": "#ffc107"}),
        json!({"name": "其他", "description": "其他类型模板", "color": "#6c757d"}),
    ];

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "获取模板分类成功".to_string(),
        data: Some(json!({
            "categories": categories
        })),
    }))
} 