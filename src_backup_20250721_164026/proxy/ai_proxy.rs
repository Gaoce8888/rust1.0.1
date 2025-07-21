use crate::api_gateway::EnhancedServiceConfig;
use crate::proxy::{ProxyService, ProxyError, handle_proxy_request, handle_json_request};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// AI服务请求/响应结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationRequest {
    pub prompt: String,
    pub component_type: String,
    pub style_config: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationResponse {
    pub component_code: String,
    pub component_config: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartReplyRequest {
    pub message: String,
    pub context: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartReplyResponse {
    pub reply: String,
    pub confidence: f64,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceTranscriptionRequest {
    pub audio_url: String,
    pub language: Option<String>,
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceTranscriptionResponse {
    pub transcription: String,
    pub confidence: f64,
    pub language: String,
    pub duration: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SentimentAnalysisRequest {
    pub text: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SentimentAnalysisResponse {
    pub sentiment: String, // positive, negative, neutral
    pub confidence: f64,
    pub emotions: HashMap<String, f64>,
    pub keywords: Vec<String>,
}

pub struct AiProxy {
    config: EnhancedServiceConfig,
}

impl AiProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
}

#[async_trait::async_trait]
impl ProxyService for AiProxy {
    fn get_config(&self) -> &EnhancedServiceConfig {
        &self.config
    }
    
    fn get_service_url(&self) -> &str {
        &self.config.ai_service_url
    }
    
    fn get_service_name(&self) -> &str {
        "ai"
    }
}

impl AiProxy {
    /// 生成AI组件
    pub async fn generate_component(
        &self,
        request: AiComponentGenerationRequest,
    ) -> Result<AiComponentGenerationResponse, ProxyError> {
        handle_proxy_request(self, "component-generation", &request).await
    }
    
    /// 获取智能回复
    pub async fn get_smart_reply(
        &self,
        message: String,
        context: HashMap<String, serde_json::Value>,
    ) -> Result<SmartReplyResponse, ProxyError> {
        let request = SmartReplyRequest {
            message,
            context,
        };
        handle_proxy_request(self, "smart-reply", &request).await
    }
    
    /// 语音转录
    pub async fn transcribe_voice(
        &self,
        audio_url: String,
        language: Option<String>,
        format: String,
    ) -> Result<VoiceTranscriptionResponse, ProxyError> {
        let request = VoiceTranscriptionRequest {
            audio_url,
            language,
            format,
        };
        handle_proxy_request(self, "voice-transcription", &request).await
    }
    
    /// 情感分析
    pub async fn analyze_sentiment(
        &self,
        text: String,
        context: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<SentimentAnalysisResponse, ProxyError> {
        let request = SentimentAnalysisRequest {
            text,
            context,
        };
        handle_proxy_request(self, "sentiment-analysis", &request).await
    }
    
    /// 自动分类
    pub async fn auto_classify(
        &self,
        text: String,
        categories: Vec<String>,
    ) -> Result<HashMap<String, f64>, ProxyError> {
        let request = serde_json::json!({
            "text": text,
            "categories": categories,
        });
        handle_json_request(self, "auto-classify", request).await
    }
}