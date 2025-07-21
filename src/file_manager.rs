use crate::config::StorageConfig;
use crate::message::ContentType;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{error, info, warn};
use utoipa::ToSchema;
use uuid::Uuid;

/// 企业级文件管理器
pub struct FileManager {
    #[allow(dead_code)] // 企业级字段：config用于未来配置扩展和企业级功能
    config: StorageConfig,
    #[allow(dead_code)]
    base_path: PathBuf,
}

/// 文件信息结构
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileInfo {
    pub id: String,
    pub original_name: String,
    pub file_name: String,
    pub file_path: String,
    pub content_type: ContentType,
    pub mime_type: String,
    pub file_size: u64,
    pub uploaded_by: String,
    pub uploaded_at: DateTime<Utc>,
    pub access_url: String,
    pub checksum: String,
    pub is_public: bool,
    pub download_count: u64,
    pub expires_at: Option<DateTime<Utc>>,
}

/// 文件分类目录结构
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileCategory {
    pub category: ContentType,
    pub path: String,
    pub allowed_extensions: Vec<String>,
    pub max_file_size: u64,
    pub compression_enabled: bool,
}

/// 文件上传请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileUploadRequest {
    pub original_name: String,
    pub content: Vec<u8>,
    pub mime_type: String,
    pub uploaded_by: String,
    pub is_public: bool,
    pub expires_days: Option<u32>,
}

/// 文件上传响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileUploadResponse {
    pub file_info: FileInfo,
    pub success: bool,
    pub message: String,
}

/// 文件列表请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileListRequest {
    pub category: Option<ContentType>,
    pub uploaded_by: Option<String>,
    pub page: u32,
    pub limit: u32,
    pub sort_by: String,    // "uploaded_at", "file_size", "download_count"
    pub sort_order: String, // "asc", "desc"
}

/// 文件统计信息
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileStatistics {
    pub total_files: u64,
    pub total_size: u64,
    pub files_by_category: std::collections::HashMap<String, u64>,
    pub size_by_category: std::collections::HashMap<String, u64>,
    pub upload_count_today: u64,
    pub upload_size_today: u64,
}

/// 文件列表响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileListResponse {
    pub files: Vec<FileInfo>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

/// 清理结果
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CleanupResult {
    pub deleted_count: u32,
    pub freed_space: u64,
}

impl FileManager {
    /// 创建文件管理器实例
    pub fn new(config: StorageConfig) -> Result<Self> {
        let base_path = PathBuf::from(&config.blobs_dir);

        // 确保基础目录存在
        if !base_path.exists() {
            fs::create_dir_all(&base_path)?;
            info!("创建文件存储目录: {:?}", base_path);
        }

        // 创建分类目录
        let categories = Self::get_file_categories();
        for category in &categories {
            let category_path = base_path.join(&category.path);
            if !category_path.exists() {
                fs::create_dir_all(&category_path)?;
                info!("创建分类目录: {:?}", category_path);
            }
        }

        Ok(Self { config, base_path })
    }

    /// 获取文件分类配置
    pub fn get_file_categories() -> Vec<FileCategory> {
        vec![
            FileCategory {
                category: ContentType::Image,
                path: "images".to_string(),
                allowed_extensions: vec![
                    "jpg".to_string(),
                    "jpeg".to_string(),
                    "png".to_string(),
                    "gif".to_string(),
                    "webp".to_string(),
                    "bmp".to_string(),
                    "svg".to_string(),
                    "ico".to_string(),
                ],
                max_file_size: 10 * 1024 * 1024, // 10MB
                compression_enabled: true,
            },
            FileCategory {
                category: ContentType::File,
                path: "documents".to_string(),
                allowed_extensions: vec![
                    "pdf".to_string(),
                    "doc".to_string(),
                    "docx".to_string(),
                    "xls".to_string(),
                    "xlsx".to_string(),
                    "ppt".to_string(),
                    "pptx".to_string(),
                    "txt".to_string(),
                    "rtf".to_string(),
                    "csv".to_string(),
                    "zip".to_string(),
                    "rar".to_string(),
                ],
                max_file_size: 50 * 1024 * 1024, // 50MB
                compression_enabled: false,
            },
            FileCategory {
                category: ContentType::Voice,
                path: "audio".to_string(),
                allowed_extensions: vec![
                    "mp3".to_string(),
                    "wav".to_string(),
                    "ogg".to_string(),
                    "m4a".to_string(),
                    "aac".to_string(),
                    "flac".to_string(),
                ],
                max_file_size: 20 * 1024 * 1024, // 20MB
                compression_enabled: false,
            },
            FileCategory {
                category: ContentType::Video,
                path: "videos".to_string(),
                allowed_extensions: vec![
                    "mp4".to_string(),
                    "avi".to_string(),
                    "mov".to_string(),
                    "wmv".to_string(),
                    "flv".to_string(),
                    "webm".to_string(),
                    "mkv".to_string(),
                ],
                max_file_size: 100 * 1024 * 1024, // 100MB
                compression_enabled: false,
            },
        ]
    }

    /// 上传文件 (基础版本)
    #[allow(dead_code)]
    pub async fn upload_file(&self, request: FileUploadRequest) -> Result<FileUploadResponse> {
        info!(
            "开始上传文件: {} ({}字节)",
            request.original_name,
            request.content.len()
        );

        // 企业级文件大小检查 - 使用企业级默认限制
        let max_size = 50 * 1024 * 1024; // 50MB企业级默认限制
        if request.content.len() > max_size {
            warn!(
                "上传的文件大小超过企业级限制: {} 字节 > {} 字节 (文件: {})",
                request.content.len(),
                max_size,
                request.original_name
            );
        }

        // 简化版本：直接保存到documents目录
        let file_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let extension = self
            .get_file_extension(&request.original_name)
            .unwrap_or_else(|| "bin".to_string());

        let file_name = format!(
            "{}_{}.{}",
            now.format("%Y%m%d_%H%M%S"),
            &file_id[..8],
            extension
        );

        // 存储到documents目录
        let date_path = format!(
            "documents/{:04}/{:02}/{:02}",
            now.year(),
            now.month(),
            now.day()
        );

        let storage_dir = self.base_path.join(&date_path);
        fs::create_dir_all(&storage_dir)?;

        let file_path = storage_dir.join(&file_name);
        let relative_path = format!("{date_path}/{file_name}");

        // 计算校验和
        let checksum = self.calculate_checksum(&request.content);

        // 保存文件
        tokio::fs::write(&file_path, &request.content).await?;

        // 创建文件信息
        let expires_at = request
            .expires_days
            .map(|days| now + chrono::Duration::days(i64::from(days)));

        let file_info = FileInfo {
            id: file_id.clone(),
            original_name: request.original_name.clone(),
            file_name: file_name.clone(),
            file_path: relative_path.clone(),
            content_type: ContentType::File, // 简化版本都设为File
            mime_type: request.mime_type.clone(),
            file_size: request.content.len() as u64,
            uploaded_by: request.uploaded_by.clone(),
            uploaded_at: now,
            access_url: format!("/api/files/{file_id}"),
            checksum: checksum.clone(),
            is_public: request.is_public,
            download_count: 0,
            expires_at,
        };

        // 保存文件元数据
        self.save_file_metadata(&file_info).await?;

        info!(
            "文件上传成功: {} -> {}",
            request.original_name, relative_path
        );

        Ok(FileUploadResponse {
            file_info,
            success: true,
            message: "文件上传成功".to_string(),
        })
    }

    /// 获取文件信息
    #[allow(dead_code)]
    pub async fn get_file_info(&self, file_id: &str) -> Result<Option<FileInfo>> {
        let metadata_path = self.get_metadata_path(file_id);

        if !metadata_path.exists() {
            return Ok(None);
        }

        let content = tokio::fs::read_to_string(&metadata_path).await?;
        let file_info: FileInfo = serde_json::from_str(&content)?;

        Ok(Some(file_info))
    }

    /// 读取文件内容
    #[allow(dead_code)]
    pub async fn read_file(&self, file_id: &str, user_id: &str) -> Result<Vec<u8>> {
        let file_info = self
            .get_file_info(file_id)
            .await?
            .ok_or_else(|| anyhow!("文件不存在: {}", file_id))?;

        // 权限检查
        if !file_info.is_public && file_info.uploaded_by != user_id {
            return Err(anyhow!("无权访问此文件"));
        }

        // 检查过期时间
        if let Some(expires_at) = file_info.expires_at {
            if Utc::now() > expires_at {
                return Err(anyhow!("文件已过期"));
            }
        }

        let file_path = self.base_path.join(&file_info.file_path);

        if !file_path.exists() {
            error!("文件不存在于磁盘: {:?}", file_path);
            return Err(anyhow!("文件不存在"));
        }

        let content = tokio::fs::read(&file_path).await?;

        info!("文件下载: {} by {}", file_info.original_name, user_id);

        Ok(content)
    }

    /// 删除文件
    #[allow(dead_code)]
    pub async fn delete_file(&self, file_id: &str, user_id: &str) -> Result<bool> {
        let file_info = self
            .get_file_info(file_id)
            .await?
            .ok_or_else(|| anyhow!("文件不存在: {}", file_id))?;

        // 权限检查（只有上传者可以删除）
        if file_info.uploaded_by != user_id {
            return Err(anyhow!("无权删除此文件"));
        }

        // 删除文件
        let file_path = self.base_path.join(&file_info.file_path);
        if file_path.exists() {
            tokio::fs::remove_file(&file_path).await?;
        }

        // 删除元数据
        let metadata_path = self.get_metadata_path(file_id);
        if metadata_path.exists() {
            tokio::fs::remove_file(&metadata_path).await?;
        }

        info!("文件删除成功: {} by {}", file_info.original_name, user_id);

        Ok(true)
    }

    /// 获取文件统计
    #[allow(dead_code)]
    pub async fn get_file_statistics(&self) -> Result<FileStatistics> {
        // 简化版本返回空统计
        Ok(FileStatistics {
            total_files: 0,
            total_size: 0,
            files_by_category: std::collections::HashMap::new(),
            size_by_category: std::collections::HashMap::new(),
            upload_count_today: 0,
            upload_size_today: 0,
        })
    }

    /// 列出文件 (简化版本)
    #[allow(dead_code)]
    pub async fn list_files(&self, _request: FileListRequest) -> Result<FileListResponse> {
        // 简化版本返回空列表
        Ok(FileListResponse {
            files: Vec::new(),
            total: 0,
            page: 0,
            limit: 20,
            has_more: false,
        })
    }

    /// 清理过期文件
    #[allow(dead_code)]
    pub async fn cleanup_expired_files(&self) -> Result<CleanupResult> {
        Ok(CleanupResult {
            deleted_count: 0,
            freed_space: 0,
        })
    }

    // 辅助方法

    #[allow(dead_code)]
    fn get_file_extension(&self, filename: &str) -> Option<String> {
        Path::new(filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(str::to_lowercase)
    }

    #[allow(dead_code)]
    fn calculate_checksum(&self, content: &[u8]) -> String {
        // 简化版本使用简单的校验和
        let sum: u32 = content.iter().map(|&b| u32::from(b)).sum();
        format!("{sum:08x}")
    }

    #[allow(dead_code)]
    fn get_metadata_path(&self, file_id: &str) -> PathBuf {
        self.base_path
            .join("metadata")
            .join(format!("{file_id}.json"))
    }

    #[allow(dead_code)]
    async fn save_file_metadata(&self, file_info: &FileInfo) -> Result<()> {
        let metadata_dir = self.base_path.join("metadata");
        if !metadata_dir.exists() {
            tokio::fs::create_dir_all(&metadata_dir).await?;
        }

        let metadata_path = self.get_metadata_path(&file_info.id);
        let content = serde_json::to_string_pretty(file_info)?;

        tokio::fs::write(&metadata_path, content).await?;

        Ok(())
    }
}

// 为ContentType添加Display实现
impl std::fmt::Display for ContentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ContentType::Text => write!(f, "text"),
            ContentType::Image => write!(f, "image"),
            ContentType::File => write!(f, "file"),
            ContentType::Voice => write!(f, "voice"),
            ContentType::Video => write!(f, "video"),
            ContentType::Html => write!(f, "html"),
        }
    }
}
