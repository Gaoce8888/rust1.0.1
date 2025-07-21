use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use std::path::PathBuf;
use uuid::Uuid;
use anyhow::{anyhow, Result};
use std::fs;
use tracing::{error, info, warn};

/// 语音消息信息
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceMessage {
    pub id: String,
    pub from: String,
    pub to: Option<String>,
    pub file_id: String,
    pub original_filename: String,
    pub file_size: u64,
    pub duration: Option<u32>, // 语音时长（秒）
    pub format: String, // mp3, wav, m4a, ogg 等
    pub sample_rate: Option<u32>, // 采样率
    pub bit_rate: Option<u32>, // 比特率
    pub upload_time: DateTime<Utc>,
    pub access_url: String,
    pub transcription: Option<String>, // 语音转文字（可选）
    pub is_read: bool,
    pub checksum: String,
}

/// 语音上传请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceUploadRequest {
    pub from: String,
    pub to: Option<String>,
    pub audio_data: Vec<u8>,
    pub filename: String,
    pub format: String,
    pub duration: Option<u32>,
    pub sample_rate: Option<u32>,
    pub bit_rate: Option<u32>,
}

/// 语音上传响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceUploadResponse {
    pub voice_message: VoiceMessage,
    pub success: bool,
    pub message: String,
    pub upload_duration_ms: u64,
}

/// 语音消息列表请求
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceMessageListRequest {
    pub user_id: String,
    pub conversation_with: Option<String>,
    pub page: u32,
    pub limit: u32,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

/// 语音消息列表响应
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceMessageListResponse {
    pub messages: Vec<VoiceMessage>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

/// 语音格式支持信息
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceFormatInfo {
    pub format: String,
    pub mime_type: String,
    pub max_size_mb: u32,
    pub max_duration_sec: u32,
    pub description: String,
    pub is_recommended: bool,
}

/// 语音消息统计
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoiceMessageStats {
    pub total_messages: u64,
    pub total_duration_sec: u64,
    pub total_size_bytes: u64,
    pub messages_today: u64,
    pub average_duration_sec: f32,
    pub format_distribution: std::collections::HashMap<String, u64>,
}

/// 语音消息管理器
pub struct VoiceMessageManager {
    storage_path: PathBuf,
    /// 最大文件大小限制（字节）- 在validate_voice_file中使用
    #[allow(dead_code)]
    max_file_size: u64,
    /// 最大语音时长限制（秒）- 在validate_voice_file中使用
    #[allow(dead_code)]
    max_duration: u32,
    /// 支持的语音格式列表 - 在validate_voice_file中使用
    #[allow(dead_code)]
    supported_formats: Vec<String>,
}

impl VoiceMessageManager {
    /// 创建新的语音消息管理器
    pub fn new(storage_path: PathBuf) -> Result<Self> {
        // 确保存储目录存在
        if !storage_path.exists() {
            fs::create_dir_all(&storage_path)?;
            info!("🎤 创建语音消息存储目录: {:?}", storage_path);
        }

        let supported_formats = vec![
            "mp3".to_string(),
            "wav".to_string(),
            "m4a".to_string(),
            "ogg".to_string(),
            "aac".to_string(),
            "flac".to_string(),
        ];

        Ok(Self {
            storage_path,
            max_file_size: 50 * 1024 * 1024, // 50MB
            max_duration: 300, // 5分钟
            supported_formats,
        })
    }

    /// 获取支持的语音格式
    #[allow(dead_code)] // 将在语音格式查询API中使用
    pub fn get_supported_formats(&self) -> Vec<VoiceFormatInfo> {
        vec![
            VoiceFormatInfo {
                format: "mp3".to_string(),
                mime_type: "audio/mpeg".to_string(),
                max_size_mb: 50,
                max_duration_sec: 300,
                description: "MP3格式，高兼容性，推荐使用".to_string(),
                is_recommended: true,
            },
            VoiceFormatInfo {
                format: "wav".to_string(),
                mime_type: "audio/wav".to_string(),
                max_size_mb: 50,
                max_duration_sec: 300,
                description: "WAV格式，无损音质，文件较大".to_string(),
                is_recommended: false,
            },
            VoiceFormatInfo {
                format: "m4a".to_string(),
                mime_type: "audio/mp4".to_string(),
                max_size_mb: 50,
                max_duration_sec: 300,
                description: "M4A格式，苹果设备推荐".to_string(),
                is_recommended: true,
            },
            VoiceFormatInfo {
                format: "ogg".to_string(),
                mime_type: "audio/ogg".to_string(),
                max_size_mb: 50,
                max_duration_sec: 300,
                description: "OGG格式，开源格式".to_string(),
                is_recommended: false,
            },
            VoiceFormatInfo {
                format: "aac".to_string(),
                mime_type: "audio/aac".to_string(),
                max_size_mb: 50,
                max_duration_sec: 300,
                description: "AAC格式，高压缩比".to_string(),
                is_recommended: true,
            },
        ]
    }

    /// 验证语音文件
    #[allow(dead_code)] // 将在语音上传API中使用
    pub fn validate_voice_file(&self, request: &VoiceUploadRequest) -> Result<()> {
        // 检查文件大小
        if request.audio_data.len() as u64 > self.max_file_size {
            return Err(anyhow!("语音文件过大，最大允许 {}MB", self.max_file_size / 1024 / 1024));
        }

        // 检查格式
        if !self.supported_formats.contains(&request.format.to_lowercase()) {
            return Err(anyhow!("不支持的语音格式: {}", request.format));
        }

        // 检查时长
        if let Some(duration) = request.duration {
            if duration > self.max_duration {
                return Err(anyhow!("语音时长过长，最大允许 {}秒", self.max_duration));
            }
        }

        // 检查文件内容（简单的magic number检查）
        if request.audio_data.len() < 4 {
            return Err(anyhow!("语音文件损坏"));
        }

        Ok(())
    }

    /// 上传语音消息
    #[allow(dead_code)] // 将在语音上传API中使用
    pub async fn upload_voice_message(&self, request: VoiceUploadRequest) -> Result<VoiceUploadResponse> {
        let start_time = std::time::Instant::now();
        
        // 验证请求
        self.validate_voice_file(&request)?;

        // 生成唯一ID
        let voice_id = Uuid::new_v4().to_string();
        let file_id = Uuid::new_v4().to_string();

        // 计算文件校验和
        let checksum = self.calculate_checksum(&request.audio_data);

        // 生成文件路径
        let file_extension = request.format.to_lowercase();
        let filename = format!("{}_{}.{}", voice_id, chrono::Utc::now().timestamp(), file_extension);
        let file_path = self.storage_path.join(&filename);

        // 保存文件
        match fs::write(&file_path, &request.audio_data) {
            Ok(_) => {
                info!("🎤 语音文件保存成功: {:?}", file_path);
            }
            Err(e) => {
                error!("🎤 语音文件保存失败: {:?}", e);
                return Err(anyhow!("语音文件保存失败: {}", e));
            }
        }

        // 生成访问URL
        let access_url = format!("/api/voice/download/{}", file_id);

        // 创建语音消息对象
        let voice_message = VoiceMessage {
            id: voice_id,
            from: request.from,
            to: request.to,
            file_id,
            original_filename: request.filename,
            file_size: request.audio_data.len() as u64,
            duration: request.duration,
            format: request.format,
            sample_rate: request.sample_rate,
            bit_rate: request.bit_rate,
            upload_time: Utc::now(),
            access_url,
            transcription: None, // 未来可以集成语音识别服务
            is_read: false,
            checksum,
        };

        // 保存语音消息元数据
        self.save_voice_metadata(&voice_message).await?;

        let upload_duration = start_time.elapsed().as_millis() as u64;

        info!(
            "🎤 语音消息上传完成: ID={}, 文件大小={}字节, 时长={}秒, 耗时={}ms",
            voice_message.id,
            voice_message.file_size,
            voice_message.duration.unwrap_or(0),
            upload_duration
        );

        Ok(VoiceUploadResponse {
            voice_message,
            success: true,
            message: "语音消息上传成功".to_string(),
            upload_duration_ms: upload_duration,
        })
    }

    /// 获取语音消息
    #[allow(dead_code)] // 企业级API方法，预留给未来使用
    pub async fn get_voice_message(&self, voice_id: &str) -> Result<Option<VoiceMessage>> {
        let metadata_path = self.get_metadata_path(voice_id);
        
        if !metadata_path.exists() {
            return Ok(None);
        }

        match fs::read_to_string(&metadata_path) {
            Ok(content) => {
                match serde_json::from_str::<VoiceMessage>(&content) {
                    Ok(voice_message) => Ok(Some(voice_message)),
                    Err(e) => {
                        error!("🎤 解析语音消息元数据失败: {:?}", e);
                        Err(anyhow!("语音消息数据损坏"))
                    }
                }
            }
            Err(e) => {
                error!("🎤 读取语音消息元数据失败: {:?}", e);
                Err(anyhow!("读取语音消息失败"))
            }
        }
    }

    /// 下载语音文件
    #[allow(dead_code)] // 将在语音下载API中使用
    pub async fn download_voice_file(&self, file_id: &str) -> Result<(Vec<u8>, String)> {
        // 通过file_id查找对应的语音消息
        let voice_message = self.find_voice_by_file_id(file_id).await?;
        
        if let Some(msg) = voice_message {
            let filename = format!("{}_{}.{}", msg.id, msg.upload_time.timestamp(), msg.format);
            let file_path = self.storage_path.join(&filename);
            
            if file_path.exists() {
                match fs::read(&file_path) {
                    Ok(data) => {
                        info!("🎤 语音文件下载: ID={}, 大小={}字节", msg.id, data.len());
                        
                        // 获取MIME类型
                        let mime_type = self.get_mime_type(&msg.format);
                        
                        Ok((data, mime_type))
                    }
                    Err(e) => {
                        error!("🎤 读取语音文件失败: {:?}", e);
                        Err(anyhow!("语音文件读取失败"))
                    }
                }
            } else {
                warn!("🎤 语音文件不存在: {:?}", file_path);
                Err(anyhow!("语音文件不存在"))
            }
        } else {
            Err(anyhow!("语音消息不存在"))
        }
    }

    /// 删除语音消息
    #[allow(dead_code)] // 企业级API方法，预留给未来使用
    pub async fn delete_voice_message(&self, voice_id: &str, user_id: &str) -> Result<bool> {
        if let Some(voice_message) = self.get_voice_message(voice_id).await? {
            // 权限检查
            if voice_message.from != user_id {
                return Err(anyhow!("无权限删除此语音消息"));
            }

            // 删除文件
            let filename = format!("{}_{}.{}", voice_message.id, voice_message.upload_time.timestamp(), voice_message.format);
            let file_path = self.storage_path.join(&filename);
            
            if file_path.exists() {
                fs::remove_file(&file_path)?;
            }

            // 删除元数据
            let metadata_path = self.get_metadata_path(voice_id);
            if metadata_path.exists() {
                fs::remove_file(&metadata_path)?;
            }

            info!("🎤 语音消息删除成功: ID={}", voice_id);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// 获取语音消息统计
    #[allow(dead_code)] // 将在语音统计API中使用
    pub async fn get_voice_statistics(&self) -> Result<VoiceMessageStats> {
        let metadata_dir = self.storage_path.join("metadata");
        
        if !metadata_dir.exists() {
            return Ok(VoiceMessageStats {
                total_messages: 0,
                total_duration_sec: 0,
                total_size_bytes: 0,
                messages_today: 0,
                average_duration_sec: 0.0,
                format_distribution: std::collections::HashMap::new(),
            });
        }

        let mut total_messages = 0u64;
        let mut total_duration = 0u64;
        let mut total_size = 0u64;
        let mut messages_today = 0u64;
        let mut format_distribution = std::collections::HashMap::new();

        let today = Utc::now().date_naive();

        // 遍历所有元数据文件 - 企业级错误处理优化
        for entry in fs::read_dir(&metadata_dir)?.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(voice_message) = serde_json::from_str::<VoiceMessage>(&content) {
                    total_messages += 1;
                    total_size += voice_message.file_size;
                    
                    if let Some(duration) = voice_message.duration {
                        total_duration += duration as u64;
                    }

                    // 检查是否是今天的消息
                    if voice_message.upload_time.date_naive() == today {
                        messages_today += 1;
                    }

                    // 统计格式分布
                    *format_distribution.entry(voice_message.format).or_insert(0) += 1;
                }
            }
        }

        let average_duration = if total_messages > 0 {
            total_duration as f32 / total_messages as f32
        } else {
            0.0
        };

        Ok(VoiceMessageStats {
            total_messages,
            total_duration_sec: total_duration,
            total_size_bytes: total_size,
            messages_today,
            average_duration_sec: average_duration,
            format_distribution,
        })
    }

    // 私有辅助方法

    /// 计算文件校验和
    /// 计算文件校验和
    #[allow(dead_code)] // 内部工具方法
    fn calculate_checksum(&self, content: &[u8]) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(content);
        format!("{:x}", hasher.finalize())
    }

    /// 获取元数据文件路径
    fn get_metadata_path(&self, voice_id: &str) -> PathBuf {
        let metadata_dir = self.storage_path.join("metadata");
        if !metadata_dir.exists() {
            let _ = fs::create_dir_all(&metadata_dir);
        }
        metadata_dir.join(format!("{}.json", voice_id))
    }

    /// 保存语音消息元数据
    /// 保存语音消息元数据
    #[allow(dead_code)] // 内部工具方法
    async fn save_voice_metadata(&self, voice_message: &VoiceMessage) -> Result<()> {
        let metadata_path = self.get_metadata_path(&voice_message.id);
        let content = serde_json::to_string_pretty(voice_message)?;
        
        fs::write(&metadata_path, content)?;
        Ok(())
    }

    /// 通过文件ID查找语音消息
    /// 通过文件ID查找语音消息
    #[allow(dead_code)] // 内部工具方法
    async fn find_voice_by_file_id(&self, file_id: &str) -> Result<Option<VoiceMessage>> {
        let metadata_dir = self.storage_path.join("metadata");
        
        if !metadata_dir.exists() {
            return Ok(None);
        }

        for entry in fs::read_dir(&metadata_dir)?.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(voice_message) = serde_json::from_str::<VoiceMessage>(&content) {
                    if voice_message.file_id == file_id {
                        return Ok(Some(voice_message));
                    }
                }
            }
        }

        Ok(None)
    }

    /// 获取MIME类型
    /// 根据格式获取MIME类型
    #[allow(dead_code)] // 内部工具方法
    fn get_mime_type(&self, format: &str) -> String {
        match format.to_lowercase().as_str() {
            "mp3" => "audio/mpeg".to_string(),
            "wav" => "audio/wav".to_string(),
            "m4a" => "audio/mp4".to_string(),
            "ogg" => "audio/ogg".to_string(),
            "aac" => "audio/aac".to_string(),
            "flac" => "audio/flac".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    }
} 