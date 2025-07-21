use crate::ai::config::{ReactComponentGenerationConfig, AIServiceIntegrationConfig};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn};
use uuid::Uuid;

/// React组件生成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactComponentGenerationRequest {
    pub description: String,
    pub component_type: Option<String>,
    pub props: Option<HashMap<String, serde_json::Value>>,
    pub styles: Option<HashMap<String, serde_json::Value>>,
    pub requirements: Option<Vec<String>>,
    pub context: Option<String>,
    pub user_id: String,
}

/// React组件生成响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactComponentGenerationResponse {
    pub component_id: String,
    pub component_name: String,
    pub component_type: String,
    pub props: serde_json::Value,
    pub styles: Option<serde_json::Value>,
    pub events: Option<serde_json::Value>,
    pub dependencies: Vec<String>,
    pub generated_code: String,
    pub success: bool,
    pub message: String,
    pub quality_score: Option<f32>,
}

/// React组件调用请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactComponentCallRequest {
    pub component_id: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub context: Option<String>,
    pub user_id: String,
}

/// React组件调用响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactComponentCallResponse {
    pub call_id: String,
    pub component_data: serde_json::Value,
    pub rendered_html: String,
    pub adaptive_styles: Option<String>,
    pub success: bool,
    pub message: String,
}

/// AI组件生成器
pub struct ReactComponentGenerator {
    config: ReactComponentGenerationConfig,
    ai_config: AIServiceIntegrationConfig,
}

impl ReactComponentGenerator {
    pub fn new(config: ReactComponentGenerationConfig, ai_config: AIServiceIntegrationConfig) -> Self {
        Self { config, ai_config }
    }

    /// 生成React组件
    pub async fn generate_component(&self, request: ReactComponentGenerationRequest) -> Result<ReactComponentGenerationResponse> {
        info!("开始生成React组件: {}", request.description);

        if !self.config.enabled {
            return Err(anyhow!("React组件生成功能已禁用"));
        }

        // 构建AI提示词
        let prompt = self.build_generation_prompt(&request)?;
        
        // 调用AI服务
        let ai_response = self.call_ai_service(&prompt).await?;
        
        // 解析AI响应
        let component_data = self.parse_ai_response(&ai_response)?;
        
        // 质量控制
        let quality_score = if self.config.quality_control.enabled {
            Some(self.assess_quality(&component_data).await?)
        } else {
            None
        };

        let component_id = Uuid::new_v4().to_string();
        
        info!("React组件生成成功: {}", component_id);

        Ok(ReactComponentGenerationResponse {
            component_id,
            component_name: component_data.component_name,
            component_type: component_data.component_type,
            props: component_data.props,
            styles: component_data.styles,
            events: component_data.events,
            dependencies: component_data.dependencies,
            generated_code: component_data.generated_code,
            success: true,
            message: "组件生成成功".to_string(),
            quality_score,
        })
    }

    /// 调用React组件
    pub async fn call_component(&self, request: ReactComponentCallRequest) -> Result<ReactComponentCallResponse> {
        info!("调用React组件: {}", request.component_id);

        // 这里可以根据component_id获取之前生成的组件配置
        // 简化实现：直接根据变量生成组件数据
        let component_data = self.generate_component_data(&request)?;
        
        // 生成自适应样式
        let adaptive_styles = self.generate_adaptive_styles(&component_data)?;
        
        // 生成容器HTML
        let rendered_html = self.generate_container_html(&component_data, &adaptive_styles)?;

        let call_id = Uuid::new_v4().to_string();

        Ok(ReactComponentCallResponse {
            call_id,
            component_data: serde_json::to_value(component_data)?,
            rendered_html,
            adaptive_styles,
            success: true,
            message: "组件调用成功".to_string(),
        })
    }

    /// 构建生成提示词
    fn build_generation_prompt(&self, request: &ReactComponentGenerationRequest) -> Result<String> {
        let mut prompt = format!(
            "请根据以下需求生成一个React组件：\n\n需求描述：{}\n",
            request.description
        );

        if let Some(component_type) = &request.component_type {
            prompt.push_str(&format!("组件类型：{}\n", component_type));
        }

        if let Some(props) = &request.props {
            prompt.push_str("属性要求：\n");
            for (key, value) in props {
                prompt.push_str(&format!("- {}: {}\n", key, value));
            }
        }

        if let Some(styles) = &request.styles {
            prompt.push_str("样式要求：\n");
            for (key, value) in styles {
                prompt.push_str(&format!("- {}: {}\n", key, value));
            }
        }

        if let Some(requirements) = &request.requirements {
            prompt.push_str("特殊要求：\n");
            for req in requirements {
                prompt.push_str(&format!("- {}\n", req));
            }
        }

        if let Some(context) = &request.context {
            prompt.push_str(&format!("上下文：{}\n", context));
        }

        prompt.push_str("\n请返回JSON格式的组件配置，包含以下字段：\n");
        prompt.push_str("- component_name: 组件名称\n");
        prompt.push_str("- component_type: 组件类型\n");
        prompt.push_str("- props: 组件属性\n");
        prompt.push_str("- styles: 组件样式\n");
        prompt.push_str("- events: 事件处理\n");
        prompt.push_str("- dependencies: 依赖项\n");
        prompt.push_str("- generated_code: 生成的代码\n");

        Ok(prompt)
    }

    /// 调用AI服务
    async fn call_ai_service(&self, prompt: &str) -> Result<String> {
        // 简化实现：使用OpenAI
        if !self.ai_config.openai.enabled {
            return Err(anyhow!("OpenAI服务未启用"));
        }

        let client = reqwest::Client::new();
        let request_body = serde_json::json!({
            "model": "gpt-4",
            "messages": [
                {
                    "role": "system",
                    "content": "你是一个专业的React组件生成专家，能够根据需求生成高质量的React组件配置。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "frequency_penalty": self.config.frequency_penalty,
            "presence_penalty": self.config.presence_penalty
        });

        let response = client
            .post(&format!("{}/chat/completions", self.ai_config.openai.base_url))
            .header("Authorization", format!("Bearer {}", self.ai_config.openai.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_secs(self.ai_config.openai.timeout_seconds))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("AI服务调用失败: {}", response.status()));
        }

        let response_data: serde_json::Value = response.json().await?;
        
        if let Some(content) = response_data["choices"][0]["message"]["content"].as_str() {
            Ok(content.to_string())
        } else {
            Err(anyhow!("AI响应格式错误"))
        }
    }

    /// 解析AI响应
    fn parse_ai_response(&self, response: &str) -> Result<GeneratedComponentData> {
        // 尝试解析JSON响应
        if let Ok(data) = serde_json::from_str::<GeneratedComponentData>(response) {
            return Ok(data);
        }

        // 如果不是JSON，尝试提取JSON部分
        if let Some(json_start) = response.find('{') {
            if let Some(json_end) = response.rfind('}') {
                let json_str = &response[json_start..=json_end];
                if let Ok(data) = serde_json::from_str::<GeneratedComponentData>(json_str) {
                    return Ok(data);
                }
            }
        }

        // 如果无法解析，生成默认组件
        warn!("无法解析AI响应，生成默认组件");
        Ok(GeneratedComponentData {
            component_name: "DefaultComponent".to_string(),
            component_type: "card".to_string(),
            props: serde_json::json!({
                "content": "默认组件内容",
                "title": "默认标题"
            }),
            styles: Some(serde_json::json!({
                "maxWidth": "400px",
                "margin": "0 auto"
            })),
            events: None,
            dependencies: vec!["@nextui-org/react".to_string()],
            generated_code: "// 默认生成的组件代码".to_string(),
        })
    }

    /// 生成组件数据
    fn generate_component_data(&self, request: &ReactComponentCallRequest) -> Result<GeneratedComponentData> {
        // 简化实现：根据变量生成组件数据
        let component_name = format!("GeneratedComponent_{}", request.component_id);
        
        let props = serde_json::to_value(&request.variables)?;
        
        let styles = Some(serde_json::json!({
            "maxWidth": "100%",
            "margin": "0 auto",
            "padding": "16px"
        }));

        Ok(GeneratedComponentData {
            component_name,
            component_type: "card".to_string(),
            props,
            styles,
            events: None,
            dependencies: vec!["@nextui-org/react".to_string()],
            generated_code: "// 动态生成的组件代码".to_string(),
        })
    }

    /// 生成自适应样式
    fn generate_adaptive_styles(&self, _component_data: &GeneratedComponentData) -> Result<Option<String>> {
        // 简化实现：返回基础自适应样式
        let styles = r#"
        .adaptive-container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            .adaptive-container {
                max-width: 100%;
                padding: 12px;
            }
        }
        
        @media (max-width: 480px) {
            .adaptive-container {
                padding: 8px;
            }
        }
        "#;

        Ok(Some(styles.to_string()))
    }

    /// 生成容器HTML
    fn generate_container_html(&self, component_data: &GeneratedComponentData, adaptive_styles: &Option<String>) -> Result<String> {
        let container_id = format!("react-container-{}", Uuid::new_v4().simple());
        
        let mut html = format!(
            r#"<div id="{}" class="adaptive-container">"#,
            container_id
        );

        // 添加自适应样式
        if let Some(ref styles) = adaptive_styles {
            html.push_str(&format!("\n<style>{}</style>", styles));
        }

        // 添加组件数据
        html.push_str(&format!(
            r#"
<script type="application/json" id="react-component-data-{}">
{{
  "componentName": "{}",
  "props": {},
  "styles": {},
  "events": {},
  "dependencies": {},
  "version": "1.0.0"
}}
</script>"#,
            container_id,
            component_data.component_name,
            component_data.props,
            component_data.styles.as_ref().unwrap_or(&serde_json::Value::Null),
            component_data.events.as_ref().unwrap_or(&serde_json::Value::Null),
            serde_json::to_value(&component_data.dependencies)?
        ));

        html.push_str("\n</div>");
        
        Ok(html)
    }

    /// 评估质量
    async fn assess_quality(&self, _component_data: &GeneratedComponentData) -> Result<f32> {
        // 简化实现：返回默认质量分数
        Ok(0.85)
    }
}

/// 生成的组件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
struct GeneratedComponentData {
    component_name: String,
    component_type: String,
    props: serde_json::Value,
    styles: Option<serde_json::Value>,
    events: Option<serde_json::Value>,
    dependencies: Vec<String>,
    generated_code: String,
}