use warp::Filter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;
use reqwest::Client;
use tokio::time::{timeout, Duration};

/// 统一的API请求格式
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRequest<T> {
    pub service: String,
    pub endpoint: String,
    pub data: T,
    pub timestamp: i64,
}

/// 统一的API响应格式
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: i64,
}

/// 增强服务配置
#[derive(Debug, Clone)]
pub struct EnhancedServiceConfig {
    pub ai_service_url: String,
    pub react_card_service_url: String,
    pub analytics_service_url: String,
    pub enterprise_service_url: String,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

impl Default for EnhancedServiceConfig {
    fn default() -> Self {
        Self {
            ai_service_url: "http://localhost:8081".to_string(),
            react_card_service_url: "http://localhost:8082".to_string(),
            analytics_service_url: "http://localhost:8083".to_string(),
            enterprise_service_url: "http://localhost:8084".to_string(),
            timeout_seconds: 30,
            retry_attempts: 3,
        }
    }
}

/// 转发请求到增强服务
pub async fn forward_to_enhanced_service<T: Serialize + for<'de> Deserialize<'de>>(
    request: ApiRequest<T>,
    enhanced_service_url: String,
    timeout_duration: Duration,
) -> Result<ApiResponse<T>, Box<dyn std::error::Error>> {
    let client = Client::new();
    
    let response = timeout(
        timeout_duration,
        client
            .post(&format!("{}/api/v1/{}", enhanced_service_url, request.endpoint))
            .json(&request)
            .send()
    ).await??;
    
    let api_response: ApiResponse<T> = response.json().await?;
    Ok(api_response)
}

/// 获取服务URL
pub fn get_service_url(service_name: &str, config: &EnhancedServiceConfig) -> Option<String> {
    match service_name {
        "ai" => Some(config.ai_service_url.clone()),
        "react-card" => Some(config.react_card_service_url.clone()),
        "analytics" => Some(config.analytics_service_url.clone()),
        "enterprise" => Some(config.enterprise_service_url.clone()),
        _ => None,
    }
}

/// 创建API网关路由
pub fn create_api_gateway_routes(
    config: EnhancedServiceConfig,
) -> impl Filter<Extract = impl warp::Reply> + Clone {
    let config = warp::any().map(move || config.clone());
    
    // AI服务路由
    let ai_routes = warp::path("ai")
        .and(warp::path::param())
        .and(warp::body::json())
        .and(config.clone())
        .and_then(handle_ai_request);
    
    // React卡片服务路由
    let react_card_routes = warp::path("react-card")
        .and(warp::path::param())
        .and(warp::body::json())
        .and(config.clone())
        .and_then(handle_react_card_request);
    
    // 数据分析服务路由
    let analytics_routes = warp::path("analytics")
        .and(warp::path::param())
        .and(warp::body::json())
        .and(config.clone())
        .and_then(handle_analytics_request);
    
    // 企业级服务路由
    let enterprise_routes = warp::path("enterprise")
        .and(warp::path::param())
        .and(warp::body::json())
        .and(config.clone())
        .and_then(handle_enterprise_request);
    
    // 健康检查路由
    let health_routes = warp::path("health")
        .and(config.clone())
        .and_then(handle_health_check);
    
    ai_routes
        .or(react_card_routes)
        .or(analytics_routes)
        .or(enterprise_routes)
        .or(health_routes)
}

/// 处理AI服务请求
async fn handle_ai_request(
    endpoint: String,
    data: serde_json::Value,
    config: EnhancedServiceConfig,
) -> Result<impl warp::Reply, warp::Rejection> {
    let request = ApiRequest {
        service: "ai".to_string(),
        endpoint,
        data,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let service_url = get_service_url("ai", &config)
        .ok_or_else(|| warp::reject::not_found())?;
    
    let timeout_duration = Duration::from_secs(config.timeout_seconds);
    
    match forward_to_enhanced_service(request, service_url, timeout_duration).await {
        Ok(response) => Ok(warp::reply::json(&response)),
        Err(e) => {
            let error_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("AI service error: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&error_response))
        }
    }
}

/// 处理React卡片服务请求
async fn handle_react_card_request(
    endpoint: String,
    data: serde_json::Value,
    config: EnhancedServiceConfig,
) -> Result<impl warp::Reply, warp::Rejection> {
    let request = ApiRequest {
        service: "react-card".to_string(),
        endpoint,
        data,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let service_url = get_service_url("react-card", &config)
        .ok_or_else(|| warp::reject::not_found())?;
    
    let timeout_duration = Duration::from_secs(config.timeout_seconds);
    
    match forward_to_enhanced_service(request, service_url, timeout_duration).await {
        Ok(response) => Ok(warp::reply::json(&response)),
        Err(e) => {
            let error_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("React Card service error: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&error_response))
        }
    }
}

/// 处理数据分析服务请求
async fn handle_analytics_request(
    endpoint: String,
    data: serde_json::Value,
    config: EnhancedServiceConfig,
) -> Result<impl warp::Reply, warp::Rejection> {
    let request = ApiRequest {
        service: "analytics".to_string(),
        endpoint,
        data,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let service_url = get_service_url("analytics", &config)
        .ok_or_else(|| warp::reject::not_found())?;
    
    let timeout_duration = Duration::from_secs(config.timeout_seconds);
    
    match forward_to_enhanced_service(request, service_url, timeout_duration).await {
        Ok(response) => Ok(warp::reply::json(&response)),
        Err(e) => {
            let error_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Analytics service error: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&error_response))
        }
    }
}

/// 处理企业级服务请求
async fn handle_enterprise_request(
    endpoint: String,
    data: serde_json::Value,
    config: EnhancedServiceConfig,
) -> Result<impl warp::Reply, warp::Rejection> {
    let request = ApiRequest {
        service: "enterprise".to_string(),
        endpoint,
        data,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let service_url = get_service_url("enterprise", &config)
        .ok_or_else(|| warp::reject::not_found())?;
    
    let timeout_duration = Duration::from_secs(config.timeout_seconds);
    
    match forward_to_enhanced_service(request, service_url, timeout_duration).await {
        Ok(response) => Ok(warp::reply::json(&response)),
        Err(e) => {
            let error_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Enterprise service error: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&error_response))
        }
    }
}

/// 处理健康检查请求
async fn handle_health_check(
    config: EnhancedServiceConfig,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut health_status = HashMap::new();
    
    let services = vec![
        ("ai", config.ai_service_url.clone()),
        ("react-card", config.react_card_service_url.clone()),
        ("analytics", config.analytics_service_url.clone()),
        ("enterprise", config.enterprise_service_url.clone()),
    ];
    
    for (name, url) in services {
        let is_healthy = check_service_health(&url, Duration::from_secs(5)).await;
        health_status.insert(name.to_string(), is_healthy);
    }
    
    let response = ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "services": health_status,
            "timestamp": chrono::Utc::now().timestamp(),
        })),
        error: None,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    Ok(warp::reply::json(&response))
}

/// 检查服务健康状态
async fn check_service_health(service_url: &str, timeout_duration: Duration) -> bool {
    let client = Client::new();
    
    match timeout(
        timeout_duration,
        client.get(&format!("{}/health", service_url)).send()
    ).await {
        Ok(Ok(response)) => response.status().is_success(),
        _ => false,
    }
}