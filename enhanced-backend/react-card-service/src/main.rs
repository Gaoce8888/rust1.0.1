use warp::Filter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;
use tracing::{info, error};

mod api_gateway;
mod services;

use api_gateway::{ApiRequest, ApiResponse};
use services::react_card_service::ReactCardService;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    info!("🎨 React卡片服务启动中...");
    
    // 创建React卡片服务实例
    let react_card_service = ReactCardService::new()?;
    let react_card_service = warp::any().map(move || react_card_service.clone());
    
    // 创建路由
    let routes = create_routes(react_card_service);
    
    // 启动服务器
    let port = std::env::var("PORT").unwrap_or_else(|_| "8082".to_string());
    let port: u16 = port.parse().expect("Invalid port number");
    
    info!("🌐 React卡片服务监听端口: {}", port);
    
    warp::serve(routes)
        .run(([0, 0, 0, 0], port))
        .await;
    
    Ok(())
}

fn create_routes(
    react_card_service: impl Filter<Extract = (services::react_card_service::ReactCardService,)> + Clone + Send + Sync + 'static,
) -> impl Filter<Extract = impl warp::Reply> + Clone {
    // 健康检查路由
    let health_route = warp::path("health")
        .and(warp::get())
        .map(|| {
            let response = ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "service": "react-card-service",
                    "status": "healthy",
                    "timestamp": chrono::Utc::now().timestamp(),
                })),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            warp::reply::json(&response)
        });
    
    // React卡片渲染路由
    let render_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("render"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_render_card);
    
    // React卡片生成路由
    let generate_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("generate"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_generate_card);
    
    // 自适应配置路由
    let adaptive_config_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("adaptive-config"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_adaptive_config);
    
    // 模板管理路由
    let template_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("template"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_get_template);
    
    // 保存模板路由
    let save_template_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("save-template"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_save_template);
    
    // 模板列表路由
    let template_list_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("template-list"))
        .and(warp::post())
        .and(warp::body::json())
        .and(react_card_service.clone())
        .and_then(handle_template_list);
    
    health_route
        .or(render_route)
        .or(generate_route)
        .or(adaptive_config_route)
        .or(template_route)
        .or(save_template_route)
        .or(template_list_route)
}

async fn handle_render_card(
    request: ApiRequest<api_gateway::ReactCardRenderRequest>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_card_service.render_card(request.data).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("React卡片渲染失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("React卡片渲染失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_generate_card(
    request: ApiRequest<api_gateway::ReactCardGenerationRequest>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_card_service.generate_card(request.data).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("React卡片生成失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("React卡片生成失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_adaptive_config(
    request: ApiRequest<api_gateway::AdaptiveConfigRequest>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_card_service.get_adaptive_config(request.data).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("自适应配置获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("自适应配置获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_get_template(
    request: ApiRequest<api_gateway::CardTemplateRequest>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_card_service.get_card_template(request.data).await {
        Ok(response) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("卡片模板获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("卡片模板获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_save_template(
    request: ApiRequest<serde_json::Value>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    let template_code = request.data["template_code"].as_str().unwrap_or("");
    let variables = request.data["variables"].as_object().unwrap_or(&serde_json::Map::new()).clone();
    let metadata = request.data["metadata"].as_object().unwrap_or(&serde_json::Map::new()).clone();
    
    match react_card_service.save_card_template(template_code.to_string(), variables, metadata).await {
        Ok(template_id) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "template_id": template_id,
                    "message": "模板保存成功"
                })),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("卡片模板保存失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("卡片模板保存失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_template_list(
    _request: ApiRequest<serde_json::Value>,
    react_card_service: services::react_card_service::ReactCardService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match react_card_service.get_template_list().await {
        Ok(templates) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(templates),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("模板列表获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("模板列表获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}