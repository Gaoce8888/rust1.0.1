//! 代理模块 - 统一处理增强服务的API调用
//! 
//! 这个模块提供了简化的代理模式，用于与增强服务进行通信。
//! 所有代理都使用统一的类型处理和错误处理方式。

pub mod ai_proxy;
pub mod react_card_proxy;
pub mod analytics_proxy;
pub mod enterprise_proxy;

use crate::api_gateway::{ApiRequest, EnhancedServiceConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// 统一的代理错误类型
#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Service error: {0}")]
    Service(String),
    #[error("Timeout error: {0}")]
    Timeout(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

/// 代理基础特征
#[async_trait::async_trait]
pub trait ProxyService {
    /// 获取服务配置
    fn get_config(&self) -> &EnhancedServiceConfig;
    
    /// 获取服务URL
    fn get_service_url(&self) -> &str;
    
    /// 获取服务名称
    fn get_service_name(&self) -> &str;
    
    /// 转发请求到增强服务
    async fn forward_request(
        &self,
        endpoint: &str,
        data: serde_json::Value,
    ) -> Result<serde_json::Value, ProxyError> {
        let api_request = ApiRequest {
            service: self.get_service_name().to_string(),
            endpoint: endpoint.to_string(),
            data,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response = crate::api_gateway::forward_to_enhanced_service(
            api_request,
            self.get_service_url().to_string(),
            Duration::from_secs(self.get_config().timeout_seconds),
        ).await.map_err(|e| ProxyError::Network(e.to_string()))?;
        
        if response.success {
            response.data.ok_or_else(|| ProxyError::InvalidResponse("No data in response".to_string()))
        } else {
            Err(ProxyError::Service(response.error.unwrap_or("Unknown service error".to_string())))
        }
    }
    
    /// 序列化请求数据
    fn serialize_request<T: Serialize>(&self, data: &T) -> Result<serde_json::Value, ProxyError> {
        serde_json::to_value(data).map_err(|e| ProxyError::Serialization(e.to_string()))
    }
    
    /// 反序列化响应数据
    fn deserialize_response<T: for<'de> Deserialize<'de>>(
        &self,
        data: serde_json::Value,
    ) -> Result<T, ProxyError> {
        serde_json::from_value(data).map_err(|e| ProxyError::Serialization(e.to_string()))
    }
}

/// 通用的代理请求处理
pub async fn handle_proxy_request<T: Serialize, R: for<'de> Deserialize<'de>>(
    proxy: &(impl ProxyService + Sync),
    endpoint: &str,
    request: &T,
) -> Result<R, ProxyError> {
    let json_request = proxy.serialize_request(request)?;
    let json_response = proxy.forward_request(endpoint, json_request).await?;
    let response: R = proxy.deserialize_response(json_response)?;
    Ok(response)
}

/// 通用的JSON请求处理
pub async fn handle_json_request<R: for<'de> Deserialize<'de>>(
    proxy: &(impl ProxyService + Sync),
    endpoint: &str,
    request: serde_json::Value,
) -> Result<R, ProxyError> {
    let json_response = proxy.forward_request(endpoint, request).await?;
    let response: R = proxy.deserialize_response(json_response)?;
    Ok(response)
}

/// 健康检查响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: i64,
    pub version: String,
    pub uptime: u64,
}

/// 通用配置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigResponse {
    pub config_id: String,
    pub settings: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
}

/// 通用列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ListResponse<T> {
    pub items: Vec<T>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
}

/// 通用统计响应
#[derive(Debug, Serialize, Deserialize)]
pub struct StatsResponse {
    pub metrics: HashMap<String, f64>,
    pub timestamp: i64,
    pub period: String,
}