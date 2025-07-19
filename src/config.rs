use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::OnceLock;

static CONFIG: OnceLock<AppConfig> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app: AppInfo,
    pub server: ServerConfig,
    pub frontend: FrontendConfig,
    pub websocket: WebSocketConfig,
    pub redis: RedisConfig,
    pub storage: StorageConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
    pub performance: PerformanceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub environment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors: CorsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub enabled: bool,
    pub origins: Vec<String>,
    pub methods: Vec<String>,
    pub headers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendConfig {
    pub host: String,
    pub port: u16,
    #[serde(rename = "apiUrl")]
    pub api_url: String,
    #[serde(rename = "wsUrl")]
    pub ws_url: String,
    pub features: FrontendFeatures,
    pub upload: UploadConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendFeatures {
    #[serde(rename = "imageUpload")]
    pub image_upload: bool,
    #[serde(rename = "audioNotifications")]
    pub audio_notifications: bool,
    #[serde(rename = "messageCompression")]
    pub message_compression: bool,
    #[serde(rename = "virtualScrolling")]
    pub virtual_scrolling: bool,
    #[serde(rename = "offlineSupport")]
    pub offline_support: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadConfig {
    #[serde(rename = "maxFileSize")]
    pub max_file_size: u64,
    #[serde(rename = "allowedTypes")]
    pub allowed_types: Vec<String>,
    #[serde(rename = "compressionEnabled")]
    pub compression_enabled: bool,
    #[serde(rename = "compressionQuality")]
    pub compression_quality: f32,
    #[serde(rename = "maxWidth")]
    pub max_width: u32,
    #[serde(rename = "maxHeight")]
    pub max_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    #[serde(rename = "heartbeatInterval")]
    pub heartbeat_interval: u64,
    #[serde(rename = "reconnectInterval")]
    pub reconnect_interval: u64,
    #[serde(rename = "maxReconnectAttempts")]
    pub max_reconnect_attempts: u32,
    #[serde(rename = "messageTimeout")]
    pub message_timeout: u64,
    #[serde(rename = "maxMessageSize")]
    pub max_message_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub database: u8,
    pub pool: RedisPoolConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisPoolConfig {
    #[serde(rename = "maxSize")]
    pub max_size: u32,
    #[serde(rename = "minIdle")]
    pub min_idle: u32,
    #[serde(rename = "maxLifetime")]
    pub max_lifetime: u64,
    #[serde(rename = "idleTimeout")]
    pub idle_timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    #[serde(rename = "dataDir")]
    pub data_dir: String,
    #[serde(rename = "blobsDir")]
    pub blobs_dir: String,
    #[serde(rename = "snapshotInterval")]
    pub snapshot_interval: u64,
    #[serde(rename = "maxSnapshotSize")]
    pub max_snapshot_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    #[serde(rename = "jwtSecret")]
    pub jwt_secret: String,
    #[serde(rename = "jwtExpiry")]
    pub jwt_expiry: u64,
    #[serde(rename = "bcryptRounds")]
    pub bcrypt_rounds: u32,
    #[serde(rename = "rateLimiting")]
    pub rate_limiting: RateLimitConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub enabled: bool,
    #[serde(rename = "windowMs")]
    pub window_ms: u64,
    #[serde(rename = "maxRequests")]
    pub max_requests: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
    pub file: FileLogConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileLogConfig {
    pub enabled: bool,
    pub path: String,
    #[serde(rename = "maxSize")]
    pub max_size: u64,
    #[serde(rename = "maxFiles")]
    pub max_files: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    #[serde(rename = "messageCache")]
    pub message_cache: CacheConfig,
    pub compression: CompressionConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub enabled: bool,
    #[serde(rename = "maxSize")]
    pub max_size: usize,
    pub ttl: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionConfig {
    pub enabled: bool,
    pub threshold: usize,
}

impl AppConfig {
    /// 从JSON文件加载配置
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let config: AppConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// 从环境变量覆盖配置
    pub fn override_from_env(&mut self) {
        // 服务器配置
        if let Ok(host) = std::env::var("SERVER_HOST") {
            self.server.host = host;
        }
        if let Ok(port) = std::env::var("SERVER_PORT") {
            if let Ok(port) = port.parse() {
                self.server.port = port;
            }
        }

        // Redis配置
        if let Ok(host) = std::env::var("REDIS_HOST") {
            self.redis.host = host;
        }
        if let Ok(port) = std::env::var("REDIS_PORT") {
            if let Ok(port) = port.parse() {
                self.redis.port = port;
            }
        }
        if let Ok(password) = std::env::var("REDIS_PASSWORD") {
            self.redis.password = password;
        }

        // 环境
        if let Ok(env) = std::env::var("APP_ENV") {
            self.app.environment = env;
        }

        // JWT密钥
        if let Ok(secret) = std::env::var("JWT_SECRET") {
            self.security.jwt_secret = secret;
        }
    }

    /// 获取全局配置实例
    pub fn get() -> &'static AppConfig {
        CONFIG.get().expect("配置未初始化")
    }

    /// 初始化全局配置
    pub fn init(config: AppConfig) -> Result<(), Box<AppConfig>> {
        CONFIG.set(config).map_err(Box::new)
    }
}

/// 加载并初始化配置
pub fn init_config() -> Result<(), Box<dyn std::error::Error>> {
    // 尝试多个可能的配置文件路径
    let possible_paths = [
        "config/app-config.json",       // 当前目录下的config
        "../config/app-config.json",    // 上一级目录的config
        "../../config/app-config.json", // 上两级目录的config
        "./config/app-config.json",     // 明确的当前目录
    ];

    let mut config = None;
    let mut last_error = None;

    for path in &possible_paths {
        match AppConfig::load_from_file(path) {
            Ok(cfg) => {
                config = Some(cfg);
                break;
            }
            Err(e) => {
                last_error = Some(e);
                continue;
            }
        }
    }

    let mut config = config.ok_or_else(|| {
        format!(
            "无法找到配置文件，尝试的路径: {:?}。最后错误: {:?}",
            possible_paths, last_error
        )
    })?;

    config.override_from_env();
    AppConfig::init(config).map_err(|_| "配置已初始化")?;
    Ok(())
}
