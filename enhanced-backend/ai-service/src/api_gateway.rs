use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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