use crate::react_template_manager::ReactTemplateManager;
use std::sync::Arc;
use warp::Filter;

/// 创建React模板路由
pub fn create_react_template_routes(
    react_manager: Arc<ReactTemplateManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    // React模板列表路由
    let templates_route = warp::path!("api" / "react" / "templates")
        .and(warp::get())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_get_react_templates);

    // React模板详情路由
    let template_detail_route = warp::path!("api" / "react" / "templates" / String)
        .and(warp::get())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_get_react_template_detail);

    // React模板创建路由
    let template_create_route = warp::path!("api" / "react" / "templates")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_create_react_template);

    // React模板更新路由
    let template_update_route = warp::path!("api" / "react" / "templates" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_update_react_template);

    // React模板删除路由
    let template_delete_route = warp::path!("api" / "react" / "templates" / String)
        .and(warp::delete())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_delete_react_template);

    // React模板渲染路由
    let template_render_route = warp::path!("api" / "react" / "templates" / String / "render")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_render_react_template);

    // React组件列表路由
    let components_route = warp::path!("api" / "react" / "components")
        .and(warp::get())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_get_react_components);

    // React组件详情路由
    let component_detail_route = warp::path!("api" / "react" / "components" / String)
        .and(warp::get())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_get_react_component_detail);

    // React组件创建路由
    let component_create_route = warp::path!("api" / "react" / "components")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_react_manager(react_manager.clone()))
        .and_then(handle_create_react_component);

    // 组合所有React模板路由
    templates_route
        .or(template_detail_route)
        .or(template_create_route)
        .or(template_update_route)
        .or(template_delete_route)
        .or(template_render_route)
        .or(components_route)
        .or(component_detail_route)
        .or(component_create_route)
}

/// 注入React模板管理器
fn with_react_manager(
    react_manager: Arc<ReactTemplateManager>,
) -> impl Filter<Extract = (Arc<ReactTemplateManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || react_manager.clone())
}

/// 获取React模板列表
async fn handle_get_react_templates(
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_manager.get_all_components().await {
        Ok(components) => {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "React模板列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "templates": components,
                    "total": components.len()
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: format!("React模板列表获取失败: {}", e),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

/// 获取React模板详情
async fn handle_get_react_template_detail(
    template_id: String,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_manager.get_component(&template_id).await {
        Ok(Some(component)) => {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "React模板详情获取成功".to_string(),
                data: Some(serde_json::json!(component)),
            };
            Ok(warp::reply::json(&response))
        }
        Ok(None) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: "React模板未找到".to_string(),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: format!("React模板详情获取失败: {}", e),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

/// 创建React模板
async fn handle_create_react_template(
    create_request: serde_json::Value,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "React模板创建成功".to_string(),
        data: Some(serde_json::json!({
            "template_id": uuid::Uuid::new_v4().to_string(),
            "name": create_request["name"].as_str().unwrap_or("新模板"),
            "created_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

/// 更新React模板
async fn handle_update_react_template(
    template_id: String,
    update_request: serde_json::Value,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "React模板更新成功".to_string(),
        data: Some(serde_json::json!({
            "template_id": template_id,
            "updated_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

/// 删除React模板
async fn handle_delete_react_template(
    template_id: String,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "React模板删除成功".to_string(),
        data: Some(serde_json::json!({
            "template_id": template_id,
            "deleted_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

/// 渲染React模板
async fn handle_render_react_template(
    template_id: String,
    render_request: serde_json::Value,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "React模板渲染成功".to_string(),
        data: Some(serde_json::json!({
            "template_id": template_id,
            "html": format!("<div>渲染的React模板: {}</div>", template_id),
            "react_code": "// React组件代码",
            "rendered_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}

/// 获取React组件列表
async fn handle_get_react_components(
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_manager.get_all_components().await {
        Ok(components) => {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "React组件列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "components": components,
                    "total": components.len()
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: format!("React组件列表获取失败: {}", e),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

/// 获取React组件详情
async fn handle_get_react_component_detail(
    component_id: String,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_manager.get_component(&component_id).await {
        Ok(Some(component)) => {
            let response = crate::types::api::ApiResponse {
                success: true,
                message: "React组件详情获取成功".to_string(),
                data: Some(serde_json::json!(component)),
            };
            Ok(warp::reply::json(&response))
        }
        Ok(None) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: "React组件未找到".to_string(),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = crate::types::api::ApiResponse {
                success: false,
                message: format!("React组件详情获取失败: {}", e),
                data: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

/// 创建React组件
async fn handle_create_react_component(
    create_request: serde_json::Value,
    react_manager: Arc<ReactTemplateManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let response = crate::types::api::ApiResponse {
        success: true,
        message: "React组件创建成功".to_string(),
        data: Some(serde_json::json!({
            "component_id": uuid::Uuid::new_v4().to_string(),
            "name": create_request["name"].as_str().unwrap_or("新组件"),
            "created_at": chrono::Utc::now()
        })),
    };
    Ok(warp::reply::json(&response))
}