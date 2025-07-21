use crate::api_gateway::*;
use std::collections::HashMap;
use anyhow::Result;
use tracing::{info, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use tera::{Tera, Context};

/// React卡片服务配置
#[derive(Debug, Clone)]
pub struct ReactCardServiceConfig {
    pub template_dir: String,
    pub max_template_size: usize,
    pub enable_cache: bool,
    pub cache_ttl: u64,
}

impl Default for ReactCardServiceConfig {
    fn default() -> Self {
        Self {
            template_dir: "./templates".to_string(),
            max_template_size: 1024 * 1024, // 1MB
            enable_cache: true,
            cache_ttl: 3600, // 1小时
        }
    }
}

/// 模板存储
#[derive(Debug, Clone)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub code: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// React卡片服务
#[derive(Debug, Clone)]
pub struct ReactCardService {
    config: Arc<RwLock<ReactCardServiceConfig>>,
    templates: Arc<RwLock<HashMap<String, Template>>>,
    template_engine: Arc<Tera>,
}

impl ReactCardService {
    pub fn new() -> Result<Self> {
        let config = ReactCardServiceConfig::default();
        
        // 初始化模板引擎
        let mut tera = Tera::default();
        tera.add_raw_template("base", include_str!("../../templates/base.html"))?;
        tera.add_raw_template("product_card", include_str!("../../templates/product_card.html"))?;
        tera.add_raw_template("info_card", include_str!("../../templates/info_card.html"))?;
        tera.add_raw_template("custom_card", include_str!("../../templates/custom_card.html"))?;
        
        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            templates: Arc::new(RwLock::new(HashMap::new())),
            template_engine: Arc::new(tera),
        })
    }
    
    /// 渲染React卡片
    pub async fn render_card(
        &self,
        request: ReactCardRenderRequest,
    ) -> Result<ReactCardRenderResponse> {
        info!("渲染React卡片: {}", request.container_id);
        
        // 生成React组件代码
        let component_code = self.generate_component_code(&request.component_data).await?;
        
        // 生成自适应样式
        let styles = self.generate_adaptive_styles(&request.adaptive_styles).await?;
        
        // 生成HTML包装器
        let html_wrapper = self.generate_html_wrapper(
            &request.container_id,
            &component_code,
            &styles,
        ).await?;
        
        Ok(ReactCardRenderResponse {
            rendered_html: html_wrapper,
            component_script: component_code,
            styles,
        })
    }
    
    /// 生成React卡片
    pub async fn generate_card(
        &self,
        request: ReactCardGenerationRequest,
    ) -> Result<ReactCardGenerationResponse> {
        info!("生成React卡片: {}", request.card_type);
        
        // 根据卡片类型生成组件代码
        let component_code = self.generate_card_component(&request).await?;
        
        // 生成自适应配置
        let adaptive_config = self.generate_adaptive_config(&request.style_preferences).await?;
        
        Ok(ReactCardGenerationResponse {
            component_code,
            component_config: request.data,
            adaptive_config,
        })
    }
    
    /// 获取自适应配置
    pub async fn get_adaptive_config(
        &self,
        request: AdaptiveConfigRequest,
    ) -> Result<AdaptiveConfigResponse> {
        info!("获取自适应配置: {}", request.device_type);
        
        let styles = self.generate_responsive_styles(&request).await?;
        let breakpoints = self.get_breakpoints(&request.device_type).await?;
        let responsive_rules = self.generate_responsive_rules(&request).await?;
        
        Ok(AdaptiveConfigResponse {
            styles,
            breakpoints,
            responsive_rules,
        })
    }
    
    /// 获取卡片模板
    pub async fn get_card_template(
        &self,
        request: CardTemplateRequest,
    ) -> Result<CardTemplateResponse> {
        info!("获取卡片模板: {}", request.template_id);
        
        let templates = self.templates.read().await;
        let template = templates.get(&request.template_id)
            .ok_or_else(|| anyhow::anyhow!("模板不存在: {}", request.template_id))?;
        
        Ok(CardTemplateResponse {
            template_code: template.code.clone(),
            variables: template.variables.clone(),
            metadata: template.metadata.clone(),
        })
    }
    
    /// 保存卡片模板
    pub async fn save_card_template(
        &self,
        template_code: String,
        variables: HashMap<String, serde_json::Value>,
        metadata: HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let template_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        
        let template = Template {
            id: template_id.clone(),
            name: metadata.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("未命名模板")
                .to_string(),
            code: template_code,
            variables,
            metadata,
            created_at: now,
            updated_at: now,
        };
        
        let mut templates = self.templates.write().await;
        templates.insert(template_id.clone(), template);
        
        info!("保存卡片模板: {}", template_id);
        Ok(template_id)
    }
    
    /// 获取模板列表
    pub async fn get_template_list(&self) -> Result<Vec<HashMap<String, serde_json::Value>>> {
        let templates = self.templates.read().await;
        let mut template_list = Vec::new();
        
        for template in templates.values() {
            let mut template_info = HashMap::new();
            template_info.insert("id".to_string(), serde_json::Value::String(template.id.clone()));
            template_info.insert("name".to_string(), serde_json::Value::String(template.name.clone()));
            template_info.insert("created_at".to_string(), serde_json::Value::Number(template.created_at.into()));
            template_info.insert("updated_at".to_string(), serde_json::Value::Number(template.updated_at.into()));
            template_info.insert("metadata".to_string(), serde_json::Value::Object(template.metadata.clone()));
            
            template_list.push(template_info);
        }
        
        Ok(template_list)
    }
    
    // 私有方法
    
    async fn generate_component_code(
        &self,
        component_data: &HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let card_type = component_data.get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("custom");
        
        match card_type {
            "product" => self.generate_product_card_code(component_data).await,
            "info" => self.generate_info_card_code(component_data).await,
            "custom" => self.generate_custom_card_code(component_data).await,
            _ => self.generate_custom_card_code(component_data).await,
        }
    }
    
    async fn generate_product_card_code(
        &self,
        component_data: &HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let title = component_data.get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("产品标题");
        
        let description = component_data.get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("产品描述");
        
        let price = component_data.get("price")
            .and_then(|v| v.as_str())
            .unwrap_or("¥0.00");
        
        let image_url = component_data.get("image_url")
            .and_then(|v| v.as_str())
            .unwrap_or("/placeholder.jpg");
        
        let code = format!(
            r#"import React from 'react';
import {{ Card, CardHeader, CardBody, CardFooter, Button, Image, Chip }} from '@heroui/react';

const ProductCard = () => {{
  return (
    <Card className="w-full max-w-sm hover:scale-105 transition-transform duration-200">
      <CardHeader className="pb-3 pt-2 px-4 flex-col items-start">
        <h4 className="font-bold text-large">{}</h4>
        <p className="text-tiny uppercase font-bold text-default-500">{}</p>
      </CardHeader>
      <CardBody className="overflow-visible py-2">
        <Image
          alt="产品图片"
          className="object-cover rounded-xl"
          src="{}"
          width={}
        />
        <div className="flex justify-between items-center mt-3">
          <Chip color="primary" variant="flat">热销</Chip>
          <span className="text-2xl font-bold text-primary">{}</span>
        </div>
      </CardBody>
      <CardFooter className="pt-0">
        <Button color="primary" className="w-full">
          立即购买
        </Button>
      </CardFooter>
    </Card>
  );
}};

export default ProductCard;"#,
            title, description, image_url, 270, price
        );
        
        Ok(code)
    }
    
    async fn generate_info_card_code(
        &self,
        component_data: &HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let title = component_data.get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("信息标题");
        
        let content = component_data.get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("信息内容");
        
        let tags = component_data.get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
            .unwrap_or_else(|| vec!["重要", "通知"]);
        
        let tags_html = tags.iter()
            .map(|tag| format!(r#"<Chip color="primary" variant="flat">{}</Chip>"#, tag))
            .collect::<Vec<_>>()
            .join("\n          ");
        
        let code = format!(
            r#"import React from 'react';
import {{ Card, CardHeader, CardBody, Chip }} from '@heroui/react';

const InfoCard = () => {{
  return (
    <Card className="w-full max-w-sm border-2 border-primary-200">
      <CardHeader className="pb-3 pt-2 px-4 flex-col items-start">
        <h4 className="font-bold text-large">{}</h4>
        <p className="text-tiny uppercase font-bold text-primary">重要信息</p>
      </CardHeader>
      <CardBody className="overflow-visible py-2">
        <p className="text-default-500 mb-3">
          {}
        </p>
        <div className="flex gap-2 flex-wrap">
          {}
        </div>
      </CardBody>
    </Card>
  );
}};

export default InfoCard;"#,
            title, content, tags_html
        );
        
        Ok(code)
    }
    
    async fn generate_custom_card_code(
        &self,
        component_data: &HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let title = component_data.get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("自定义卡片");
        
        let content = component_data.get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("自定义内容");
        
        let code = format!(
            r#"import React from 'react';
import {{ Card, CardHeader, CardBody, Button }} from '@heroui/react';

const CustomCard = () => {{
  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="pb-3 pt-2 px-4 flex-col items-start">
        <h4 className="font-bold text-large">{}</h4>
        <p className="text-tiny uppercase font-bold text-default-500">自定义卡片</p>
      </CardHeader>
      <CardBody className="overflow-visible py-2">
        <p className="text-default-500">
          {}
        </p>
      </CardBody>
      <CardBody className="pt-0">
        <Button color="primary" variant="flat" className="w-full">
          了解更多
        </Button>
      </CardBody>
    </Card>
  );
}};

export default CustomCard;"#,
            title, content
        );
        
        Ok(code)
    }
    
    async fn generate_adaptive_styles(
        &self,
        adaptive_config: &HashMap<String, String>,
    ) -> Result<String> {
        let mut styles = String::new();
        styles.push_str("<style>\n");
        
        // 基础样式
        styles.push_str(r#"
.card-container {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.card-container:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.react-component-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}
"#);
        
        // 自适应样式
        for (selector, properties) in adaptive_config {
            styles.push_str(&format!("{} {{\n", selector));
            styles.push_str(&format!("  {}\n", properties));
            styles.push_str("}\n");
        }
        
        // 响应式断点
        styles.push_str(r#"
@media (max-width: 768px) {
  .card-container {
    max-width: 100% !important;
    margin: 0.5rem;
  }
}

@media (max-width: 480px) {
  .card-container {
    margin: 0.25rem;
  }
}
"#);
        
        styles.push_str("</style>");
        Ok(styles)
    }
    
    async fn generate_html_wrapper(
        &self,
        container_id: &str,
        component_code: &str,
        styles: &str,
    ) -> Result<String> {
        let html = format!(
            r#"<div id="{}" class="card-container">
  <div class="react-component-container">
    <div id="react-root-{}"></div>
  </div>
</div>
<script type="module">
  // React组件代码
  {}
  
  // 渲染组件
  const root = ReactDOM.createRoot(document.getElementById('react-root-{}'));
  root.render(React.createElement(ProductCard || InfoCard || CustomCard));
</script>
{}"#,
            container_id, container_id, component_code, container_id, styles
        );
        
        Ok(html)
    }
    
    async fn generate_card_component(
        &self,
        request: &ReactCardGenerationRequest,
    ) -> Result<String> {
        match request.card_type.as_str() {
            "product" => self.generate_product_card_code(&request.data).await,
            "info" => self.generate_info_card_code(&request.data).await,
            "custom" => self.generate_custom_card_code(&request.data).await,
            _ => self.generate_custom_card_code(&request.data).await,
        }
    }
    
    async fn generate_adaptive_config(
        &self,
        style_preferences: &HashMap<String, String>,
    ) -> Result<HashMap<String, String>> {
        let mut config = HashMap::new();
        
        // 根据样式偏好生成自适应配置
        for (key, value) in style_preferences {
            match key.as_str() {
                "theme" => {
                    config.insert(".card-container".to_string(), 
                        format!("background: {};", value));
                }
                "border_radius" => {
                    config.insert(".card-container".to_string(), 
                        format!("border-radius: {}px;", value));
                }
                "shadow" => {
                    config.insert(".card-container".to_string(), 
                        format!("box-shadow: {};", value));
                }
                _ => {
                    config.insert(format!(".card-container .{}", key), 
                        format!("{}: {};", key, value));
                }
            }
        }
        
        Ok(config)
    }
    
    async fn generate_responsive_styles(
        &self,
        request: &AdaptiveConfigRequest,
    ) -> Result<HashMap<String, String>> {
        let mut styles = HashMap::new();
        
        let screen_width = request.screen_size.get("width").unwrap_or(&1024.0);
        let screen_height = request.screen_size.get("height").unwrap_or(&768.0);
        
        // 根据屏幕尺寸生成响应式样式
        if *screen_width < 768.0 {
            styles.insert(".card-container".to_string(), 
                "max-width: 100% !important; margin: 0.5rem;".to_string());
        } else if *screen_width < 1024.0 {
            styles.insert(".card-container".to_string(), 
                "max-width: 80% !important; margin: 1rem;".to_string());
        } else {
            styles.insert(".card-container".to_string(), 
                "max-width: 400px !important; margin: 1.5rem;".to_string());
        }
        
        Ok(styles)
    }
    
    async fn get_breakpoints(
        &self,
        device_type: &str,
    ) -> Result<HashMap<String, f64>> {
        let mut breakpoints = HashMap::new();
        
        match device_type {
            "mobile" => {
                breakpoints.insert("xs".to_string(), 480.0);
                breakpoints.insert("sm".to_string(), 768.0);
            }
            "tablet" => {
                breakpoints.insert("sm".to_string(), 768.0);
                breakpoints.insert("md".to_string(), 1024.0);
            }
            "desktop" => {
                breakpoints.insert("md".to_string(), 1024.0);
                breakpoints.insert("lg".to_string(), 1440.0);
                breakpoints.insert("xl".to_string(), 1920.0);
            }
            _ => {
                breakpoints.insert("xs".to_string(), 480.0);
                breakpoints.insert("sm".to_string(), 768.0);
                breakpoints.insert("md".to_string(), 1024.0);
                breakpoints.insert("lg".to_string(), 1440.0);
                breakpoints.insert("xl".to_string(), 1920.0);
            }
        }
        
        Ok(breakpoints)
    }
    
    async fn generate_responsive_rules(
        &self,
        request: &AdaptiveConfigRequest,
    ) -> Result<Vec<HashMap<String, serde_json::Value>>> {
        let mut rules = Vec::new();
        
        let screen_width = request.screen_size.get("width").unwrap_or(&1024.0);
        
        // 生成响应式规则
        if *screen_width < 480.0 {
            let mut rule = HashMap::new();
            rule.insert("breakpoint".to_string(), serde_json::Value::String("xs".to_string()));
            rule.insert("max_width".to_string(), serde_json::Value::Number(480.0.into()));
            rule.insert("styles".to_string(), serde_json::json!({
                "font_size": "14px",
                "padding": "0.5rem",
                "margin": "0.25rem"
            }));
            rules.push(rule);
        } else if *screen_width < 768.0 {
            let mut rule = HashMap::new();
            rule.insert("breakpoint".to_string(), serde_json::Value::String("sm".to_string()));
            rule.insert("max_width".to_string(), serde_json::Value::Number(768.0.into()));
            rule.insert("styles".to_string(), serde_json::json!({
                "font_size": "16px",
                "padding": "1rem",
                "margin": "0.5rem"
            }));
            rules.push(rule);
        } else {
            let mut rule = HashMap::new();
            rule.insert("breakpoint".to_string(), serde_json::Value::String("md".to_string()));
            rule.insert("min_width".to_string(), serde_json::Value::Number(768.0.into()));
            rule.insert("styles".to_string(), serde_json::json!({
                "font_size": "18px",
                "padding": "1.5rem",
                "margin": "1rem"
            }));
            rules.push(rule);
        }
        
        Ok(rules)
    }
}