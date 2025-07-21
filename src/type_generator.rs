use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use chrono::{DateTime, Utc};

/// TypeScript类型生成器
pub struct TypeScriptGenerator {
    output_dir: String,
    types: Vec<TypeDefinition>,
}

/// 类型定义
#[derive(Debug, Clone)]
pub struct TypeDefinition {
    pub name: String,
    pub content: String,
    pub dependencies: Vec<String>,
}

impl TypeScriptGenerator {
    pub fn new(output_dir: &str) -> Self {
        Self {
            output_dir: output_dir.to_string(),
            types: Vec::new(),
        }
    }

    /// 生成所有类型定义
    pub fn generate_all_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.generate_api_config_types()?;
        self.generate_ui_config_types()?;
        self.generate_permission_types()?;
        self.generate_business_rule_types()?;
        self.generate_theme_types()?;
        self.generate_common_types()?;
        self.write_types_to_files()?;
        Ok(())
    }

    /// 生成API配置类型
    fn generate_api_config_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let api_config = r#"
/**
 * API配置结构体 - 支持动态前端适配
 */
export interface ApiConfig {
  /** API版本 */
  version: string;
  /** 支持的客户端类型 */
  supported_clients: string[];
  /** 功能特性开关 */
  features: Record<string, boolean>;
  /** UI配置 */
  ui_config: UiConfig;
  /** 权限配置 */
  permissions: PermissionConfig;
  /** 业务规则 */
  business_rules: BusinessRules;
  /** 主题配置 */
  themes: ThemeConfig;
  /** 更新时间 */
  updated_at: string;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  /** 状态码 */
  code: number;
  /** 消息 */
  message: string;
  /** 数据 */
  data?: T;
  /** 时间戳 */
  timestamp: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
}

/**
 * 配置更新事件
 */
export interface ConfigUpdateEvent {
  /** 事件类型 */
  event_type: string;
  /** 配置路径 */
  config_path: string;
  /** 新值 */
  new_value: any;
  /** 旧值 */
  old_value?: any;
  /** 更新时间 */
  updated_at: string;
}
"#;

        self.types.push(TypeDefinition {
            name: "api-config".to_string(),
            content: api_config.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 生成UI配置类型
    fn generate_ui_config_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let ui_config = r#"
/**
 * UI配置
 */
export interface UiConfig {
  /** 布局配置 */
  layout: LayoutConfig;
  /** 组件配置 */
  components: ComponentConfig;
  /** 响应式断点 */
  breakpoints: BreakpointConfig;
  /** 动画配置 */
  animations: AnimationConfig;
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  /** 侧边栏宽度 */
  sidebar_width: number;
  /** 头部高度 */
  header_height: number;
  /** 是否显示侧边栏 */
  show_sidebar: boolean;
  /** 是否显示头部 */
  show_header: boolean;
  /** 布局模式 (horizontal/vertical) */
  mode: string;
}

/**
 * 组件配置
 */
export interface ComponentConfig {
  /** 表格配置 */
  table: TableConfig;
  /** 表单配置 */
  form: FormConfig;
  /** 按钮配置 */
  button: ButtonConfig;
  /** 模态框配置 */
  modal: ModalConfig;
}

/**
 * 表格配置
 */
export interface TableConfig {
  /** 默认分页大小 */
  default_page_size: number;
  /** 最大分页大小 */
  max_page_size: number;
  /** 是否支持虚拟滚动 */
  virtual_scroll: boolean;
  /** 是否支持列排序 */
  sortable: boolean;
  /** 是否支持列过滤 */
  filterable: boolean;
}

/**
 * 表单配置
 */
export interface FormConfig {
  /** 验证模式 (onChange/onBlur/onSubmit) */
  validation_mode: string;
  /** 是否显示帮助文本 */
  show_help_text: boolean;
  /** 是否显示错误图标 */
  show_error_icon: boolean;
  /** 自动保存间隔(秒) */
  auto_save_interval?: number;
}

/**
 * 按钮配置
 */
export interface ButtonConfig {
  /** 默认大小 */
  default_size: string;
  /** 是否显示加载状态 */
  show_loading: boolean;
  /** 防抖延迟(毫秒) */
  debounce_delay: number;
}

/**
 * 模态框配置
 */
export interface ModalConfig {
  /** 默认宽度 */
  default_width: string;
  /** 是否支持拖拽 */
  draggable: boolean;
  /** 是否支持调整大小 */
  resizable: boolean;
  /** 遮罩层透明度 */
  backdrop_opacity: number;
}

/**
 * 响应式断点配置
 */
export interface BreakpointConfig {
  /** 移动端断点 */
  mobile: number;
  /** 平板断点 */
  tablet: number;
  /** 桌面断点 */
  desktop: number;
  /** 大屏断点 */
  large: number;
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  /** 页面切换动画 */
  page_transition: string;
  /** 组件进入动画 */
  component_enter: string;
  /** 组件退出动画 */
  component_exit: string;
  /** 动画持续时间 */
  duration: number;
}
"#;

        self.types.push(TypeDefinition {
            name: "ui-config".to_string(),
            content: ui_config.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 生成权限类型
    fn generate_permission_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let permission_types = r#"
/**
 * 权限配置
 */
export interface PermissionConfig {
  /** 角色权限映射 */
  role_permissions: Record<string, string[]>;
  /** 功能权限 */
  feature_permissions: Record<string, string[]>;
  /** 数据权限 */
  data_permissions: Record<string, DataPermission>;
  /** 默认权限 */
  default_permissions: string[];
}

/**
 * 数据权限
 */
export interface DataPermission {
  /** 读取权限 */
  read: boolean;
  /** 写入权限 */
  write: boolean;
  /** 删除权限 */
  delete: boolean;
  /** 数据范围 */
  scope: string;
}
"#;

        self.types.push(TypeDefinition {
            name: "permissions".to_string(),
            content: permission_types.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 生成业务规则类型
    fn generate_business_rule_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let business_rules = r#"
/**
 * 业务规则配置
 */
export interface BusinessRules {
  /** 验证规则 */
  validation_rules: Record<string, ValidationRule>;
  /** 计算规则 */
  calculation_rules: Record<string, CalculationRule>;
  /** 工作流规则 */
  workflow_rules: Record<string, WorkflowRule>;
  /** 业务逻辑 */
  business_logic: Record<string, BusinessLogic>;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 规则类型 */
  rule_type: string;
  /** 规则参数 */
  parameters: Record<string, any>;
  /** 错误消息 */
  error_message: string;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 计算规则
 */
export interface CalculationRule {
  /** 计算公式 */
  formula: string;
  /** 依赖字段 */
  dependencies: string[];
  /** 计算时机 */
  trigger: string;
  /** 是否缓存结果 */
  cache_result: boolean;
}

/**
 * 工作流规则
 */
export interface WorkflowRule {
  /** 工作流步骤 */
  steps: WorkflowStep[];
  /** 条件分支 */
  conditions: WorkflowCondition[];
  /** 默认步骤 */
  default_step: string;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  /** 步骤ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤类型 */
  step_type: string;
  /** 步骤参数 */
  parameters: Record<string, any>;
}

/**
 * 工作流条件
 */
export interface WorkflowCondition {
  /** 条件表达式 */
  expression: string;
  /** 目标步骤 */
  target_step: string;
  /** 优先级 */
  priority: number;
}

/**
 * 业务逻辑
 */
export interface BusinessLogic {
  /** 逻辑类型 */
  logic_type: string;
  /** 执行条件 */
  condition: string;
  /** 执行动作 */
  action: string;
  /** 执行顺序 */
  order: number;
}
"#;

        self.types.push(TypeDefinition {
            name: "business-rules".to_string(),
            content: business_rules.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 生成主题类型
    fn generate_theme_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let theme_types = r#"
/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 可用主题 */
  available_themes: Theme[];
  /** 默认主题 */
  default_theme: string;
  /** 主题切换 */
  theme_switching: ThemeSwitching;
}

/**
 * 主题
 */
export interface Theme {
  /** 主题ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 主题描述 */
  description: string;
  /** 颜色配置 */
  colors: ColorConfig;
  /** 字体配置 */
  fonts: FontConfig;
  /** 间距配置 */
  spacing: SpacingConfig;
}

/**
 * 颜色配置
 */
export interface ColorConfig {
  /** 主色调 */
  primary: string;
  /** 次要色调 */
  secondary: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
  /** 背景色 */
  background: string;
  /** 前景色 */
  foreground: string;
}

/**
 * 字体配置
 */
export interface FontConfig {
  /** 主字体 */
  primary: string;
  /** 次要字体 */
  secondary: string;
  /** 代码字体 */
  code: string;
  /** 字体大小 */
  sizes: Record<string, string>;
}

/**
 * 间距配置
 */
export interface SpacingConfig {
  /** 基础间距 */
  base: number;
  /** 间距倍数 */
  scale: number[];
  /** 组件间距 */
  components: Record<string, number>;
}

/**
 * 主题切换配置
 */
export interface ThemeSwitching {
  /** 是否支持自动切换 */
  auto_switch: boolean;
  /** 切换时间 */
  switch_time?: string;
  /** 切换条件 */
  switch_condition?: string;
}
"#;

        self.types.push(TypeDefinition {
            name: "themes".to_string(),
            content: theme_types.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 生成通用类型
    fn generate_common_types(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let common_types = r#"
/**
 * 通用类型定义
 */

/** 基础实体 */
export interface BaseEntity {
  /** ID */
  id: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/** 分页参数 */
export interface PaginationParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  page_size?: number;
  /** 排序字段 */
  sort_by?: string;
  /** 排序方向 */
  sort_order?: 'asc' | 'desc';
}

/** 过滤参数 */
export interface FilterParams {
  /** 搜索关键词 */
  search?: string;
  /** 过滤条件 */
  filters?: Record<string, any>;
  /** 日期范围 */
  date_range?: {
    start: string;
    end: string;
  };
}

/** 查询参数 */
export interface QueryParams extends PaginationParams, FilterParams {}

/** 文件上传响应 */
export interface FileUploadResponse {
  /** 文件ID */
  file_id: string;
  /** 文件名 */
  filename: string;
  /** 文件大小 */
  size: number;
  /** 文件类型 */
  mime_type: string;
  /** 文件URL */
  url: string;
  /** 上传时间 */
  uploaded_at: string;
}

/** WebSocket消息 */
export interface WebSocketMessage<T = any> {
  /** 消息类型 */
  type: string;
  /** 消息数据 */
  data: T;
  /** 时间戳 */
  timestamp: string;
  /** 消息ID */
  message_id?: string;
}

/** 错误信息 */
export interface ErrorInfo {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 错误堆栈 */
  stack?: string;
}

/** 成功响应 */
export interface SuccessResponse<T = any> {
  /** 成功标志 */
  success: true;
  /** 数据 */
  data: T;
  /** 消息 */
  message?: string;
}

/** 错误响应 */
export interface ErrorResponse {
  /** 成功标志 */
  success: false;
  /** 错误信息 */
  error: ErrorInfo;
}

/** API响应联合类型 */
export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;
"#;

        self.types.push(TypeDefinition {
            name: "common".to_string(),
            content: common_types.to_string(),
            dependencies: vec![],
        });

        Ok(())
    }

    /// 写入类型文件
    fn write_types_to_files(&self) -> Result<(), Box<dyn std::error::Error>> {
        // 创建输出目录
        fs::create_dir_all(&self.output_dir)?;

        // 生成索引文件
        let mut index_content = String::new();
        index_content.push_str("// 自动生成的TypeScript类型定义\n");
        index_content.push_str("// 由Rust后端生成，请勿手动修改\n\n");

        for type_def in &self.types {
            index_content.push_str(&format!("export * from './{}';\n", type_def.name));
        }

        // 写入索引文件
        let index_path = format!("{}/index.ts", self.output_dir);
        fs::write(&index_path, index_content)?;

        // 写入各个类型文件
        for type_def in &self.types {
            let file_path = format!("{}/{}.ts", self.output_dir, type_def.name);
            fs::write(&file_path, type_def.content)?;
        }

        // 生成package.json
        let package_json = serde_json::json!({
            "name": "@kefu-system/types",
            "version": "1.0.0",
            "description": "客服系统TypeScript类型定义",
            "main": "index.ts",
            "types": "index.ts",
            "files": [
                "*.ts",
                "*.d.ts"
            ],
            "scripts": {
                "build": "tsc",
                "generate": "echo 'Types generated from Rust backend'"
            },
            "devDependencies": {
                "typescript": "^5.0.0"
            }
        });

        let package_path = format!("{}/package.json", self.output_dir);
        fs::write(&package_path, serde_json::to_string_pretty(&package_json)?)?;

        // 生成tsconfig.json
        let tsconfig = serde_json::json!({
            "compilerOptions": {
                "target": "ES2020",
                "module": "ESNext",
                "moduleResolution": "node",
                "declaration": true,
                "outDir": "./dist",
                "strict": true,
                "esModuleInterop": true,
                "skipLibCheck": true,
                "forceConsistentCasingInFileNames": true
            },
            "include": [
                "*.ts"
            ],
            "exclude": [
                "node_modules",
                "dist"
            ]
        });

        let tsconfig_path = format!("{}/tsconfig.json", self.output_dir);
        fs::write(&tsconfig_path, serde_json::to_string_pretty(&tsconfig)?)?;

        Ok(())
    }
}

/// 生成TypeScript类型定义
pub async fn generate_typescript_types() -> Result<(), Box<dyn std::error::Error>> {
    let mut generator = TypeScriptGenerator::new("frontend/kefu-app/src/types");
    generator.generate_all_types()?;
    
    println!("TypeScript类型定义已生成到: frontend/kefu-app/src/types");
    Ok(())
}