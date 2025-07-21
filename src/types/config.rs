use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use crate::file_manager::FileCategory;

/// 系统配置响应
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct SystemConfig {
    /// `WebSocket配置`
    pub websocket: WebSocketConfig,
    /// API配置
    pub api: ApiConfig,
    /// 上传配置
    pub upload: UploadConfig,
    /// HTML模板配置
    pub html_templates: HtmlTemplateConfig,
}

/// `WebSocket连接配置`
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct WebSocketConfig {
    /// `WebSocket连接URL`
    pub url: String,
}

/// API配置
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct ApiConfig {
    /// API基础URL
    pub url: String,
}

/// 上传配置
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UploadConfig {
    /// 最大文件大小（字节）
    pub max_file_size: u64,
    /// 允许的文件类型
    pub allowed_types: Vec<String>,
    /// 文件分类
    pub categories: Vec<FileCategory>,
}

/// HTML模板配置
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct HtmlTemplateConfig {
    /// 是否启用模板功能
    pub enabled: bool,
    /// 最大变量数量
    pub max_variables: u32,
    /// 最大模板大小（字节）
    pub max_template_size: u64,
} 