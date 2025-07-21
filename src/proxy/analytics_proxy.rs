use crate::api_gateway::{ApiRequest, ApiResponse, EnhancedServiceConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;

/// 数据分析事件请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventRequest {
    pub event_type: String,
    pub user_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
}

/// 数据分析事件响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEventResponse {
    pub insights: HashMap<String, serde_json::Value>,
    pub recommendations: Vec<String>,
    pub metrics: HashMap<String, f64>,
}

/// 用户行为分析请求
#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorRequest {
    pub user_id: String,
    pub time_range: String, // "1h", "24h", "7d", "30d"
    pub event_types: Vec<String>,
}

/// 用户行为分析响应
#[derive(Debug, Serialize, Deserialize)]
pub struct UserBehaviorResponse {
    pub behavior_patterns: Vec<HashMap<String, serde_json::Value>>,
    pub session_analysis: HashMap<String, f64>,
    pub engagement_metrics: HashMap<String, f64>,
    pub recommendations: Vec<String>,
}

/// 消息统计分析请求
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisRequest {
    pub time_range: String,
    pub message_types: Vec<String>,
    pub user_groups: Option<Vec<String>>,
}

/// 消息统计分析响应
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageAnalysisResponse {
    pub message_volume: HashMap<String, i64>,
    pub response_times: HashMap<String, f64>,
    pub sentiment_distribution: HashMap<String, f64>,
    pub popular_topics: Vec<HashMap<String, serde_json::Value>>,
    pub quality_metrics: HashMap<String, f64>,
}

/// 实时指标请求
#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsRequest {
    pub metric_types: Vec<String>,
    pub time_window: String, // "1m", "5m", "15m", "1h"
}

/// 实时指标响应
#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeMetricsResponse {
    pub current_metrics: HashMap<String, f64>,
    pub trend_data: Vec<HashMap<String, serde_json::Value>>,
    pub alerts: Vec<HashMap<String, serde_json::Value>>,
}

/// 智能推荐请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationRequest {
    pub user_id: String,
    pub context: HashMap<String, serde_json::Value>,
    pub recommendation_type: String, // "response", "workflow", "training"
}

/// 智能推荐响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartRecommendationResponse {
    pub recommendations: Vec<HashMap<String, serde_json::Value>>,
    pub confidence_scores: Vec<f64>,
    pub reasoning: Vec<String>,
}

/// 数据分析代理服务
pub struct AnalyticsProxy {
    config: EnhancedServiceConfig,
}

impl AnalyticsProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
    
    /// 跟踪分析事件
    pub async fn track_event(
        &self,
        request: AnalyticsEventRequest,
    ) -> Result<AnalyticsEventResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "track-event".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<AnalyticsEventResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 分析用户行为
    pub async fn analyze_user_behavior(
        &self,
        request: UserBehaviorRequest,
    ) -> Result<UserBehaviorResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "user-behavior".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<UserBehaviorResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 分析消息统计
    pub async fn analyze_messages(
        &self,
        request: MessageAnalysisRequest,
    ) -> Result<MessageAnalysisResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "message-analysis".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<MessageAnalysisResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 获取实时指标
    pub async fn get_real_time_metrics(
        &self,
        request: RealTimeMetricsRequest,
    ) -> Result<RealTimeMetricsResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "real-time-metrics".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<RealTimeMetricsResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 获取智能推荐
    pub async fn get_smart_recommendations(
        &self,
        request: SmartRecommendationRequest,
    ) -> Result<SmartRecommendationResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "smart-recommendations".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<SmartRecommendationResponse> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 生成报告
    pub async fn generate_report(
        &self,
        report_type: String,
        parameters: HashMap<String, serde_json::Value>,
    ) -> Result<HashMap<String, serde_json::Value>, Box<dyn std::error::Error>> {
        let request = serde_json::json!({
            "report_type": report_type,
            "parameters": parameters,
        });
        
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "generate-report".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<HashMap<String, serde_json::Value>> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
    
    /// 获取仪表板数据
    pub async fn get_dashboard_data(
        &self,
        dashboard_id: String,
        filters: HashMap<String, serde_json::Value>,
    ) -> Result<HashMap<String, serde_json::Value>, Box<dyn std::error::Error>> {
        let request = serde_json::json!({
            "dashboard_id": dashboard_id,
            "filters": filters,
        });
        
        let api_request = ApiRequest {
            service: "analytics".to_string(),
            endpoint: "dashboard-data".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response: ApiResponse<HashMap<String, serde_json::Value>> = 
            crate::api_gateway::forward_to_enhanced_service(
                api_request,
                self.config.analytics_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("Analytics service error".to_string()).into())
        }
    }
}