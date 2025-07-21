use crate::config::StorageConfig;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tracing::{error, info, warn};
use utoipa::ToSchema;
use uuid::Uuid;

/// HTML模板管理器
pub struct HtmlTemplateManager {
    #[allow(dead_code)] // 企业级字段：config用于未来配置扩展和企业级功能
    config: StorageConfig,
    base_path: PathBuf,
    templates: std::sync::Arc<tokio::sync::RwLock<HashMap<String, HtmlTemplate>>>,
    #[allow(dead_code)]
    callbacks: std::sync::Arc<tokio::sync::RwLock<HashMap<String, Vec<HtmlCallback>>>>,
}

/// HTML模板结构
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub content: String,
    pub variables: Vec<TemplateVariable>,
    pub css: Option<String>,
    pub javascript: Option<String>,
    pub thumbnail: Option<String>,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: u32,
    pub tags: Vec<String>,
    pub usage_count: u64,
    /// 新增：React组件配置
    pub react_component: Option<ReactComponentConfig>,
    /// 新增：自适应配置
    pub adaptive_config: Option<AdaptiveConfig>,
}

/// React组件配置
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactComponentConfig {
    /// 组件名称
    pub component_name: String,
    /// 组件类型：card, button, form, list, chart等
    pub component_type: String,
    /// 组件属性配置
    pub props: HashMap<String, serde_json::Value>,
    /// 组件样式配置
    pub styles: Option<HashMap<String, serde_json::Value>>,
    /// 组件事件处理
    pub events: Option<HashMap<String, String>>,
    /// 组件依赖
    pub dependencies: Option<Vec<String>>,
    /// 组件版本
    pub version: Option<String>,
}

/// 自适应配置
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AdaptiveConfig {
    /// 是否启用自适应
    pub enabled: bool,
    /// 最小宽度
    pub min_width: Option<u32>,
    /// 最大宽度
    pub max_width: Option<u32>,
    /// 最小高度
    pub min_height: Option<u32>,
    /// 最大高度
    pub max_height: Option<u32>,
    /// 自适应模式：fit, scroll, scale
    pub mode: String,
    /// 容器类型：dialog, modal, inline
    pub container_type: String,
    /// 响应式断点
    pub breakpoints: Option<HashMap<String, serde_json::Value>>,
    /// 自定义CSS类
    pub custom_classes: Option<Vec<String>>,
}

/// 模板变量定义
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateVariable {
    pub name: String,
    pub var_type: VariableType,
    pub default_value: Option<serde_json::Value>,
    pub required: bool,
    pub description: Option<String>,
    pub validation: Option<String>, // regex pattern for validation
}

/// 变量类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum VariableType {
    String,
    Number,
    Boolean,
    Date,
    Url,
    Email,
    Json,
    Array,
}

/// HTML模板渲染请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlRenderRequest {
    pub template_id: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub user_id: String,
    pub callback_url: Option<String>,
    pub callback_data: Option<serde_json::Value>,
    /// 新增：渲染模式
    pub render_mode: Option<String>, // "html", "react", "hybrid"
    /// 新增：客户端配置
    pub client_config: Option<ClientConfig>,
}

/// 客户端配置
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ClientConfig {
    /// 容器宽度
    pub container_width: Option<u32>,
    /// 容器高度
    pub container_height: Option<u32>,
    /// 设备类型
    pub device_type: Option<String>, // "desktop", "tablet", "mobile"
    /// 主题
    pub theme: Option<String>, // "light", "dark", "auto"
    /// 语言
    pub language: Option<String>,
}

/// HTML模板渲染响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlRenderResponse {
    pub message_id: String,
    pub template_id: String,
    pub rendered_html: String,
    pub rendered_css: Option<String>,
    pub rendered_js: Option<String>,
    pub success: bool,
    pub message: String,
    /// 新增：React组件数据
    pub react_component_data: Option<ReactComponentData>,
    /// 新增：自适应样式
    pub adaptive_styles: Option<String>,
}

/// React组件数据
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReactComponentData {
    /// 组件名称
    pub component_name: String,
    /// 组件属性
    pub props: serde_json::Value,
    /// 组件样式
    pub styles: Option<serde_json::Value>,
    /// 组件事件
    pub events: Option<serde_json::Value>,
    /// 组件依赖
    pub dependencies: Option<Vec<String>>,
    /// 组件版本
    pub version: Option<String>,
}

/// HTML模板创建请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplateCreateRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub content: String,
    pub variables: Vec<TemplateVariable>,
    pub css: Option<String>,
    pub javascript: Option<String>,
    pub created_by: String,
    pub tags: Vec<String>,
}

/// HTML模板更新请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplateUpdateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub content: Option<String>,
    pub variables: Option<Vec<TemplateVariable>>,
    pub css: Option<String>,
    pub javascript: Option<String>,
    pub is_active: Option<bool>,
    pub tags: Option<Vec<String>>,
}

/// HTML模板列表请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplateListRequest {
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub is_active: Option<bool>,
    pub page: u32,
    pub limit: u32,
    pub sort_by: String,    // "created_at", "updated_at", "usage_count", "name"
    pub sort_order: String, // "asc", "desc"
    pub search: Option<String>,
}

/// HTML模板列表响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplateListResponse {
    pub templates: Vec<HtmlTemplate>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

/// HTML回调记录
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlCallback {
    pub id: String,
    pub message_id: String,
    pub template_id: String,
    pub action: String,
    pub element_id: Option<String>,
    pub callback_data: serde_json::Value,
    pub user_id: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// HTML回调请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlCallbackRequest {
    pub message_id: String,
    pub action: String,
    pub element_id: Option<String>,
    pub callback_data: Option<serde_json::Value>,
    pub user_id: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
}

/// 模板统计信息
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HtmlTemplateStatistics {
    pub total_templates: u64,
    pub active_templates: u64,
    pub templates_by_category: HashMap<String, u64>,
    pub total_usage: u64,
    pub most_used_templates: Vec<(String, String, u64)>, // (id, name, usage_count)
    pub recent_templates: Vec<HtmlTemplate>,
}

#[allow(dead_code)]
impl HtmlTemplateManager {
    /// 创建HTML模板管理器实例
    pub async fn new(config: StorageConfig) -> Result<Self> {
        let base_path = PathBuf::from(&config.data_dir).join("html_templates");

        // 确保模板目录存在
        if !base_path.exists() {
            tokio::fs::create_dir_all(&base_path).await?;
            info!("创建HTML模板目录: {:?}", base_path);
        }

        let manager = Self {
            config,
            base_path,
            templates: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            callbacks: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        };

        // 加载现有模板
        manager.load_templates().await?;

        Ok(manager)
    }

    /// 创建HTML模板
    pub async fn create_template(
        &self,
        request: HtmlTemplateCreateRequest,
    ) -> Result<HtmlTemplate> {
        info!("创建HTML模板: {}", request.name);

        // 企业级模板安全检查 - 使用企业级默认限制
        let max_size = 1024 * 1024; // 1MB企业级默认限制
        if request.content.len() > max_size {
            warn!(
                "HTML模板内容超过企业级限制: {} 字节 > {} 字节 (模板: {})",
                request.content.len(),
                max_size,
                request.name
            );
        }

        // 验证模板内容
        self.validate_template_content(&request.content, &request.variables)?;

        let template = HtmlTemplate {
            id: Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            category: request.category,
            content: request.content,
            variables: request.variables,
            css: request.css,
            javascript: request.javascript,
            thumbnail: None,
            is_active: true,
            created_by: request.created_by,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            tags: request.tags,
            usage_count: 0,
            react_component: None,
            adaptive_config: None,
        };

        // 保存模板
        self.save_template(&template).await?;

        // 添加到内存缓存
        {
            let mut templates = self.templates.write().await;
            templates.insert(template.id.clone(), template.clone());
        }

        info!("HTML模板创建成功: {}", template.id);
        Ok(template)
    }

    /// 获取HTML模板
    pub async fn get_template(&self, template_id: &str) -> Result<Option<HtmlTemplate>> {
        let templates = self.templates.read().await;
        Ok(templates.get(template_id).cloned())
    }

    /// 更新HTML模板
    pub async fn update_template(
        &self,
        template_id: &str,
        request: HtmlTemplateUpdateRequest,
    ) -> Result<HtmlTemplate> {
        info!("更新HTML模板: {}", template_id);

        let mut template = self
            .get_template(template_id)
            .await?
            .ok_or_else(|| anyhow!("模板不存在: {}", template_id))?;

        // 更新字段
        if let Some(name) = request.name {
            template.name = name;
        }
        if let Some(description) = request.description {
            template.description = Some(description);
        }
        if let Some(category) = request.category {
            template.category = category;
        }
        if let Some(content) = request.content {
            if let Some(ref variables) = request.variables {
                self.validate_template_content(&content, variables)?;
            }
            template.content = content;
        }
        if let Some(variables) = request.variables {
            template.variables = variables;
        }
        if let Some(css) = request.css {
            template.css = Some(css);
        }
        if let Some(javascript) = request.javascript {
            template.javascript = Some(javascript);
        }
        if let Some(is_active) = request.is_active {
            template.is_active = is_active;
        }
        if let Some(tags) = request.tags {
            template.tags = tags;
        }

        template.updated_at = Utc::now();
        template.version += 1;

        // 保存更新后的模板
        self.save_template(&template).await?;

        // 更新内存缓存
        {
            let mut templates = self.templates.write().await;
            templates.insert(template.id.clone(), template.clone());
        }

        info!("HTML模板更新成功: {}", template.id);
        Ok(template)
    }

    /// 删除HTML模板
    pub async fn delete_template(&self, template_id: &str) -> Result<bool> {
        info!("删除HTML模板: {}", template_id);

        // 从内存中移除
        {
            let mut templates = self.templates.write().await;
            if templates.remove(template_id).is_none() {
                return Ok(false);
            }
        }

        // 删除文件
        let template_path = self.get_template_path(template_id);
        if template_path.exists() {
            tokio::fs::remove_file(&template_path).await?;
        }

        info!("HTML模板删除成功: {}", template_id);
        Ok(true)
    }

    /// 获取模板列表
    pub async fn list_templates(
        &self,
        request: HtmlTemplateListRequest,
    ) -> Result<HtmlTemplateListResponse> {
        let templates = self.templates.read().await;

        // 过滤
        let mut filtered_templates: Vec<HtmlTemplate> = templates
            .values()
            .filter(|template| {
                if let Some(ref category) = request.category {
                    if template.category != *category {
                        return false;
                    }
                }
                if let Some(ref tags) = request.tags {
                    if !tags.iter().any(|tag| template.tags.contains(tag)) {
                        return false;
                    }
                }
                if let Some(ref created_by) = request.created_by {
                    if template.created_by != *created_by {
                        return false;
                    }
                }
                if let Some(is_active) = request.is_active {
                    if template.is_active != is_active {
                        return false;
                    }
                }
                if let Some(ref search) = request.search {
                    let search_lower = search.to_lowercase();
                    if !template.name.to_lowercase().contains(&search_lower)
                        && !template
                            .description
                            .as_ref()
                            .unwrap_or(&String::new())
                            .to_lowercase()
                            .contains(&search_lower)
                        && !template
                            .tags
                            .iter()
                            .any(|tag| tag.to_lowercase().contains(&search_lower))
                    {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        // 排序
        match request.sort_by.as_str() {
            "updated_at" => {
                if request.sort_order == "desc" {
                    filtered_templates.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
                } else {
                    filtered_templates.sort_by(|a, b| a.updated_at.cmp(&b.updated_at));
                }
            }
            "usage_count" => {
                if request.sort_order == "desc" {
                    filtered_templates.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));
                } else {
                    filtered_templates.sort_by(|a, b| a.usage_count.cmp(&b.usage_count));
                }
            }
            "name" => {
                if request.sort_order == "desc" {
                    filtered_templates.sort_by(|a, b| b.name.cmp(&a.name));
                } else {
                    filtered_templates.sort_by(|a, b| a.name.cmp(&b.name));
                }
            }
            _ => {
                // 默认按创建时间排序
                if request.sort_order == "desc" {
                    filtered_templates.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                } else {
                    filtered_templates.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                }
            }
        }

        // 分页
        let total = filtered_templates.len() as u32;
        let start = (request.page * request.limit) as usize;
        let end = ((request.page + 1) * request.limit) as usize;

        let page_templates = if start < filtered_templates.len() {
            filtered_templates[start..end.min(filtered_templates.len())].to_vec()
        } else {
            Vec::new()
        };

        Ok(HtmlTemplateListResponse {
            templates: page_templates,
            total,
            page: request.page,
            limit: request.limit,
            has_more: end < filtered_templates.len(),
        })
    }

    /// 渲染HTML模板
    pub async fn render_template(&self, request: HtmlRenderRequest) -> Result<HtmlRenderResponse> {
        info!("渲染HTML模板: {}", request.template_id);

        let template = self
            .get_template(&request.template_id)
            .await?
            .ok_or_else(|| anyhow!("模板不存在: {}", request.template_id))?;

        if !template.is_active {
            return Err(anyhow!("模板已禁用: {}", request.template_id));
        }

        // 验证必需变量
        self.validate_template_variables(&template.variables, &request.variables)?;

        // 确定渲染模式
        let render_mode = request.render_mode.as_deref().unwrap_or("html");
        
        // 根据渲染模式处理
        let (rendered_html, react_component_data, adaptive_styles) = match render_mode {
            "react" => self.render_react_component(&template, &request).await?,
            "hybrid" => self.render_hybrid(&template, &request).await?,
            _ => self.render_html_only(&template, &request).await?,
        };

        let rendered_css = if let Some(ref css) = template.css {
            Some(self.render_content(css, &request.variables)?)
        } else {
            None
        };
        let rendered_js = if let Some(ref js) = template.javascript {
            Some(self.render_content(js, &request.variables)?)
        } else {
            None
        };

        // 生成消息ID
        let message_id = Uuid::new_v4().to_string();

        // 更新使用计数
        self.increment_usage_count(&request.template_id).await?;

        info!("HTML模板渲染成功: {} (模式: {})", message_id, render_mode);

        Ok(HtmlRenderResponse {
            message_id,
            template_id: request.template_id,
            rendered_html,
            rendered_css,
            rendered_js,
            success: true,
            message: "模板渲染成功".to_string(),
            react_component_data,
            adaptive_styles,
        })
    }

    /// 预览HTML模板
    pub async fn preview_template(
        &self,
        template_id: &str,
        variables: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<String> {
        let template = self
            .get_template(template_id)
            .await?
            .ok_or_else(|| anyhow!("模板不存在: {}", template_id))?;

        // 使用默认值或提供的变量进行渲染
        let render_variables = if let Some(vars) = variables {
            vars
        } else {
            // 使用默认值
            let mut default_vars = HashMap::new();
            for var in &template.variables {
                if let Some(ref default_value) = var.default_value {
                    default_vars.insert(var.name.clone(), default_value.clone());
                } else {
                    // 为没有默认值的变量提供示例值
                    let sample_value = match var.var_type {
                        VariableType::String => serde_json::Value::String("示例文本".to_string()),
                        VariableType::Number => {
                            serde_json::Value::Number(serde_json::Number::from(123))
                        }
                        VariableType::Boolean => serde_json::Value::Bool(true),
                        VariableType::Date => serde_json::Value::String(Utc::now().to_rfc3339()),
                        VariableType::Url => {
                            serde_json::Value::String("https://example.com".to_string())
                        }
                        VariableType::Email => {
                            serde_json::Value::String("user@example.com".to_string())
                        }
                        VariableType::Json => serde_json::Value::Object(serde_json::Map::new()),
                        VariableType::Array => serde_json::Value::Array(vec![]),
                    };
                    default_vars.insert(var.name.clone(), sample_value);
                }
            }
            default_vars
        };

        // 渲染预览HTML
        let mut preview_html = self.render_content(&template.content, &render_variables)?;

        // 添加CSS和JavaScript
        if let Some(ref css) = template.css {
            let rendered_css = self.render_content(css, &render_variables)?;
            preview_html = format!("<style>{}</style>\n{}", rendered_css, preview_html);
        }

        if let Some(ref js) = template.javascript {
            let rendered_js = self.render_content(js, &render_variables)?;
            preview_html = format!("{}\n<script>{}</script>", preview_html, rendered_js);
        }

        Ok(preview_html)
    }

    /// 处理HTML回调
    pub async fn handle_callback(&self, request: HtmlCallbackRequest) -> Result<HtmlCallback> {
        info!("处理HTML回调: {} - {}", request.message_id, request.action);

        let callback = HtmlCallback {
            id: Uuid::new_v4().to_string(),
            message_id: request.message_id.clone(),
            template_id: "".to_string(), // 需要通过message_id查找
            action: request.action,
            element_id: request.element_id,
            callback_data: request.callback_data.unwrap_or(serde_json::Value::Null),
            user_id: request.user_id,
            user_agent: request.user_agent,
            ip_address: request.ip_address,
            timestamp: Utc::now(),
        };

        // 保存回调记录
        {
            let mut callbacks = self.callbacks.write().await;
            callbacks
                .entry(request.message_id.clone())
                .or_insert_with(Vec::new)
                .push(callback.clone());
        }

        // 保存到磁盘
        self.save_callback(&callback).await?;

        info!("HTML回调处理完成: {}", callback.id);
        Ok(callback)
    }

    /// 获取回调历史
    pub async fn get_callbacks(&self, message_id: &str) -> Result<Vec<HtmlCallback>> {
        let callbacks = self.callbacks.read().await;
        Ok(callbacks.get(message_id).cloned().unwrap_or_default())
    }

    /// 获取模板统计
    pub async fn get_statistics(&self) -> Result<HtmlTemplateStatistics> {
        let templates = self.templates.read().await;

        let total_templates = templates.len() as u64;
        let active_templates = templates.values().filter(|t| t.is_active).count() as u64;

        let mut templates_by_category = HashMap::new();
        let mut total_usage = 0u64;
        let mut template_usage: Vec<_> = templates.values().collect();

        for template in templates.values() {
            *templates_by_category
                .entry(template.category.clone())
                .or_insert(0) += 1;
            total_usage += template.usage_count;
        }

        // 排序获取最常用的模板
        template_usage.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));
        let most_used_templates = template_usage
            .iter()
            .take(10)
            .map(|t| (t.id.clone(), t.name.clone(), t.usage_count))
            .collect();

        // 获取最近的模板
        let mut recent_templates: Vec<_> = templates.values().cloned().collect();
        recent_templates.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        recent_templates.truncate(5);

        Ok(HtmlTemplateStatistics {
            total_templates,
            active_templates,
            templates_by_category,
            total_usage,
            most_used_templates,
            recent_templates,
        })
    }

    // 私有辅助方法

    async fn load_templates(&self) -> Result<()> {
        let templates_dir = &self.base_path;
        if !templates_dir.exists() {
            return Ok(());
        }

        let mut dir = tokio::fs::read_dir(templates_dir).await?;
        let mut templates = self.templates.write().await;

        while let Some(entry) = dir.next_entry().await? {
            if let Some(extension) = entry.path().extension() {
                if extension == "json" {
                    match tokio::fs::read_to_string(entry.path()).await {
                        Ok(content) => match serde_json::from_str::<HtmlTemplate>(&content) {
                            Ok(template) => {
                                templates.insert(template.id.clone(), template);
                            }
                            Err(e) => error!("解析模板失败: {:?} - {}", entry.path(), e),
                        },
                        Err(e) => error!("读取模板文件失败: {:?} - {}", entry.path(), e),
                    }
                }
            }
        }

        info!("加载了 {} 个HTML模板", templates.len());
        Ok(())
    }

    async fn save_template(&self, template: &HtmlTemplate) -> Result<()> {
        let template_path = self.get_template_path(&template.id);
        let content = serde_json::to_string_pretty(template)?;
        tokio::fs::write(&template_path, content).await?;
        Ok(())
    }

    fn get_template_path(&self, template_id: &str) -> PathBuf {
        self.base_path.join(format!("{}.json", template_id))
    }

    async fn save_callback(&self, callback: &HtmlCallback) -> Result<()> {
        let callbacks_dir = self.base_path.parent().unwrap().join("html_callbacks");
        if !callbacks_dir.exists() {
            tokio::fs::create_dir_all(&callbacks_dir).await?;
        }

        let callback_path = callbacks_dir.join(format!("{}.json", callback.id));
        let content = serde_json::to_string_pretty(callback)?;
        tokio::fs::write(&callback_path, content).await?;
        Ok(())
    }

    fn validate_template_content(
        &self,
        content: &str,
        variables: &[TemplateVariable],
    ) -> Result<()> {
        // 检查HTML格式是否有效
        if content.trim().is_empty() {
            return Err(anyhow!("模板内容不能为空"));
        }

        // 检查变量引用是否正确
        let var_regex = Regex::new(r"\{\{(\w+)\}\}").unwrap();
        let used_vars: std::collections::HashSet<String> = var_regex
            .captures_iter(content)
            .map(|cap| cap[1].to_string())
            .collect();

        let defined_vars: std::collections::HashSet<String> =
            variables.iter().map(|v| v.name.clone()).collect();

        let undefined_vars: Vec<String> = used_vars.difference(&defined_vars).cloned().collect();

        if !undefined_vars.is_empty() {
            return Err(anyhow!("模板中使用了未定义的变量: {:?}", undefined_vars));
        }

        Ok(())
    }

    fn validate_template_variables(
        &self,
        template_vars: &[TemplateVariable],
        provided_vars: &HashMap<String, serde_json::Value>,
    ) -> Result<()> {
        for var in template_vars {
            if var.required && !provided_vars.contains_key(&var.name) {
                return Err(anyhow!("缺少必需变量: {}", var.name));
            }

            if let Some(value) = provided_vars.get(&var.name) {
                // 验证变量类型
                match var.var_type {
                    VariableType::String => {
                        if !value.is_string() && !value.is_null() {
                            return Err(anyhow!("变量 {} 应为字符串类型", var.name));
                        }
                    }
                    VariableType::Number => {
                        if !value.is_number() && !value.is_null() {
                            return Err(anyhow!("变量 {} 应为数字类型", var.name));
                        }
                    }
                    VariableType::Boolean => {
                        if !value.is_boolean() && !value.is_null() {
                            return Err(anyhow!("变量 {} 应为布尔类型", var.name));
                        }
                    }
                    VariableType::Array => {
                        if !value.is_array() && !value.is_null() {
                            return Err(anyhow!("变量 {} 应为数组类型", var.name));
                        }
                    }
                    _ => {} // 其他类型暂不严格验证
                }

                // 正则验证
                if let Some(ref pattern) = var.validation {
                    if let Some(str_value) = value.as_str() {
                        let regex = Regex::new(pattern)?;
                        if !regex.is_match(str_value) {
                            return Err(anyhow!("变量 {} 格式不正确", var.name));
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn render_content(
        &self,
        content: &str,
        variables: &HashMap<String, serde_json::Value>,
    ) -> Result<String> {
        let var_regex = Regex::new(r"\{\{(\w+)\}\}").unwrap();

        let result = var_regex.replace_all(content, |caps: &regex::Captures| {
            let var_name = &caps[1];
            if let Some(value) = variables.get(var_name) {
                match value {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Null => "".to_string(),
                    _ => value.to_string(),
                }
            } else {
                format!("{{{{{}}}}}", var_name) // 保留未找到的变量
            }
        });

        Ok(result.to_string())
    }

    async fn increment_usage_count(&self, template_id: &str) -> Result<()> {
        let mut templates = self.templates.write().await;
        if let Some(template) = templates.get_mut(template_id) {
            template.usage_count += 1;
            template.updated_at = Utc::now();

            // 保存到磁盘
            let template_clone = template.clone();
            drop(templates);
            self.save_template(&template_clone).await?;
        }
        Ok(())
    }

    /// 渲染纯HTML模式
    async fn render_html_only(
        &self,
        template: &HtmlTemplate,
        request: &HtmlRenderRequest,
    ) -> Result<(String, Option<ReactComponentData>, Option<String>)> {
        let rendered_html = self.render_content(&template.content, &request.variables)?;
        Ok((rendered_html, None, None))
    }

    /// 渲染React组件模式
    async fn render_react_component(
        &self,
        template: &HtmlTemplate,
        request: &HtmlRenderRequest,
    ) -> Result<(String, Option<ReactComponentData>, Option<String>)> {
        // 检查是否有React组件配置
        let react_config = template.react_component.as_ref()
            .ok_or_else(|| anyhow!("模板未配置React组件"))?;

        // 生成React组件数据
        let component_data = self.generate_react_component_data(react_config, &request.variables)?;
        
        // 生成自适应样式
        let adaptive_styles = if let Some(ref adaptive_config) = template.adaptive_config {
            Some(self.generate_adaptive_styles(adaptive_config, &request.client_config)?)
        } else {
            None
        };

        // 生成容器HTML
        let container_html = self.generate_react_container_html(&component_data, &adaptive_styles)?;

        Ok((container_html, Some(component_data), adaptive_styles))
    }

    /// 渲染混合模式（HTML + React）
    async fn render_hybrid(
        &self,
        template: &HtmlTemplate,
        request: &HtmlRenderRequest,
    ) -> Result<(String, Option<ReactComponentData>, Option<String>)> {
        // 先渲染HTML内容
        let html_content = self.render_content(&template.content, &request.variables)?;
        
        // 如果有React组件配置，添加React组件
        let (react_data, adaptive_styles) = if let Some(ref react_config) = template.react_component {
            let component_data = self.generate_react_component_data(react_config, &request.variables)?;
            let styles = if let Some(ref adaptive_config) = template.adaptive_config {
                Some(self.generate_adaptive_styles(adaptive_config, &request.client_config)?)
            } else {
                None
            };
            (Some(component_data), styles)
        } else {
            (None, None)
        };

        // 组合HTML和React组件
        let combined_html = if let Some(ref react_data) = react_data {
            format!(
                "{}\n<div id=\"react-container-{}\" class=\"react-component-container\"></div>",
                html_content,
                Uuid::new_v4().simple()
            )
        } else {
            html_content
        };

        Ok((combined_html, react_data, adaptive_styles))
    }

    /// 生成React组件数据
    fn generate_react_component_data(
        &self,
        react_config: &ReactComponentConfig,
        variables: &HashMap<String, serde_json::Value>,
    ) -> Result<ReactComponentData> {
        // 处理组件属性，支持变量替换
        let mut processed_props = HashMap::new();
        for (key, value) in &react_config.props {
            let processed_value = self.process_react_prop_value(value, variables)?;
            processed_props.insert(key.clone(), processed_value);
        }

        // 处理样式
        let processed_styles = if let Some(ref styles) = react_config.styles {
            let mut processed = HashMap::new();
            for (key, value) in styles {
                let processed_value = self.process_react_prop_value(value, variables)?;
                processed.insert(key.clone(), processed_value);
            }
            Some(serde_json::to_value(processed)?)
        } else {
            None
        };

        // 处理事件
        let processed_events = if let Some(ref events) = react_config.events {
            let mut processed = HashMap::new();
            for (key, value) in events {
                let processed_value = self.render_content(value, variables)?;
                processed.insert(key.clone(), processed_value);
            }
            Some(serde_json::to_value(processed)?)
        } else {
            None
        };

        Ok(ReactComponentData {
            component_name: react_config.component_name.clone(),
            props: serde_json::to_value(processed_props)?,
            styles: processed_styles,
            events: processed_events,
            dependencies: react_config.dependencies.clone(),
            version: react_config.version.clone(),
        })
    }

    /// 处理React属性值
    fn process_react_prop_value(
        &self,
        value: &serde_json::Value,
        variables: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        match value {
            serde_json::Value::String(s) => {
                // 如果是字符串，尝试变量替换
                let processed = self.render_content(s, variables)?;
                Ok(serde_json::Value::String(processed))
            }
            serde_json::Value::Object(obj) => {
                // 如果是对象，递归处理
                let mut processed = HashMap::new();
                for (key, val) in obj {
                    let processed_val = self.process_react_prop_value(val, variables)?;
                    processed.insert(key.clone(), processed_val);
                }
                Ok(serde_json::to_value(processed)?)
            }
            serde_json::Value::Array(arr) => {
                // 如果是数组，递归处理每个元素
                let mut processed = Vec::new();
                for item in arr {
                    let processed_item = self.process_react_prop_value(item, variables)?;
                    processed.push(processed_item);
                }
                Ok(serde_json::to_value(processed)?)
            }
            _ => Ok(value.clone()), // 其他类型直接返回
        }
    }

    /// 生成自适应样式
    fn generate_adaptive_styles(
        &self,
        adaptive_config: &AdaptiveConfig,
        client_config: &Option<ClientConfig>,
    ) -> Result<String> {
        if !adaptive_config.enabled {
            return Ok(String::new());
        }

        let mut styles = Vec::new();
        
        // 基础容器样式
        styles.push(format!(
            ".adaptive-container-{} {{",
            Uuid::new_v4().simple()
        ));
        
        // 设置最小/最大尺寸
        if let Some(min_width) = adaptive_config.min_width {
            styles.push(format!("  min-width: {}px;", min_width));
        }
        if let Some(max_width) = adaptive_config.max_width {
            styles.push(format!("  max-width: {}px;", max_width));
        }
        if let Some(min_height) = adaptive_config.min_height {
            styles.push(format!("  min-height: {}px;", min_height));
        }
        if let Some(max_height) = adaptive_config.max_height {
            styles.push(format!("  max-height: {}px;", max_height));
        }

        // 根据自适应模式设置样式
        match adaptive_config.mode.as_str() {
            "fit" => {
                styles.push("  width: 100%;".to_string());
                styles.push("  height: auto;".to_string());
                styles.push("  object-fit: contain;".to_string());
            }
            "scroll" => {
                styles.push("  width: 100%;".to_string());
                styles.push("  height: 100%;".to_string());
                styles.push("  overflow: auto;".to_string());
            }
            "scale" => {
                styles.push("  width: 100%;".to_string());
                styles.push("  height: 100%;".to_string());
                styles.push("  transform: scale(1);".to_string());
                styles.push("  transform-origin: top left;".to_string());
            }
            _ => {
                styles.push("  width: 100%;".to_string());
                styles.push("  height: auto;".to_string());
            }
        }

        // 根据容器类型设置样式
        match adaptive_config.container_type.as_str() {
            "dialog" => {
                styles.push("  position: relative;".to_string());
                styles.push("  margin: 10px;".to_string());
                styles.push("  border-radius: 8px;".to_string());
                styles.push("  box-shadow: 0 2px 10px rgba(0,0,0,0.1);".to_string());
            }
            "modal" => {
                styles.push("  position: fixed;".to_string());
                styles.push("  top: 50%;".to_string());
                styles.push("  left: 50%;".to_string());
                styles.push("  transform: translate(-50%, -50%);".to_string());
                styles.push("  z-index: 1000;".to_string());
            }
            "inline" => {
                styles.push("  display: inline-block;".to_string());
                styles.push("  vertical-align: top;".to_string());
            }
            _ => {}
        }

        // 添加自定义CSS类
        if let Some(ref custom_classes) = adaptive_config.custom_classes {
            for class in custom_classes {
                styles.push(format!("  /* 自定义类: {} */", class));
            }
        }

        styles.push("}".to_string());

        // 添加响应式断点
        if let Some(ref breakpoints) = adaptive_config.breakpoints {
            for (breakpoint, config) in breakpoints {
                styles.push(format!("@media (max-width: {}px) {{", breakpoint));
                if let Some(config_obj) = config.as_object() {
                    for (property, value) in config_obj {
                        styles.push(format!("  {}: {};", property, value));
                    }
                }
                styles.push("}".to_string());
            }
        }

        Ok(styles.join("\n"))
    }

    /// 生成React容器HTML
    fn generate_react_container_html(
        &self,
        component_data: &ReactComponentData,
        adaptive_styles: &Option<String>,
    ) -> Result<String> {
        let container_id = format!("react-container-{}", Uuid::new_v4().simple());
        
        let mut html = format!(
            r#"<div id="{}" class="react-component-container">"#,
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
  "version": "{}"
}}
</script>"#,
            container_id,
            component_data.component_name,
            component_data.props,
            component_data.styles.as_ref().unwrap_or(&serde_json::Value::Null),
            component_data.events.as_ref().unwrap_or(&serde_json::Value::Null),
            serde_json::to_value(component_data.dependencies.as_ref().unwrap_or(&Vec::new()))?,
            component_data.version.as_deref().unwrap_or("1.0.0")
        ));

        html.push_str("\n</div>");
        
        Ok(html)
    }
}
