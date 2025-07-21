use crate::api_gateway::EnhancedServiceConfig;
use crate::proxy::{ProxyService, ProxyError, handle_proxy_request, handle_json_request};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 数据分析服务请求/响应结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventRequest {
    pub event_type: String,
    pub event_data: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventResponse {
    pub event_id: String,
    pub processed: bool,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorRequest {
    pub user_id: String,
    pub time_range: HashMap<String, i64>,
    pub event_types: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorResponse {
    pub behaviors: Vec<HashMap<String, serde_json::Value>>,
    pub patterns: HashMap<String, f64>,
    pub insights: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisRequest {
    pub messages: Vec<String>,
    pub analysis_type: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisResponse {
    pub analysis_results: Vec<HashMap<String, serde_json::Value>>,
    pub summary: HashMap<String, f64>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsRequest {
    pub metric_types: Vec<String>,
    pub time_window: i64,
    pub filters: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsResponse {
    pub metrics: HashMap<String, f64>,
    pub trends: HashMap<String, Vec<f64>>,
    pub alerts: Vec<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationRequest {
    pub user_id: String,
    pub context: HashMap<String, serde_json::Value>,
    pub recommendation_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationResponse {
    pub recommendations: Vec<HashMap<String, serde_json::Value>>,
    pub confidence_scores: Vec<f64>,
    pub reasoning: Vec<String>,
}

pub struct AnalyticsProxy {
    config: EnhancedServiceConfig,
}

impl AnalyticsProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
}

#[async_trait::async_trait]
impl ProxyService for AnalyticsProxy {
    fn get_config(&self) -> &EnhancedServiceConfig {
        &self.config
    }
    
    fn get_service_url(&self) -> &str {
        &self.config.analytics_service_url
    }
    
    fn get_service_name(&self) -> &str {
        "analytics"
    }
}

impl AnalyticsProxy {
    /// 记录分析事件
    pub async fn record_event(
        &self,
        request: AnalyticsEventRequest,
    ) -> Result<AnalyticsEventResponse, ProxyError> {
        handle_proxy_request(self, "record-event", &request).await
    }
    
    /// 分析用户行为
    pub async fn analyze_user_behavior(
        &self,
        request: UserBehaviorRequest,
    ) -> Result<UserBehaviorResponse, ProxyError> {
        handle_proxy_request(self, "user-behavior", &request).await
    }
    
    /// 分析消息
    pub async fn analyze_messages(
        &self,
        request: MessageAnalysisRequest,
    ) -> Result<MessageAnalysisResponse, ProxyError> {
        handle_proxy_request(self, "message-analysis", &request).await
    }
    
    /// 获取实时指标
    pub async fn get_real_time_metrics(
        &self,
        request: RealTimeMetricsRequest,
    ) -> Result<RealTimeMetricsResponse, ProxyError> {
        handle_proxy_request(self, "real-time-metrics", &request).await
    }
    
    /// 获取智能推荐
    pub async fn get_smart_recommendations(
        &self,
        request: SmartRecommendationRequest,
    ) -> Result<SmartRecommendationResponse, ProxyError> {
        handle_proxy_request(self, "smart-recommendations", &request).await
    }
    
    /// 获取分析报告
    pub async fn get_analytics_report(
        &self,
        report_type: String,
        time_range: HashMap<String, i64>,
        filters: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({
            "report_type": report_type,
            "time_range": time_range,
            "filters": filters,
        });
        
        handle_json_request(self, "analytics-report", request).await
    }
    
    /// 获取数据导出
    pub async fn export_data(
        &self,
        export_type: String,
        format: String,
        filters: HashMap<String, serde_json::Value>,
    ) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({
            "export_type": export_type,
            "format": format,
            "filters": filters,
        });
        
        handle_json_request(self, "export-data", request).await
    }
    
    /// 获取数据质量报告
    pub async fn get_data_quality_report(
        &self,
        data_source: String,
        time_range: HashMap<String, i64>,
    ) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({
            "data_source": data_source,
            "time_range": time_range,
        });
        
        handle_json_request(self, "data-quality", request).await
    }
    
    /// 获取预测分析
    pub async fn get_predictive_analytics(
        &self,
        prediction_type: String,
        input_data: HashMap<String, serde_json::Value>,
        time_horizon: i64,
    ) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({
            "prediction_type": prediction_type,
            "input_data": input_data,
            "time_horizon": time_horizon,
        });
        
        handle_json_request(self, "predictive-analytics", request).await
    }
}