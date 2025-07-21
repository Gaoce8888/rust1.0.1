use warp::Filter;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;
use tracing::{info, error};

mod api_gateway;
mod services;

use api_gateway::{ApiRequest, ApiResponse};
use services::ai_service::AiService;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    info!("🚀 AI服务启动中...");
    
    // 创建AI服务实例
    let ai_service = AiService::new()?;
    let ai_service = warp::any().map(move || ai_service.clone());
    
    // 创建路由
    let routes = create_routes(ai_service);
    
    // 启动服务器
    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let port: u16 = port.parse().expect("Invalid port number");
    
    info!("🌐 AI服务监听端口: {}", port);
    
    warp::serve(routes)
        .run(([0, 0, 0, 0], port))
        .await;
    
    Ok(())
}

fn create_routes(
    ai_service: impl Filter<Extract = (services::ai_service::AiService,)> + Clone + Send + Sync + 'static,
) -> impl Filter<Extract = impl warp::Reply> + Clone {
    // 健康检查路由
    let health_route = warp::path("health")
        .and(warp::get())
        .map(|| {
            let response = ApiResponse {
                success: true,
                data: Some(serde_json::json!({
                    "service": "ai-service",
                    "status": "healthy",
                    "timestamp": chrono::Utc::now().timestamp(),
                })),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            warp::reply::json(&response)
        });
    
    // AI组件生成路由
    let generate_component_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("generate-component"))
        .and(warp::post())
        .and(warp::body::json())
        .and(ai_service.clone())
        .and_then(handle_generate_component);
    
    // 智能回复路由
    let smart_reply_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("smart-reply"))
        .and(warp::post())
        .and(warp::body::json())
        .and(ai_service.clone())
        .and_then(handle_smart_reply);
    
    // 语音转录路由
    let voice_transcription_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("voice-transcription"))
        .and(warp::post())
        .and(warp::body::json())
        .and(ai_service.clone())
        .and_then(handle_voice_transcription);
    
    // 情感分析路由
    let sentiment_analysis_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("sentiment-analysis"))
        .and(warp::post())
        .and(warp::body::json())
        .and(ai_service.clone())
        .and_then(handle_sentiment_analysis);
    
    // 自动分类路由
    let auto_classify_route = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("auto-classify"))
        .and(warp::post())
        .and(warp::body::json())
        .and(ai_service.clone())
        .and_then(handle_auto_classify);
    
    health_route
        .or(generate_component_route)
        .or(smart_reply_route)
        .or(voice_transcription_route)
        .or(sentiment_analysis_route)
        .or(auto_classify_route)
}

async fn handle_generate_component(
    request: ApiRequest<api_gateway::AiComponentGenerationRequest>,
    ai_service: services::ai_service::AiService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match ai_service.generate_component(request.data).await {
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
            error!("AI组件生成失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("AI组件生成失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_smart_reply(
    request: ApiRequest<api_gateway::SmartReplyRequest>,
    ai_service: services::ai_service::AiService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match ai_service.generate_smart_reply(&request.data.message, &request.data.context).await {
        Ok(reply) => {
            let response = api_gateway::SmartReplyResponse {
                reply,
                confidence: 0.85,
                suggestions: vec!["感谢您的咨询".to_string(), "还有其他问题吗？".to_string()],
            };
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("智能回复生成失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("智能回复生成失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_voice_transcription(
    request: ApiRequest<api_gateway::VoiceTranscriptionRequest>,
    ai_service: services::ai_service::AiService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match ai_service.transcribe_voice(&request.data.audio_url, request.data.language.as_deref(), &request.data.format).await {
        Ok(transcription) => {
            let response = api_gateway::VoiceTranscriptionResponse {
                transcription,
                confidence: 0.92,
                language: request.data.language.unwrap_or_else(|| "zh-CN".to_string()),
                duration: 0.0,
            };
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("语音转录失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("语音转录失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_sentiment_analysis(
    request: ApiRequest<api_gateway::SentimentAnalysisRequest>,
    ai_service: services::ai_service::AiService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match ai_service.analyze_sentiment(&request.data.text, request.data.context.as_ref()).await {
        Ok(sentiment) => {
            let response = api_gateway::SentimentAnalysisResponse {
                sentiment,
                confidence: 0.88,
                emotions: HashMap::new(),
                keywords: vec![],
            };
            let api_response = ApiResponse {
                success: true,
                data: Some(response),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("情感分析失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("情感分析失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}

async fn handle_auto_classify(
    request: ApiRequest<serde_json::Value>,
    ai_service: services::ai_service::AiService,
) -> Result<impl warp::Reply, warp::Rejection> {
    let text = request.data["text"].as_str().unwrap_or("");
    let categories = request.data["categories"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|v| v.as_str())
        .map(|s| s.to_string())
        .collect();
    
    match ai_service.auto_classify(text, categories).await {
        Ok(classification) => {
            let api_response = ApiResponse {
                success: true,
                data: Some(classification),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
        Err(e) => {
            error!("自动分类失败: {}", e);
            let api_response = ApiResponse {
                success: false,
                data: None,
                error: Some(format!("自动分类失败: {}", e)),
                timestamp: chrono::Utc::now().timestamp(),
            };
            Ok(warp::reply::json(&api_response))
        }
    }
}