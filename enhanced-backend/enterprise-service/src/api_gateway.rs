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

/// 负载均衡请求
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadBalancerRequest {
    pub service_type: String,
    pub current_load: HashMap<String, f64>,
    pub health_status: HashMap<String, String>,
}

/// 负载均衡响应
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadBalancerResponse {
    pub selected_instance: String,
    pub load_distribution: HashMap<String, f64>,
    pub health_checks: HashMap<String, bool>,
}

/// 健康监控请求
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthMonitorRequest {
    pub services: Vec<String>,
    pub check_interval: i64,
    pub timeout: i64,
}

/// 健康监控响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthMonitorResponse {
    pub service_health: HashMap<String, HashMap<String, serde_json::Value>>,
    pub overall_health: f64,
    pub alerts: Vec<HashMap<String, serde_json::Value>>,
}

/// 性能优化请求
#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceOptimizationRequest {
    pub optimization_type: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub constraints: HashMap<String, serde_json::Value>,
}

/// 性能优化响应
#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceOptimizationResponse {
    pub optimization_result: HashMap<String, serde_json::Value>,
    pub performance_metrics: HashMap<String, f64>,
    pub recommendations: Vec<String>,
}

/// 故障转移请求
#[derive(Debug, Serialize, Deserialize)]
pub struct FailoverRequest {
    pub failed_service: String,
    pub backup_services: Vec<String>,
    pub failover_strategy: String,
}

/// 故障转移响应
#[derive(Debug, Serialize, Deserialize)]
pub struct FailoverResponse {
    pub new_primary: String,
    pub failover_time: i64,
    pub data_sync_status: HashMap<String, String>,
    pub recovery_plan: Vec<HashMap<String, serde_json::Value>>,
}

/// 自动扩缩容请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AutoScalingRequest {
    pub service_type: String,
    pub current_metrics: HashMap<String, f64>,
    pub scaling_policy: HashMap<String, serde_json::Value>,
}

/// 自动扩缩容响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AutoScalingResponse {
    pub scaling_action: String,
    pub new_instance_count: i64,
    pub scaling_reason: String,
    pub estimated_cost: f64,
}

/// 系统状态请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatusRequest {
    pub status_types: Vec<String>,
    pub include_details: bool,
}

/// 系统状态响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatusResponse {
    pub system_status: HashMap<String, serde_json::Value>,
    pub service_status: HashMap<String, HashMap<String, serde_json::Value>>,
    pub resource_usage: HashMap<String, f64>,
    pub last_updated: i64,
}

/// 告警配置请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertConfigRequest {
    pub alert_rules: Vec<HashMap<String, serde_json::Value>>,
    pub notification_channels: Vec<HashMap<String, serde_json::Value>>,
    pub escalation_policy: HashMap<String, serde_json::Value>,
}

/// 告警配置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertConfigResponse {
    pub config_id: String,
    pub status: String,
    pub active_alerts: Vec<HashMap<String, serde_json::Value>>,
    pub notification_history: Vec<HashMap<String, serde_json::Value>>,
}

/// 性能报告请求
#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceReportRequest {
    pub report_type: String,
    pub time_range: HashMap<String, i64>,
    pub metrics: Vec<String>,
}

/// 性能报告响应
#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceReportResponse {
    pub report_id: String,
    pub performance_data: HashMap<String, serde_json::Value>,
    pub trends: Vec<HashMap<String, serde_json::Value>>,
    pub recommendations: Vec<String>,
    pub generated_at: i64,
}