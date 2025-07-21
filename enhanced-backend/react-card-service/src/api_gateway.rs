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

/// React卡片渲染请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderRequest {
    pub component_data: HashMap<String, serde_json::Value>,
    pub adaptive_styles: HashMap<String, String>,
    pub container_id: String,
}

/// React卡片渲染响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderResponse {
    pub rendered_html: String,
    pub component_script: String,
    pub styles: String,
}

/// React卡片生成请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardGenerationRequest {
    pub card_type: String,
    pub data: HashMap<String, serde_json::Value>,
    pub style_preferences: HashMap<String, String>,
}

/// React卡片生成响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardGenerationResponse {
    pub component_code: String,
    pub component_config: HashMap<String, serde_json::Value>,
    pub adaptive_config: HashMap<String, String>,
}

/// 自适应配置请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AdaptiveConfigRequest {
    pub screen_size: HashMap<String, f64>,
    pub device_type: String,
    pub user_preferences: HashMap<String, serde_json::Value>,
}

/// 自适应配置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AdaptiveConfigResponse {
    pub styles: HashMap<String, String>,
    pub breakpoints: HashMap<String, f64>,
    pub responsive_rules: Vec<HashMap<String, serde_json::Value>>,
}

/// 卡片模板请求
#[derive(Debug, Serialize, Deserialize)]
pub struct CardTemplateRequest {
    pub template_id: String,
    pub variables: HashMap<String, serde_json::Value>,
}

/// 卡片模板响应
#[derive(Debug, Serialize, Deserialize)]
pub struct CardTemplateResponse {
    pub template_code: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}