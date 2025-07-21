use crate::api_gateway::{ApiRequest, ApiResponse, EnhancedServiceConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;

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

/// React卡片代理服务
pub struct ReactCardProxy {
    config: EnhancedServiceConfig,
}

impl ReactCardProxy {
    pub fn new(config: EnhancedServiceConfig) -> Self {
        Self { config }
    }
    
    /// 渲染React卡片
    pub async fn render_card(
        &self,
        request: ReactCardRenderRequest,
    ) -> Result<ReactCardRenderResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "render".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
                let response =
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
    
    /// 生成React卡片
    pub async fn generate_card(
        &self,
        request: ReactCardGenerationRequest,
    ) -> Result<ReactCardGenerationResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "generate".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
                let response =
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
    
    /// 获取自适应配置
    pub async fn get_adaptive_config(
        &self,
        request: AdaptiveConfigRequest,
    ) -> Result<AdaptiveConfigResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "adaptive-config".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
                let response =
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
    
    /// 获取卡片模板
    pub async fn get_card_template(
        &self,
        request: CardTemplateRequest,
    ) -> Result<CardTemplateResponse, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "template".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
                let response =
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
    
    /// 保存卡片模板
    pub async fn save_card_template(
        &self,
        template_code: String,
        variables: HashMap<String, serde_json::Value>,
        metadata: HashMap<String, serde_json::Value>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let request = serde_json::json!({
            "template_code": template_code,
            "variables": variables,
            "metadata": metadata,
        });
        
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "save-template".to_string(),
            data: request,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response = 
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap()["template_id"].as_str().unwrap().to_string())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
    
    /// 获取可用模板列表
    pub async fn get_template_list(&self) -> Result<Vec<HashMap<String, serde_json::Value>>, Box<dyn std::error::Error>> {
        let api_request = ApiRequest {
            service: "react-card".to_string(),
            endpoint: "template-list".to_string(),
            data: serde_json::json!({}),
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        let response = 
            crate::api_gateway::forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(
                api_request,
                self.config.react_card_service_url.clone(),
                std::time::Duration::from_secs(self.config.timeout_seconds),
            ).await?;
        
        if response.success {
            Ok(response.data.unwrap())
        } else {
            Err(response.error.unwrap_or("React Card service error".to_string()).into())
        }
    }
}