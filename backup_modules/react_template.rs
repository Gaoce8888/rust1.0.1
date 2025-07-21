use crate::react_template_manager::{
    ReactTemplateManager, ReactCardTemplate, ReactComponent, RenderedCard,
};
use crate::types::UserInfo;
use anyhow::Result;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

/// React模板创建请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactTemplateCreateRequest {
    pub name: String,
    pub description: Option<String>,
    pub card_type: String,
    pub layout: serde_json::Value,
    pub components: Vec<serde_json::Value>,
    pub data_binding: serde_json::Value,
    pub interactions: Vec<serde_json::Value>,
    pub responsive_config: serde_json::Value,
    pub theme_config: serde_json::Value,
}

/// React模板更新请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactTemplateUpdateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub card_type: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub components: Option<Vec<serde_json::Value>>,
    pub data_binding: Option<serde_json::Value>,
    pub interactions: Option<Vec<serde_json::Value>>,
    pub responsive_config: Option<serde_json::Value>,
    pub theme_config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

/// React模板渲染请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactTemplateRenderRequest {
    pub template_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub user_id: String,
}

/// React模板列表请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactTemplateListRequest {
    pub card_type: Option<String>,
    pub is_active: Option<bool>,
    pub created_by: Option<String>,
    pub page: u32,
    pub limit: u32,
    pub sort_by: String,
    pub sort_order: String,
    pub search: Option<String>,
}

/// React模板列表响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactTemplateListResponse {
    pub templates: Vec<ReactCardTemplate>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

/// React组件创建请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactComponentCreateRequest {
    pub name: String,
    pub category: String,
    pub props_schema: serde_json::Value,
    pub component_code: String,
    pub styles: Option<String>,
    pub dependencies: Vec<String>,
}

/// React组件更新请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactComponentUpdateRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub props_schema: Option<serde_json::Value>,
    pub component_code: Option<String>,
    pub styles: Option<String>,
    pub dependencies: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

/// 创建React模板
#[utoipa::path(
    post,
    path = "/api/react/templates",
    request_body = ReactTemplateCreateRequest,
    responses(
        (status = 201, description = "React模板创建成功", body = ReactCardTemplate),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Templates"
)]
pub async fn handle_create_react_template(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    user_info: UserInfo,
    Json(create_request): Json<ReactTemplateCreateRequest>,
) -> Result<(StatusCode, Json<ReactCardTemplate>), (StatusCode, Json<serde_json::Value>)> {
    info!("🎨 用户 {} 创建React模板: {}", user_info.id, create_request.name);

    // 这里应该实现实际的模板创建逻辑
    // 目前返回一个示例模板
    let template = ReactCardTemplate {
        template_id: uuid::Uuid::new_v4().to_string(),
        name: create_request.name,
        description: create_request.description,
        card_type: crate::react_template_manager::CardType::CustomCard,
        layout: crate::react_template_manager::CardLayout {
            width: 400.0,
            height: 300.0,
            padding: 16.0,
            margin: 8.0,
            border_radius: 8.0,
            background_color: "#ffffff".to_string(),
            shadow: None,
        },
        components: vec![],
        data_binding: crate::react_template_manager::DataBindingConfig {
            data_source: crate::react_template_manager::DataSource::Static {
                data: HashMap::new(),
            },
            binding_rules: vec![],
            transformations: vec![],
            validation_rules: vec![],
        },
        interactions: vec![],
        responsive_config: crate::react_template_manager::ResponsiveConfig {
            breakpoints: HashMap::new(),
            mobile_first: true,
            adaptive_layout: true,
        },
        theme_config: crate::react_template_manager::ThemeConfig {
            primary_color: "#007bff".to_string(),
            secondary_color: "#6c757d".to_string(),
            background_color: "#ffffff".to_string(),
            text_color: "#212529".to_string(),
            border_color: "#dee2e6".to_string(),
            font_family: "system-ui".to_string(),
            font_size: 14.0,
        },
        is_active: true,
        created_by: user_info.id,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    info!("🎨 React模板创建成功: {}", template.template_id);
    Ok((StatusCode::CREATED, Json(template)))
}

/// 获取React模板
#[utoipa::path(
    get,
    path = "/api/react/templates/{template_id}",
    responses(
        (status = 200, description = "获取React模板成功", body = ReactCardTemplate),
        (status = 404, description = "模板未找到"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Templates"
)]
pub async fn handle_get_react_template(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    Path(template_id): Path<String>,
) -> Result<Json<ReactCardTemplate>, (StatusCode, Json<serde_json::Value>)> {
    info!("🔍 获取React模板: {}", template_id);

    // 这里应该实现实际的模板获取逻辑
    // 目前返回一个示例模板
    let template = ReactCardTemplate {
        template_id: template_id.clone(),
        name: "示例React模板".to_string(),
        description: Some("这是一个示例React模板".to_string()),
        card_type: crate::react_template_manager::CardType::ProductCard,
        layout: crate::react_template_manager::CardLayout {
            width: 400.0,
            height: 300.0,
            padding: 16.0,
            margin: 8.0,
            border_radius: 8.0,
            background_color: "#ffffff".to_string(),
            shadow: None,
        },
        components: vec![],
        data_binding: crate::react_template_manager::DataBindingConfig {
            data_source: crate::react_template_manager::DataSource::Static {
                data: HashMap::new(),
            },
            binding_rules: vec![],
            transformations: vec![],
            validation_rules: vec![],
        },
        interactions: vec![],
        responsive_config: crate::react_template_manager::ResponsiveConfig {
            breakpoints: HashMap::new(),
            mobile_first: true,
            adaptive_layout: true,
        },
        theme_config: crate::react_template_manager::ThemeConfig {
            primary_color: "#007bff".to_string(),
            secondary_color: "#6c757d".to_string(),
            background_color: "#ffffff".to_string(),
            text_color: "#212529".to_string(),
            border_color: "#dee2e6".to_string(),
            font_family: "system-ui".to_string(),
            font_size: 14.0,
        },
        is_active: true,
        created_by: "system".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    info!("🔍 获取React模板成功: {}", template_id);
    Ok(Json(template))
}

/// 更新React模板
#[utoipa::path(
    put,
    path = "/api/react/templates/{template_id}",
    request_body = ReactTemplateUpdateRequest,
    responses(
        (status = 200, description = "React模板更新成功", body = ReactCardTemplate),
        (status = 404, description = "模板未找到"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Templates"
)]
pub async fn handle_update_react_template(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    Path(template_id): Path<String>,
    user_info: UserInfo,
    Json(update_request): Json<ReactTemplateUpdateRequest>,
) -> Result<Json<ReactCardTemplate>, (StatusCode, Json<serde_json::Value>)> {
    info!("📝 用户 {} 更新React模板: {}", user_info.id, template_id);

    // 这里应该实现实际的模板更新逻辑
    // 目前返回一个示例模板
    let template = ReactCardTemplate {
        template_id: template_id.clone(),
        name: update_request.name.unwrap_or_else(|| "更新后的React模板".to_string()),
        description: update_request.description,
        card_type: crate::react_template_manager::CardType::ProductCard,
        layout: crate::react_template_manager::CardLayout {
            width: 400.0,
            height: 300.0,
            padding: 16.0,
            margin: 8.0,
            border_radius: 8.0,
            background_color: "#ffffff".to_string(),
            shadow: None,
        },
        components: vec![],
        data_binding: crate::react_template_manager::DataBindingConfig {
            data_source: crate::react_template_manager::DataSource::Static {
                data: HashMap::new(),
            },
            binding_rules: vec![],
            transformations: vec![],
            validation_rules: vec![],
        },
        interactions: vec![],
        responsive_config: crate::react_template_manager::ResponsiveConfig {
            breakpoints: HashMap::new(),
            mobile_first: true,
            adaptive_layout: true,
        },
        theme_config: crate::react_template_manager::ThemeConfig {
            primary_color: "#007bff".to_string(),
            secondary_color: "#6c757d".to_string(),
            background_color: "#ffffff".to_string(),
            text_color: "#212529".to_string(),
            border_color: "#dee2e6".to_string(),
            font_family: "system-ui".to_string(),
            font_size: 14.0,
        },
        is_active: update_request.is_active.unwrap_or(true),
        created_by: "system".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    info!("📝 React模板更新成功: {}", template_id);
    Ok(Json(template))
}

/// 删除React模板
#[utoipa::path(
    delete,
    path = "/api/react/templates/{template_id}",
    responses(
        (status = 200, description = "React模板删除成功"),
        (status = 404, description = "模板未找到"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Templates"
)]
pub async fn handle_delete_react_template(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    Path(template_id): Path<String>,
    user_info: UserInfo,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    info!("🗑️ 用户 {} 删除React模板: {}", user_info.id, template_id);

    // 这里应该实现实际的模板删除逻辑
    info!("🗑️ React模板删除成功: {}", template_id);
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "React模板删除成功",
        "template_id": template_id
    })))
}

/// 渲染React模板
#[utoipa::path(
    post,
    path = "/api/react/templates/{template_id}/render",
    request_body = ReactTemplateRenderRequest,
    responses(
        (status = 200, description = "React模板渲染成功", body = RenderedCard),
        (status = 404, description = "模板未找到"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Templates"
)]
pub async fn handle_render_react_template(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    Path(template_id): Path<String>,
    Json(render_request): Json<ReactTemplateRenderRequest>,
) -> Result<Json<RenderedCard>, (StatusCode, Json<serde_json::Value>)> {
    info!("🎨 渲染React模板: {}", template_id);

    // 这里应该实现实际的模板渲染逻辑
    let rendered_card = RenderedCard {
        template_id: template_id.clone(),
        html: format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>React Card - {}</title>
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            </head>
            <body>
                <div id="react-card-root"></div>
                <script type="text/babel">
                    const ProductCard = ({{ title, price, image, description, rating = 0 }}) => {{
                        const [isHovered, setIsHovered] = React.useState(false);
                        
                        return (
                            <div className="product-card" 
                                 onMouseEnter={() => setIsHovered(true)}
                                 onMouseLeave={() => setIsHovered(false)}>
                                <img src="{{image}}" alt="{{title}}" style="width: 100%; height: 200px; object-fit: cover;" />
                                <div style="padding: 16px;">
                                    <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">{{title}}</h3>
                                    {{description && <p style="font-size: 14px; color: #666; margin-bottom: 12px;">{{description}}</p>}}
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-size: 20px; font-weight: bold; color: #007bff;">¥{{price}}</span>
                                        <button style="padding: 8px 16px; background-color: {{isHovered ? '#007bff' : 'transparent'}}; color: {{isHovered ? 'white' : '#007bff'}}; border: 1px solid #007bff; border-radius: 4px; cursor: pointer;">
                                            查看详情
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }};
                    
                    const data = {{{}}};
                    ReactDOM.render(<ProductCard {{...data}} />, document.getElementById('react-card-root'));
                </script>
            </body>
            </html>
            "#,
            template_id,
            serde_json::to_string(&render_request.data).unwrap_or_else(|_| "{}".to_string())
        ),
        react_code: "// React组件代码".to_string(),
        metadata: crate::react_template_manager::RenderedCardMetadata {
            render_time: chrono::Utc::now(),
            component_count: 1,
            data_bindings: render_request.data,
            render_duration_ms: 100,
        },
    };

    info!("🎨 React模板渲染成功: {}", template_id);
    Ok(Json(rendered_card))
}

/// 获取React组件列表
#[utoipa::path(
    get,
    path = "/api/react/components",
    responses(
        (status = 200, description = "获取React组件列表成功", body = Vec<ReactComponent>),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Components"
)]
pub async fn handle_get_react_components(
    State(react_manager): State<Arc<ReactTemplateManager>>,
) -> Result<Json<Vec<ReactComponent>>, (StatusCode, Json<serde_json::Value>)> {
    info!("🔍 获取React组件列表");

    match react_manager.get_all_components().await {
        Ok(components) => {
            info!("🔍 获取React组件列表成功: {} 个组件", components.len());
            Ok(Json(components))
        }
        Err(e) => {
            error!("❌ 获取React组件列表失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "获取React组件列表失败",
                    "message": e.to_string()
                }))
            ))
        }
    }
}

/// 创建React组件
#[utoipa::path(
    post,
    path = "/api/react/components",
    request_body = ReactComponentCreateRequest,
    responses(
        (status = 201, description = "React组件创建成功", body = ReactComponent),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Components"
)]
pub async fn handle_create_react_component(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    user_info: UserInfo,
    Json(create_request): Json<ReactComponentCreateRequest>,
) -> Result<(StatusCode, Json<ReactComponent>), (StatusCode, Json<serde_json::Value>)> {
    info!("🎨 用户 {} 创建React组件: {}", user_info.id, create_request.name);

    // 这里应该实现实际的组件创建逻辑
    let component = ReactComponent {
        component_id: uuid::Uuid::new_v4().to_string(),
        name: create_request.name,
        category: crate::react_template_manager::ComponentCategory::Custom,
        props_schema: create_request.props_schema,
        default_props: HashMap::new(),
        component_code: create_request.component_code,
        styles: create_request.styles,
        dependencies: create_request.dependencies,
        version: "1.0.0".to_string(),
        is_active: true,
        created_by: user_info.id,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    info!("🎨 React组件创建成功: {}", component.component_id);
    Ok((StatusCode::CREATED, Json(component)))
}

/// 获取React组件
#[utoipa::path(
    get,
    path = "/api/react/components/{component_id}",
    responses(
        (status = 200, description = "获取React组件成功", body = ReactComponent),
        (status = 404, description = "组件未找到"),
        (status = 500, description = "服务器内部错误")
    ),
    tag = "React Components"
)]
pub async fn handle_get_react_component(
    State(react_manager): State<Arc<ReactTemplateManager>>,
    Path(component_id): Path<String>,
) -> Result<Json<ReactComponent>, (StatusCode, Json<serde_json::Value>)> {
    info!("🔍 获取React组件: {}", component_id);

    match react_manager.get_component(&component_id).await {
        Ok(Some(component)) => {
            info!("🔍 获取React组件成功: {}", component_id);
            Ok(Json(component))
        }
        Ok(None) => {
            error!("❌ React组件未找到: {}", component_id);
            Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "React组件未找到",
                    "component_id": component_id
                }))
            ))
        }
        Err(e) => {
            error!("❌ 获取React组件失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "获取React组件失败",
                    "message": e.to_string()
                }))
            ))
        }
    }
}