use crate::api_gateway::EnhancedServiceConfig;
use crate::proxy::{ProxyService, ProxyError, handle_proxy_request, handle_json_request};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;

// React卡片服务请求/响应结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderRequest {
    pub component_data: HashMap<String, serde_json::Value>,
    pub adaptive_styles: HashMap<String, String>,
    pub container_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderResponse {
    pub rendered_html: String,
    pub component_script: String,
    pub styles: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardGenerationRequest {
    pub card_type: String,
    pub data: HashMap<String, serde_json::Value>,
    pub style_preferences: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardGenerationResponse {
    pub component_code: String,
    pub component_config: HashMap<String, serde_json::Value>,
    pub adaptive_config: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdaptiveConfigRequest {
    pub screen_size: HashMap<String, f64>,
    pub device_type: String,
    pub user_preferences: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdaptiveConfigResponse {
    pub styles: HashMap<String, String>,
    pub breakpoints: HashMap<String, f64>,
    pub responsive_rules: Vec<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CardTemplateRequest {
    pub template_id: String,
    pub variables: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CardTemplateResponse {
    pub template_code: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}

pub struct ReactCardProxy {
    config: EnhancedServiceConfig,
}

impl ReactCardProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
}

#[async_trait::async_trait]
impl ProxyService for ReactCardProxy {
    fn get_config(&self) -> &EnhancedServiceConfig {
        &self.config
    }
    
    fn get_service_url(&self) -> &str {
        &self.config.react_card_service_url
    }
    
    fn get_service_name(&self) -> &str {
        "react-card"
    }
}

impl ReactCardProxy {
    /// 渲染React卡片
    pub async fn render_card(
        &self,
        request: ReactCardRenderRequest,
    ) -> Result<ReactCardRenderResponse, ProxyError> {
        handle_proxy_request(self, "render", &request).await
    }
    
    /// 生成React卡片
    pub async fn generate_card(
        &self,
        request: ReactCardGenerationRequest,
    ) -> Result<ReactCardGenerationResponse, ProxyError> {
        handle_proxy_request(self, "generate", &request).await
    }
    
    /// 获取自适应配置
    pub async fn get_adaptive_config(
        &self,
        request: AdaptiveConfigRequest,
    ) -> Result<AdaptiveConfigResponse, ProxyError> {
        handle_proxy_request(self, "adaptive-config", &request).await
    }
    
    /// 获取卡片模板
    pub async fn get_card_template(
        &self,
        request: CardTemplateRequest,
    ) -> Result<CardTemplateResponse, ProxyError> {
        handle_proxy_request(self, "template", &request).await
    }
    
    /// 保存卡片模板
    pub async fn save_card_template(
        &self,
        template_code: String,
        variables: HashMap<String, serde_json::Value>,
        metadata: HashMap<String, serde_json::Value>,
    ) -> Result<String, ProxyError> {
        let request = serde_json::json!({
            "template_code": template_code,
            "variables": variables,
            "metadata": metadata,
        });
        
        let response: serde_json::Value = handle_json_request(self, "save-template", request).await?;
        Ok(response["template_id"].as_str().unwrap().to_string())
    }
    
    /// 获取模板列表
    pub async fn get_template_list(&self) -> Result<Vec<HashMap<String, serde_json::Value>>, ProxyError> {
        let request = serde_json::json!({});
        handle_json_request(self, "template-list", request).await
    }
    
    /// 删除模板
    pub async fn delete_template(
        &self,
        template_id: String,
    ) -> Result<bool, ProxyError> {
        let request = serde_json::json!({
            "template_id": template_id,
        });
        
        let response: serde_json::Value = handle_json_request(self, "delete-template", request).await?;
        Ok(response["success"].as_bool().unwrap_or(false))
    }
    
    /// 获取模板统计
    pub async fn get_template_stats(&self) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({});
        handle_json_request(self, "template-stats", request).await
    }
    
    /// 验证模板语法
    pub async fn validate_template(
        &self,
        template_code: String,
    ) -> Result<HashMap<String, serde_json::Value>, ProxyError> {
        let request = serde_json::json!({
            "template_code": template_code,
        });
        
        handle_json_request(self, "validate-template", request).await
    }
}