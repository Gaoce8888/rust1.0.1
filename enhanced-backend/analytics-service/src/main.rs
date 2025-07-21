use warp::Filter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;
use tracing::{info, error};

mod api_gateway;
mod services;

use api_gateway::{ApiRequest, ApiResponse};
use services::analytics_service::AnalyticsService;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    info!("📊 数据分析服务启动中...");
    
    // 创建数据分析服务实例
    let analytics_service = AnalyticsService::new().await?;
    let analytics_service = warp::any().map(move || analytics_service.clone());
    
    // 创建路由
    let routes = create_routes(analytics_service);
    
    // 启动服务器
    let port = std::env::var("PORT").unwrap_or_else(|_| "8083".to_string());
    let port: u16 = port.parse().expect("Invalid port number");
    
    info!("🌐 数据分析服务监听端口: {}", port);
    
    warp::serve(routes)
        .run(([0, 0, 0, 0], port))
        .await;
    
    Ok(())
}

fn create_routes(
    analytics_service: impl Filter<Extract = (services::analytics_service::AnalyticsService,)> + Clone + Send + Sync + 'static,
) -> impl Filter<Extract = impl warp::Reply> + Clone {
    // 健康检查路由
    let health_route = warp::path("health")
        .and(warp::get())
        .map(|| {
            let response = ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "service": "analytics-service",
                    "status": "healthy",
                    "timestamp": chrono::Utc::now().timestamp(),
                })),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            warp::reply::json(&response)
        });
    
    // 事件追踪路由
    let track_event_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("track-event"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_track_event);
    
    // 用户行为分析路由
    let user_behavior_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("user-behavior"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_user_behavior);
    
    // 消息分析路由
    let message_analysis_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("message-analysis"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_message_analysis);
    
    // 实时指标路由
    let realtime_metrics_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("realtime-metrics"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_realtime_metrics);
    
    // 智能推荐路由
    let smart_recommendation_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("smart-recommendation"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_smart_recommendation);
    
    // 报告生成路由
    let generate_report_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("generate-report"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_generate_report);
    
    // 仪表板数据路由
    let dashboard_data_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("dashboard-data"))
        .and(warp::post())
        .and(warp::body::json())
        .and(analytics_service.clone())
        .and_then(handle_dashboard_data);
    
    health_route
        .or(track_event_route)
        .or(user_behavior_route)
        .or(message_analysis_route)
        .or(realtime_metrics_route)
        .or(smart_recommendation_route)
        .or(generate_report_route)
        .or(dashboard_data_route)
}

async fn handle_track_event(
    request: ApiRequest<api_gateway::AnalyticsEventRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.track_event(request.data).await {
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
            error!("事件追踪失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("事件追踪失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_user_behavior(
    request: ApiRequest<api_gateway::UserBehaviorRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.analyze_user_behavior(request.data).await {
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
            error!("用户行为分析失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("用户行为分析失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_message_analysis(
    request: ApiRequest<api_gateway::MessageAnalysisRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.analyze_messages(request.data).await {
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
            error!("消息分析失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("消息分析失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_realtime_metrics(
    request: ApiRequest<api_gateway::RealTimeMetricsRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.get_real_time_metrics(request.data).await {
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
            error!("实时指标获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("实时指标获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_smart_recommendation(
    request: ApiRequest<api_gateway::SmartRecommendationRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.get_smart_recommendations(request.data).await {
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
            error!("智能推荐获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("智能推荐获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_generate_report(
    request: ApiRequest<api_gateway::ReportGenerationRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.generate_report(request.data).await {
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
            error!("报告生成失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("报告生成失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_dashboard_data(
    request: ApiRequest<api_gateway::DashboardDataRequest>,
    analytics_service: services::analytics_service::AnalyticsService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match analytics_service.get_dashboard_data(request.data).await {
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
            error!("仪表板数据获取失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("仪表板数据获取失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}