use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::file_manager::{FileManager, FileListRequest};
use crate::message::ContentType;

/// FileManager的扩展trait，添加API所需的额外功能
#[async_trait::async_trait]
pub trait FileManagerExt {
    #[allow(dead_code)]
    async fn list_files(&self, category: Option<&str>, user_id: Option<&str>) -> Result<Vec<FileInfo>>;
    async fn save_file(&self, name: &str, data: &[u8], category: &str, user_id: &str) -> Result<serde_json::Value>;
    async fn get_file(&self, file_id: &str) -> Result<(Vec<u8>, FileMetadata)>;
    #[allow(dead_code)]
    async fn delete_file(&self, file_id: &str, user_id: &str) -> Result<()>;
    #[allow(dead_code)]
    async fn get_file_info(&self, file_id: &str) -> Result<serde_json::Value>;
    async fn search_files(&self, keyword: &str, category: Option<&str>) -> Result<Vec<FileInfo>>;
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub file_id: String,
    pub filename: String,
    pub size: u64,
    pub category: String,
    pub upload_time: String,
    pub uploaded_by: String,
    pub content_type: Option<String>,
    pub download_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub filename: String,
    pub content_type: Option<String>,
    pub size: u64,
    pub uploaded_at: String,
}

/// FileManager的扩展实现
#[async_trait::async_trait]
impl FileManagerExt for FileManager {
    #[allow(dead_code)]
    async fn list_files(&self, category: Option<&str>, user_id: Option<&str>) -> Result<Vec<FileInfo>> {
        // 构建 FileListRequest
        let request = FileListRequest {
            category: category.and_then(|c| {
                match c {
                    "image" => Some(ContentType::Image),
                    "file" => Some(ContentType::File),
                    "voice" => Some(ContentType::Voice),
                    "video" => Some(ContentType::Video),
                    _ => None,
                }
            }),
            uploaded_by: user_id.map(std::string::ToString::to_string),
            page: 1,
            limit: 100,
            sort_by: "uploaded_at".to_string(),
            sort_order: "desc".to_string(),
        };
        
        // 调用原始的 list_files 方法
        let response = FileManager::list_files(self, request).await?;
        
        // 转换为 FileInfo 格式
        let mut files = Vec::new();
        for file in response.files {
            files.push(FileInfo {
                file_id: file.id.clone(),
                filename: file.original_name.clone(),
                size: file.file_size,
                category: file.content_type.to_string(),
                upload_time: file.uploaded_at.to_rfc3339(),
                uploaded_by: file.uploaded_by.clone(),
                content_type: Some(file.mime_type.clone()),
                download_url: file.access_url.clone(),
            });
        }
        
        Ok(files)
    }

    async fn save_file(&self, name: &str, data: &[u8], category: &str, user_id: &str) -> Result<serde_json::Value> {
        // 使用FileManager的上传功能
        let request = crate::file_manager::FileUploadRequest {
            original_name: name.to_string(),
            content: data.to_vec(),
            mime_type: mime_guess::from_path(name)
                .first_or_octet_stream()
                .to_string(),
            uploaded_by: user_id.to_string(),
            is_public: true,
            expires_days: None,
        };

        let response = self.upload_file(request).await?;
        
        Ok(serde_json::json!({
            "file_id": response.file_info.id,
            "filename": name,
            "size": data.len(),
            "category": category,
            "upload_time": response.file_info.uploaded_at.to_rfc3339(),
            "uploaded_by": user_id,
            "access_url": response.file_info.access_url,
        }))
    }

    async fn get_file(&self, file_id: &str) -> Result<(Vec<u8>, FileMetadata)> {
        // 使用FileManager的读取功能
        let file_info = FileManager::get_file_info(self, file_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("文件不存在"))?;

        let data = self.read_file(file_id, "system").await?;
        
        let metadata = FileMetadata {
            filename: file_info.original_name.clone(),
            content_type: Some(file_info.mime_type.clone()),
            size: file_info.file_size,
            uploaded_at: file_info.uploaded_at.to_rfc3339(),
        };

        Ok((data, metadata))
    }

    #[allow(dead_code)]
    async fn delete_file(&self, file_id: &str, user_id: &str) -> Result<()> {
        // 调用原始的 delete_file 方法，传递两个参数
        FileManager::delete_file(self, file_id, user_id).await?;
        Ok(())
    }

    #[allow(dead_code)]
    async fn get_file_info(&self, file_id: &str) -> Result<serde_json::Value> {
        let info = FileManager::get_file_info(self, file_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("文件不存在"))?;

        Ok(serde_json::json!({
            "file_id": info.id,
            "filename": info.original_name,
            "size": info.file_size,
            "content_type": info.mime_type,
            "uploaded_by": info.uploaded_by,
            "uploaded_at": info.uploaded_at.to_rfc3339(),
            "download_count": info.download_count,
            "is_public": info.is_public,
            "checksum": info.checksum,
            "expires_at": info.expires_at.map(|t| t.to_rfc3339()),
        }))
    }

    async fn search_files(&self, keyword: &str, category: Option<&str>) -> Result<Vec<FileInfo>> {
        // 构建 FileListRequest 获取所有文件
        let request = FileListRequest {
            category: category.and_then(|c| {
                match c {
                    "image" => Some(ContentType::Image),
                    "file" => Some(ContentType::File),
                    "voice" => Some(ContentType::Voice),
                    "video" => Some(ContentType::Video),
                    _ => None,
                }
            }),
            uploaded_by: None,
            page: 1,
            limit: 1000, // 获取更多文件进行搜索
            sort_by: "uploaded_at".to_string(),
            sort_order: "desc".to_string(),
        };
        
        let response = FileManager::list_files(self, request).await?;
        
        // 过滤包含关键字的文件
        let results: Vec<FileInfo> = response.files
            .into_iter()
            .filter(|f| f.original_name.to_lowercase().contains(&keyword.to_lowercase()))
            .map(|file| FileInfo {
                file_id: file.id.clone(),
                filename: file.original_name.clone(),
                size: file.file_size,
                category: file.content_type.to_string(),
                upload_time: file.uploaded_at.to_rfc3339(),
                uploaded_by: file.uploaded_by.clone(),
                content_type: Some(file.mime_type.clone()),
                download_url: file.access_url.clone(),
            })
            .collect();

        Ok(results)
    }
}

/// `创建增强的FileManager`
#[allow(dead_code)]
pub fn create_enhanced_file_manager(config: crate::config::StorageConfig) -> Result<Arc<FileManager>> {
    let manager = FileManager::new(config)?;
    Ok(Arc::new(manager))
}
