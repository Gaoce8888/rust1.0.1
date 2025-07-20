use serde::{Deserialize, Serialize};

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
    pub fn load_from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: AppConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    pub fn override_from_env(&mut self) {
        if let Ok(env) = std::env::var("APP_ENV") {
            self.app.environment = env;
        }
        if let Ok(port) = std::env::var("SERVER_PORT") {
            if let Ok(port_num) = port.parse::<u16>() {
                self.server.port = port_num;
            }
        }
    }

    pub fn get() -> &'static AppConfig {
        static CONFIG: std::sync::OnceLock<AppConfig> = std::sync::OnceLock::new();
        CONFIG.get_or_init(|| {
            AppConfig::load_from_file("config/app-config.json")
                .unwrap_or_else(|_| AppConfig::default())
        })
    }

    pub fn init(config: AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        static CONFIG: std::sync::OnceLock<AppConfig> = std::sync::OnceLock::new();
        CONFIG.set(config).map_err(|_| "Failed to set config".into())
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            app: AppInfo {
                name: "kefu-system".to_string(),
                version: "0.1.0".to_string(),
                environment: "development".to_string(),
            },
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 6006,
                cors: CorsConfig {
                    enabled: true,
                    origins: vec!["http://localhost:3000".to_string()],
                    methods: vec!["GET".to_string(), "POST".to_string()],
                    headers: vec!["Content-Type".to_string()],
                },
            },
            frontend: FrontendConfig {
                host: "127.0.0.1".to_string(),
                port: 3000,
                api_url: "http://localhost:6006/api".to_string(),
                ws_url: "ws://localhost:6006/ws".to_string(),
                features: FrontendFeatures {
                    image_upload: true,
                    audio_notifications: true,
                    message_compression: true,
                    virtual_scrolling: true,
                    offline_support: true,
                },
                upload: UploadConfig {
                    max_file_size: 10485760,
                    allowed_types: vec!["image/*".to_string(), "audio/*".to_string()],
                    compression_enabled: true,
                    compression_quality: 0.8,
                    max_width: 1920,
                    max_height: 1080,
                },
            },
            websocket: WebSocketConfig {
                heartbeat_interval: 30000,
                reconnect_interval: 5000,
                max_reconnect_attempts: 5,
                message_timeout: 10000,
                max_message_size: 1048576,
            },
            redis: RedisConfig {
                host: "127.0.0.1".to_string(),
                port: 6379,
                password: "".to_string(),
                database: 0,
                pool: RedisPoolConfig {
                    max_size: 10,
                    min_idle: 2,
                    max_lifetime: 300,
                    idle_timeout: 60,
                },
            },
            storage: StorageConfig {
                data_dir: "./data".to_string(),
                blobs_dir: "./data/blobs".to_string(),
                snapshot_interval: 3600,
                max_snapshot_size: 104857600,
            },
            security: SecurityConfig {
                jwt_secret: "your-secret-key".to_string(),
                jwt_expiry: 86400,
                bcrypt_rounds: 12,
                rate_limiting: RateLimitConfig {
                    enabled: true,
                    window_ms: 60000,
                    max_requests: 100,
                },
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                format: "json".to_string(),
                file: FileLogConfig {
                    enabled: true,
                    path: "./logs/app.log".to_string(),
                    max_size: 10485760,
                    max_files: 10,
                },
            },
            performance: PerformanceConfig {
                message_cache: CacheConfig {
                    enabled: true,
                    max_size: 1000,
                    ttl: 3600,
                },
                compression: CompressionConfig {
                    enabled: true,
                    threshold: 1024,
                },
            },
        }
    }
}

pub fn init_config() -> Result<(), Box<dyn std::error::Error>> {
    let config = AppConfig::load_from_file("config/app-config.json")?;
    AppConfig::init(config)?;
    Ok(())
}
