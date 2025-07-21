use crate::api_gateway::{ApiRequest, ApiResponse, EnhancedServiceConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;

/// AI组件生成请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationRequest {
    pub prompt: String,
    pub component_type: String,
    pub style_config: HashMap<String, serde_json::Value>,
}

/// AI组件生成响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationResponse {
    pub component_code: String,
    pub component_config: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// 智能回复请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartReplyRequest {
    pub message: String,
    pub context: HashMap<String, serde_json::Value>,
}

/// 智能回复响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartReplyResponse {
    pub reply: String,
    pub confidence: f64,
    pub suggestions: Vec<String>,
}

/// 语音转录请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceTranscriptionRequest {
    pub audio_url: String,
    pub language: Option<String>,
    pub format: String,
}

/// 语音转录响应
#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceTranscriptionResponse {
    pub transcription: String,
    pub confidence: f64,
    pub language: String,
    pub duration: f64,
}

/// 情感分析请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SentimentAnalysisRequest {
    pub text: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

/// 情感分析响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SentimentAnalysisResponse {
    pub sentiment: String, // positive, negative, neutral
    pub confidence: f64,
    pub emotions: HashMap<String, f64>,
    pub keywords: Vec<String>,
}

/// AI代理服务
pub struct AiProxy {
    config: EnhancedServiceConfig,
}

impl AiProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
    
    /// 生成AI组件
    pub async fn generate_component(
        &self,
        request: AiComponentGenerationRequest,
    ) -> Result<AiComponentGenerationResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "ai".to_string(),
            endpoint: "generate-component".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<AiComponentGenerationResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.ai_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("AI service error".to_string()).into())
        }
    }
    
    /// 获取智能回复
    pub async fn get_smart_reply(
        &self,
        message: String,
        context: HashMap<String, serde_json::Value>,
    ) -> Result<SmartReplyResponse, Box<dyn std::error::Error>> {
        let request = SmartReplyRequest {
            message,
            context,
        };
        
        let api_request = ApiRequest {
            service: "ai".to_string(),
            endpoint: "smart-reply".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<SmartReplyResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.ai_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("AI service error".to_string()).into())
        }
    }
    
    /// 语音转录
    pub async fn transcribe_voice(
        &self,
        audio_url: String,
        language: Option<String>,
        format: String,
    ) -> Result<VoiceTranscriptionResponse, Box<dyn std::error::Error>> {
        let request = VoiceTranscriptionRequest {
            audio_url,
            language,
            format,
        };
        
        let api_request = ApiRequest {
            service: "ai".to_string(),
            endpoint: "voice-transcription".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<VoiceTranscriptionResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.ai_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("AI service error".to_string()).into())
        }
    }
    
    /// 情感分析
    pub async fn analyze_sentiment(
        &self,
        text: String,
        context: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<SentimentAnalysisResponse, Box<dyn std::error::Error>> {
        let request = SentimentAnalysisRequest {
            text,
            context,
        };
        
        let api_request = ApiRequest {
            service: "ai".to_string(),
            endpoint: "sentiment-analysis".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<SentimentAnalysisResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.ai_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("AI service error".to_string()).into())
        }
    }
    
    /// 自动分类
    pub async fn auto_classify(
        &self,
        text: String,
        categories: Vec<String>,
    ) -> Result<HashMap<String, f64>, Box<dyn std::error::Error>> {
        let request = serde_json::json!({
            "text": text,
            "categories": categories,
        });
        
        let api_request = ApiRequest {
            service: "ai".to_string(),
            endpoint: "auto-classify".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<HashMap<String, f64>> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.ai_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("AI service error".to_string()).into())
        }
    }
}