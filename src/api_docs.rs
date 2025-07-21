use utoipa::{
    openapi::{
        security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
        Components, OpenApi, Paths, SecurityRequirement,
    },
    OpenApi as OpenApiTrait,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// API配置结构体 - 支持动态前端适配
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ApiConfig {
    /// API版本
    pub version: String,
    /// 支持的客户端类型
    pub supported_clients: Vec<String>,
    /// 功能特性开关
    pub features: HashMap<String, bool>,
    /// UI配置
    pub ui_config: UiConfig,
    /// 权限配置
    pub permissions: PermissionConfig,
    /// 业务规则
    pub business_rules: BusinessRules,
    /// 主题配置
    pub themes: ThemeConfig,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// UI配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UiConfig {
    /// 布局配置
    pub layout: LayoutConfig,
    /// 组件配置
    pub components: ComponentConfig,
    /// 响应式断点
    pub breakpoints: BreakpointConfig,
    /// 动画配置
    pub animations: AnimationConfig,
}

/// 布局配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct LayoutConfig {
    /// 侧边栏宽度
    pub sidebar_width: u32,
    /// 头部高度
    pub header_height: u32,
    /// 是否显示侧边栏
    pub show_sidebar: bool,
    /// 是否显示头部
    pub show_header: bool,
    /// 布局模式 (horizontal/vertical)
    pub mode: String,
}

/// 组件配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ComponentConfig {
    /// 表格配置
    pub table: TableConfig,
    /// 表单配置
    pub form: FormConfig,
    /// 按钮配置
    pub button: ButtonConfig,
    /// 模态框配置
    pub modal: ModalConfig,
}

/// 表格配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TableConfig {
    /// 默认分页大小
    pub default_page_size: u32,
    /// 最大分页大小
    pub max_page_size: u32,
    /// 是否支持虚拟滚动
    pub virtual_scroll: bool,
    /// 是否支持列排序
    pub sortable: bool,
    /// 是否支持列过滤
    pub filterable: bool,
}

/// 表单配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct FormConfig {
    /// 验证模式 (onChange/onBlur/onSubmit)
    pub validation_mode: String,
    /// 是否显示帮助文本
    pub show_help_text: bool,
    /// 是否显示错误图标
    pub show_error_icon: bool,
    /// 自动保存间隔(秒)
    pub auto_save_interval: Option<u32>,
}

/// 按钮配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ButtonConfig {
    /// 默认大小
    pub default_size: String,
    /// 是否显示加载状态
    pub show_loading: bool,
    /// 防抖延迟(毫秒)
    pub debounce_delay: u32,
}

/// 模态框配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ModalConfig {
    /// 默认宽度
    pub default_width: String,
    /// 是否支持拖拽
    pub draggable: bool,
    /// 是否支持调整大小
    pub resizable: bool,
    /// 遮罩层透明度
    pub backdrop_opacity: f32,
}

/// 响应式断点配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct BreakpointConfig {
    /// 移动端断点
    pub mobile: u32,
    /// 平板断点
    pub tablet: u32,
    /// 桌面断点
    pub desktop: u32,
    /// 大屏断点
    pub large: u32,
}

/// 动画配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AnimationConfig {
    /// 页面切换动画
    pub page_transition: String,
    /// 组件进入动画
    pub component_enter: String,
    /// 组件退出动画
    pub component_exit: String,
    /// 动画持续时间
    pub duration: u32,
}

/// 权限配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct PermissionConfig {
    /// 角色权限映射
    pub role_permissions: HashMap<String, Vec<String>>,
    /// 功能权限
    pub feature_permissions: HashMap<String, Vec<String>>,
    /// 数据权限
    pub data_permissions: HashMap<String, DataPermission>,
    /// 默认权限
    pub default_permissions: Vec<String>,
}

/// 数据权限
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct DataPermission {
    /// 读取权限
    pub read: bool,
    /// 写入权限
    pub write: bool,
    /// 删除权限
    pub delete: bool,
    /// 数据范围
    pub scope: String,
}

/// 业务规则配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct BusinessRules {
    /// 验证规则
    pub validation_rules: HashMap<String, ValidationRule>,
    /// 计算规则
    pub calculation_rules: HashMap<String, CalculationRule>,
    /// 工作流规则
    pub workflow_rules: HashMap<String, WorkflowRule>,
    /// 业务逻辑
    pub business_logic: HashMap<String, BusinessLogic>,
}

/// 验证规则
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ValidationRule {
    /// 规则类型
    pub rule_type: String,
    /// 规则参数
    pub parameters: HashMap<String, serde_json::Value>,
    /// 错误消息
    pub error_message: String,
    /// 是否启用
    pub enabled: bool,
}

/// 计算规则
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CalculationRule {
    /// 计算公式
    pub formula: String,
    /// 依赖字段
    pub dependencies: Vec<String>,
    /// 计算时机
    pub trigger: String,
    /// 是否缓存结果
    pub cache_result: bool,
}

/// 工作流规则
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WorkflowRule {
    /// 工作流步骤
    pub steps: Vec<WorkflowStep>,
    /// 条件分支
    pub conditions: Vec<WorkflowCondition>,
    /// 默认步骤
    pub default_step: String,
}

/// 工作流步骤
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WorkflowStep {
    /// 步骤ID
    pub id: String,
    /// 步骤名称
    pub name: String,
    /// 步骤类型
    pub step_type: String,
    /// 步骤参数
    pub parameters: HashMap<String, serde_json::Value>,
}

/// 工作流条件
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WorkflowCondition {
    /// 条件表达式
    pub expression: String,
    /// 目标步骤
    pub target_step: String,
    /// 优先级
    pub priority: u32,
}

/// 业务逻辑
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct BusinessLogic {
    /// 逻辑类型
    pub logic_type: String,
    /// 执行条件
    pub condition: String,
    /// 执行动作
    pub action: String,
    /// 执行顺序
    pub order: u32,
}

/// 主题配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ThemeConfig {
    /// 可用主题
    pub available_themes: Vec<Theme>,
    /// 默认主题
    pub default_theme: String,
    /// 主题切换
    pub theme_switching: ThemeSwitching,
}

/// 主题
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct Theme {
    /// 主题ID
    pub id: String,
    /// 主题名称
    pub name: String,
    /// 主题描述
    pub description: String,
    /// 颜色配置
    pub colors: ColorConfig,
    /// 字体配置
    pub fonts: FontConfig,
    /// 间距配置
    pub spacing: SpacingConfig,
}

/// 颜色配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ColorConfig {
    /// 主色调
    pub primary: String,
    /// 次要色调
    pub secondary: String,
    /// 成功色
    pub success: String,
    /// 警告色
    pub warning: String,
    /// 错误色
    pub error: String,
    /// 信息色
    pub info: String,
    /// 背景色
    pub background: String,
    /// 前景色
    pub foreground: String,
}

/// 字体配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct FontConfig {
    /// 主字体
    pub primary: String,
    /// 次要字体
    pub secondary: String,
    /// 代码字体
    pub code: String,
    /// 字体大小
    pub sizes: HashMap<String, String>,
}

/// 间距配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SpacingConfig {
    /// 基础间距
    pub base: u32,
    /// 间距倍数
    pub scale: Vec<u32>,
    /// 组件间距
    pub components: HashMap<String, u32>,
}

/// 主题切换配置
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ThemeSwitching {
    /// 是否支持自动切换
    pub auto_switch: bool,
    /// 切换时间
    pub switch_time: Option<String>,
    /// 切换条件
    pub switch_condition: Option<String>,
}

/// API响应结构
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ApiResponse<T> {
    /// 状态码
    pub code: u32,
    /// 消息
    pub message: String,
    /// 数据
    pub data: Option<T>,
    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

/// 分页响应
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct PaginatedResponse<T> {
    /// 数据列表
    pub items: Vec<T>,
    /// 总数量
    pub total: u64,
    /// 当前页
    pub page: u32,
    /// 每页大小
    pub page_size: u32,
    /// 总页数
    pub total_pages: u32,
}

/// 配置更新事件
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ConfigUpdateEvent {
    /// 事件类型
    pub event_type: String,
    /// 配置路径
    pub config_path: String,
    /// 新值
    pub new_value: serde_json::Value,
    /// 旧值
    pub old_value: Option<serde_json::Value>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 实时配置管理器
pub struct ConfigManager {
    config: ApiConfig,
    subscribers: Vec<tokio::sync::broadcast::Sender<ConfigUpdateEvent>>,
}

impl ConfigManager {
    pub fn new() -> Self {
        let config = ApiConfig {
            version: "1.0.0".to_string(),
            supported_clients: vec!["web".to_string(), "mobile".to_string()],
            features: HashMap::new(),
            ui_config: UiConfig {
                layout: LayoutConfig {
                    sidebar_width: 280,
                    header_height: 64,
                    show_sidebar: true,
                    show_header: true,
                    mode: "vertical".to_string(),
                },
                components: ComponentConfig {
                    table: TableConfig {
                        default_page_size: 20,
                        max_page_size: 100,
                        virtual_scroll: true,
                        sortable: true,
                        filterable: true,
                    },
                    form: FormConfig {
                        validation_mode: "onBlur".to_string(),
                        show_help_text: true,
                        show_error_icon: true,
                        auto_save_interval: Some(30),
                    },
                    button: ButtonConfig {
                        default_size: "md".to_string(),
                        show_loading: true,
                        debounce_delay: 300,
                    },
                    modal: ModalConfig {
                        default_width: "600px".to_string(),
                        draggable: true,
                        resizable: true,
                        backdrop_opacity: 0.5,
                    },
                },
                breakpoints: BreakpointConfig {
                    mobile: 768,
                    tablet: 1024,
                    desktop: 1280,
                    large: 1920,
                },
                animations: AnimationConfig {
                    page_transition: "fade".to_string(),
                    component_enter: "slideIn".to_string(),
                    component_exit: "slideOut".to_string(),
                    duration: 300,
                },
            },
            permissions: PermissionConfig {
                role_permissions: HashMap::new(),
                feature_permissions: HashMap::new(),
                data_permissions: HashMap::new(),
                default_permissions: vec!["read".to_string()],
            },
            business_rules: BusinessRules {
                validation_rules: HashMap::new(),
                calculation_rules: HashMap::new(),
                workflow_rules: HashMap::new(),
                business_logic: HashMap::new(),
            },
            themes: ThemeConfig {
                available_themes: vec![
                    Theme {
                        id: "light".to_string(),
                        name: "浅色主题".to_string(),
                        description: "默认浅色主题".to_string(),
                        colors: ColorConfig {
                            primary: "#1890ff".to_string(),
                            secondary: "#f5f5f5".to_string(),
                            success: "#52c41a".to_string(),
                            warning: "#faad14".to_string(),
                            error: "#ff4d4f".to_string(),
                            info: "#1890ff".to_string(),
                            background: "#ffffff".to_string(),
                            foreground: "#000000".to_string(),
                        },
                        fonts: FontConfig {
                            primary: "Inter".to_string(),
                            secondary: "Arial".to_string(),
                            code: "Fira Code".to_string(),
                            sizes: HashMap::new(),
                        },
                        spacing: SpacingConfig {
                            base: 8,
                            scale: vec![0, 4, 8, 16, 24, 32, 48, 64],
                            components: HashMap::new(),
                        },
                    },
                    Theme {
                        id: "dark".to_string(),
                        name: "深色主题".to_string(),
                        description: "深色主题".to_string(),
                        colors: ColorConfig {
                            primary: "#177ddc".to_string(),
                            secondary: "#1f1f1f".to_string(),
                            success: "#49aa19".to_string(),
                            warning: "#d89614".to_string(),
                            error: "#d32029".to_string(),
                            info: "#177ddc".to_string(),
                            background: "#141414".to_string(),
                            foreground: "#ffffff".to_string(),
                        },
                        fonts: FontConfig {
                            primary: "Inter".to_string(),
                            secondary: "Arial".to_string(),
                            code: "Fira Code".to_string(),
                            sizes: HashMap::new(),
                        },
                        spacing: SpacingConfig {
                            base: 8,
                            scale: vec![0, 4, 8, 16, 24, 32, 48, 64],
                            components: HashMap::new(),
                        },
                    },
                ],
                default_theme: "light".to_string(),
                theme_switching: ThemeSwitching {
                    auto_switch: false,
                    switch_time: None,
                    switch_condition: None,
                },
            },
            updated_at: Utc::now(),
        };

        Self {
            config,
            subscribers: Vec::new(),
        }
    }

    /// 获取当前配置
    pub fn get_config(&self) -> &ApiConfig {
        &self.config
    }

    /// 更新配置
    pub async fn update_config(&mut self, new_config: ApiConfig) -> Result<(), String> {
        let old_config = self.config.clone();
        self.config = new_config;
        self.config.updated_at = Utc::now();

        // 通知订阅者
        let event = ConfigUpdateEvent {
            event_type: "config_updated".to_string(),
            config_path: "root".to_string(),
            new_value: serde_json::to_value(&self.config).unwrap(),
            old_value: Some(serde_json::to_value(&old_config).unwrap()),
            updated_at: self.config.updated_at,
        };

        self.notify_subscribers(event).await;
        Ok(())
    }

    /// 订阅配置更新
    pub fn subscribe(&mut self) -> tokio::sync::broadcast::Receiver<ConfigUpdateEvent> {
        let (tx, rx) = tokio::sync::broadcast::channel(100);
        self.subscribers.push(tx);
        rx
    }

    /// 通知订阅者
    async fn notify_subscribers(&self, event: ConfigUpdateEvent) {
        for subscriber in &self.subscribers {
            let _ = subscriber.send(event.clone());
        }
    }
}

/// OpenAPI文档生成
#[derive(OpenApi)]
#[openapi(
    paths(
        get_api_config,
        update_api_config,
        subscribe_config_updates,
        get_swagger_ui,
        get_redoc_ui,
        get_rapidoc_ui
    ),
    components(
        schemas(
            ApiConfig,
            UiConfig,
            LayoutConfig,
            ComponentConfig,
            TableConfig,
            FormConfig,
            ButtonConfig,
            ModalConfig,
            BreakpointConfig,
            AnimationConfig,
            PermissionConfig,
            DataPermission,
            BusinessRules,
            ValidationRule,
            CalculationRule,
            WorkflowRule,
            WorkflowStep,
            WorkflowCondition,
            BusinessLogic,
            ThemeConfig,
            Theme,
            ColorConfig,
            FontConfig,
            SpacingConfig,
            ThemeSwitching,
            ApiResponse<ApiConfig>,
            PaginatedResponse<ApiConfig>,
            ConfigUpdateEvent
        )
    ),
    tags(
        (name = "api-config", description = "API配置管理")
    ),
    info(
        title = "客服系统 API",
        description = "客服系统后端API文档，支持动态前端适配",
        version = "1.0.0",
        contact(
            name = "API Support",
            email = "support@example.com"
        )
    ),
    servers(
        (url = "http://localhost:8080", description = "开发服务器"),
        (url = "https://api.example.com", description = "生产服务器")
    )
)]
pub struct ApiDoc;

/// 获取API配置
#[utoipa::path(
    get,
    path = "/api/config",
    tag = "api-config",
    responses(
        (status = 200, description = "成功获取配置", body = ApiResponse<ApiConfig>),
        (status = 500, description = "服务器错误")
    )
)]
pub async fn get_api_config() -> impl warp::Reply {
    let config = ApiConfig {
        version: "1.0.0".to_string(),
        supported_clients: vec!["web".to_string(), "mobile".to_string()],
        features: HashMap::new(),
        ui_config: UiConfig {
            layout: LayoutConfig {
                sidebar_width: 280,
                header_height: 64,
                show_sidebar: true,
                show_header: true,
                mode: "vertical".to_string(),
            },
            components: ComponentConfig {
                table: TableConfig {
                    default_page_size: 20,
                    max_page_size: 100,
                    virtual_scroll: true,
                    sortable: true,
                    filterable: true,
                },
                form: FormConfig {
                    validation_mode: "onBlur".to_string(),
                    show_help_text: true,
                    show_error_icon: true,
                    auto_save_interval: Some(30),
                },
                button: ButtonConfig {
                    default_size: "md".to_string(),
                    show_loading: true,
                    debounce_delay: 300,
                },
                modal: ModalConfig {
                    default_width: "600px".to_string(),
                    draggable: true,
                    resizable: true,
                    backdrop_opacity: 0.5,
                },
            },
            breakpoints: BreakpointConfig {
                mobile: 768,
                tablet: 1024,
                desktop: 1280,
                large: 1920,
            },
            animations: AnimationConfig {
                page_transition: "fade".to_string(),
                component_enter: "slideIn".to_string(),
                component_exit: "slideOut".to_string(),
                duration: 300,
            },
        },
        permissions: PermissionConfig {
            role_permissions: HashMap::new(),
            feature_permissions: HashMap::new(),
            data_permissions: HashMap::new(),
            default_permissions: vec!["read".to_string()],
        },
        business_rules: BusinessRules {
            validation_rules: HashMap::new(),
            calculation_rules: HashMap::new(),
            workflow_rules: HashMap::new(),
            business_logic: HashMap::new(),
        },
        themes: ThemeConfig {
            available_themes: vec![
                Theme {
                    id: "light".to_string(),
                    name: "浅色主题".to_string(),
                    description: "默认浅色主题".to_string(),
                    colors: ColorConfig {
                        primary: "#1890ff".to_string(),
                        secondary: "#f5f5f5".to_string(),
                        success: "#52c41a".to_string(),
                        warning: "#faad14".to_string(),
                        error: "#ff4d4f".to_string(),
                        info: "#1890ff".to_string(),
                        background: "#ffffff".to_string(),
                        foreground: "#000000".to_string(),
                    },
                    fonts: FontConfig {
                        primary: "Inter".to_string(),
                        secondary: "Arial".to_string(),
                        code: "Fira Code".to_string(),
                        sizes: HashMap::new(),
                    },
                    spacing: SpacingConfig {
                        base: 8,
                        scale: vec![0, 4, 8, 16, 24, 32, 48, 64],
                        components: HashMap::new(),
                    },
                },
            ],
            default_theme: "light".to_string(),
            theme_switching: ThemeSwitching {
                auto_switch: false,
                switch_time: None,
                switch_condition: None,
            },
        },
        updated_at: Utc::now(),
    };

    let response = ApiResponse {
        code: 200,
        message: "成功获取配置".to_string(),
        data: Some(config),
        timestamp: Utc::now(),
    };

    warp::reply::json(&response)
}

/// 更新API配置
#[utoipa::path(
    put,
    path = "/api/config",
    tag = "api-config",
    request_body = ApiConfig,
    responses(
        (status = 200, description = "成功更新配置", body = ApiResponse<ApiConfig>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器错误")
    )
)]
pub async fn update_api_config(config: ApiConfig) -> impl warp::Reply {
    // 这里应该更新实际的配置管理器
    let response = ApiResponse {
        code: 200,
        message: "成功更新配置".to_string(),
        data: Some(config),
        timestamp: Utc::now(),
    };

    warp::reply::json(&response)
}

/// 订阅配置更新
#[utoipa::path(
    get,
    path = "/api/config/subscribe",
    tag = "api-config",
    responses(
        (status = 200, description = "WebSocket连接成功"),
        (status = 500, description = "服务器错误")
    )
)]
pub async fn subscribe_config_updates() -> impl warp::Reply {
    // 这里应该返回WebSocket升级响应
    warp::reply::json(&serde_json::json!({
        "message": "WebSocket连接已建立",
        "timestamp": Utc::now()
    }))
}

/// 获取Swagger UI
#[utoipa::path(
    get,
    path = "/api/docs/swagger",
    tag = "api-config",
    responses(
        (status = 200, description = "Swagger UI页面")
    )
)]
pub async fn get_swagger_ui() -> impl warp::Reply {
    // 返回Swagger UI HTML
    warp::reply::html(include_str!("../static/swagger-ui.html"))
}

/// 获取ReDoc UI
#[utoipa::path(
    get,
    path = "/api/docs/redoc",
    tag = "api-config",
    responses(
        (status = 200, description = "ReDoc UI页面")
    )
)]
pub async fn get_redoc_ui() -> impl warp::Reply {
    // 返回ReDoc UI HTML
    warp::reply::html(include_str!("../static/redoc-ui.html"))
}

/// 获取RapiDoc UI
#[utoipa::path(
    get,
    path = "/api/docs/rapidoc",
    tag = "api-config",
    responses(
        (status = 200, description = "RapiDoc UI页面")
    )
)]
pub async fn get_rapidoc_ui() -> impl warp::Reply {
    // 返回RapiDoc UI HTML
    warp::reply::html(include_str!("../static/rapidoc-ui.html"))
}