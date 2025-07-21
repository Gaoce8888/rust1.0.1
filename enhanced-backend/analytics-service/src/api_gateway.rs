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

/// 分析事件请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventRequest {
    pub event_type: String,
    pub user_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
}

/// 分析事件响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventResponse {
    pub event_id: String,
    pub status: String,
    pub processed_at: i64,
}

/// 用户行为请求
#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorRequest {
    pub user_id: String,
    pub time_range: HashMap<String, i64>,
    pub behavior_types: Vec<String>,
}

/// 用户行为响应
#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorResponse {
    pub user_id: String,
    pub behavior_patterns: Vec<HashMap<String, serde_json::Value>>,
    pub engagement_score: f64,
    pub recommendations: Vec<String>,
}

/// 消息分析请求
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisRequest {
    pub user_id: String,
    pub time_range: HashMap<String, i64>,
    pub analysis_types: Vec<String>,
}

/// 消息分析响应
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisResponse {
    pub user_id: String,
    pub message_stats: HashMap<String, serde_json::Value>,
    pub sentiment_analysis: HashMap<String, f64>,
    pub topic_analysis: Vec<HashMap<String, serde_json::Value>>,
}

/// 实时指标请求
#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsRequest {
    pub metric_types: Vec<String>,
    pub time_window: i64,
}

/// 实时指标响应
#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsResponse {
    pub metrics: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
    pub update_interval: i64,
}

/// 智能推荐请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationRequest {
    pub user_id: String,
    pub context: HashMap<String, serde_json::Value>,
    pub recommendation_types: Vec<String>,
}

/// 智能推荐响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationResponse {
    pub user_id: String,
    pub recommendations: Vec<HashMap<String, serde_json::Value>>,
    pub confidence_scores: HashMap<String, f64>,
    pub reasoning: Vec<String>,
}

/// 报告生成请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ReportGenerationRequest {
    pub report_type: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub format: String,
}

/// 报告生成响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ReportGenerationResponse {
    pub report_id: String,
    pub report_url: String,
    pub generated_at: i64,
    pub expires_at: i64,
}

/// 仪表板数据请求
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardDataRequest {
    pub dashboard_type: String,
    pub filters: HashMap<String, serde_json::Value>,
    pub time_range: HashMap<String, i64>,
}

/// 仪表板数据响应
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardDataResponse {
    pub dashboard_type: String,
    pub widgets: Vec<HashMap<String, serde_json::Value>>,
    pub last_updated: i64,
    pub refresh_interval: i64,
}