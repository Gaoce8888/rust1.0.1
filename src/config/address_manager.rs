use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

/// 统一地址配置管理器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressConfig {
    pub domains: DomainConfig,
    pub ports: PortConfig,
    pub protocols: ProtocolConfig,
    pub urls: UrlConfig,
    pub paths: PathConfig,
    pub cors: CorsConfig,
    pub ssl: SslConfig,
    pub proxy: ProxyConfig,
    pub cdn: CdnConfig,
    pub monitoring: MonitoringConfig,
    pub external_apis: ExternalApiConfig,
    pub websocket: WebSocketConfig,
    pub load_balancing: LoadBalancingConfig,
    pub failover: FailoverConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
    pub environment: EnvironmentConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainConfig {
    pub primary_domain: String,
    pub api_subdomain: String,
    pub web_subdomain: String,
    pub admin_subdomain: String,
    pub dev_domain: String,
    pub dev_api_domain: String,
    pub dev_web_domain: String,
    pub test_domain: String,
    pub test_api_domain: String,
    pub test_web_domain: String,
    pub prod_domain: String,
    pub prod_api_domain: String,
    pub prod_web_domain: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortConfig {
    pub server_port: u16,
    pub api_port: u16,
    pub websocket_port: u16,
    pub admin_port: u16,
    pub dev_port: u16,
    pub test_port: u16,
    pub frontend_port: u16,
    pub react_dev_port: u16,
    pub vue_dev_port: u16,
    pub redis_port: u16,
    pub postgres_port: u16,
    pub nginx_port: u16,
    pub nginx_ssl_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolConfig {
    pub http_protocol: String,
    pub https_protocol: String,
    pub ws_protocol: String,
    pub wss_protocol: String,
    pub dev_default_protocol: String,
    pub test_default_protocol: String,
    pub prod_default_protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UrlConfig {
    pub dev_api_url: String,
    pub dev_ws_url: String,
    pub dev_web_url: String,
    pub dev_admin_url: String,
    pub test_api_url: String,
    pub test_ws_url: String,
    pub test_web_url: String,
    pub test_admin_url: String,
    pub prod_api_url: String,
    pub prod_ws_url: String,
    pub prod_web_url: String,
    pub prod_admin_url: String,
    pub fallback_api_url: String,
    pub fallback_ws_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathConfig {
    pub api_base_path: String,
    pub websocket_path: String,
    pub admin_path: String,
    pub static_path: String,
    pub upload_path: String,
    pub download_path: String,
    pub auth_path: String,
    pub user_path: String,
    pub message_path: String,
    pub session_path: String,
    pub kefu_path: String,
    pub file_path: String,
    pub voice_path: String,
    pub docs_path: String,
    pub swagger_path: String,
    pub redoc_path: String,
    pub rapidoc_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub enabled: bool,
    pub allow_credentials: bool,
    pub dev_origins: Vec<String>,
    pub test_origins: Vec<String>,
    pub prod_origins: Vec<String>,
    pub allowed_methods: Vec<String>,
    pub allowed_headers: Vec<String>,
    pub exposed_headers: Vec<String>,
    pub max_age: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SslConfig {
    pub enabled: bool,
    pub cert_path: String,
    pub key_path: String,
    pub ca_path: String,
    pub dev_ssl_enabled: bool,
    pub dev_cert_path: String,
    pub dev_key_path: String,
    pub ssl_protocols: Vec<String>,
    pub ssl_ciphers: String,
    pub ssl_prefer_server_ciphers: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub proxy_host: String,
    pub proxy_port: u16,
    pub proxy_username: String,
    pub proxy_password: String,
    pub reverse_proxy_enabled: bool,
    pub nginx_config_path: String,
    pub nginx_ssl_config_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdnConfig {
    pub enabled: bool,
    pub cdn_domain: String,
    pub cdn_protocol: String,
    pub cdn_path: String,
    pub static_cdn_url: String,
    pub image_cdn_url: String,
    pub js_cdn_url: String,
    pub css_cdn_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub health_check_url: String,
    pub metrics_url: String,
    pub status_url: String,
    pub ping_url: String,
    pub uptime_robot_url: String,
    pub pingdom_url: String,
    pub newrelic_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalApiConfig {
    pub openai_api_url: String,
    pub google_translate_url: String,
    pub microsoft_speech_url: String,
    pub huggingface_api_url: String,
    pub redis_url: String,
    pub postgres_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub heartbeat_interval: u32,
    pub reconnect_interval: u32,
    pub max_reconnect_attempts: u32,
    pub message_timeout: u32,
    pub max_message_size: u32,
    pub ws_path: String,
    pub ws_upgrade_path: String,
    pub ws_fallback_path: String,
    pub subprotocols: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancingConfig {
    pub enabled: bool,
    pub algorithm: String,
    pub backend_servers: Vec<String>,
    pub health_check_interval: u32,
    pub health_check_timeout: u32,
    pub health_check_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverConfig {
    pub enabled: bool,
    pub primary_endpoint: String,
    pub backup_endpoints: Vec<String>,
    pub failover_check_interval: u32,
    pub failover_timeout: u32,
    pub max_failover_attempts: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub rate_limiting_enabled: bool,
    pub rate_limit_window: u32,
    pub rate_limit_max_requests: u32,
    pub allowed_ips: Vec<String>,
    pub blocked_ips: Vec<String>,
    pub required_headers: Vec<String>,
    pub blocked_user_agents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub log_level: String,
    pub log_format: String,
    pub log_file_path: String,
    pub access_log_path: String,
    pub error_log_path: String,
    pub max_log_size: u64,
    pub max_log_files: u32,
    pub log_retention_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentConfig {
    #[allow(dead_code)]
    pub current_environment: String,
    pub env_vars: Vec<String>,
    pub config_priority: Vec<String>,
}

/// 地址配置管理器
#[derive(Debug)]
#[allow(dead_code)]
pub struct AddressManager {
    #[allow(dead_code)]
        config: Arc<RwLock<AddressConfig>>,
    #[allow(dead_code)]
        environment: String,
    #[allow(dead_code)]
        cache: Arc<RwLock<HashMap<String, String>>>,
}

impl AddressManager {
    /// 创建新的地址管理器
    pub async fn new() -> Result<Self> {
        let config = Self::load_config().await?;
        let environment = Self::detect_environment();
        
        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            environment,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// 加载配置文件
    async fn load_config() -> Result<AddressConfig> {
        // 尝试从多个位置加载配置，使用跨平台路径
        let config_toml = std::path::PathBuf::from("config").join("address_config.toml");
        let config_json = std::path::PathBuf::from("config").join("address_config.json");
        let config_paths = [
            config_toml.to_str().unwrap(),
            config_json.to_str().unwrap(),
            "address_config.toml",
        ];

        for path in &config_paths {
            if let Ok(config) = Self::load_from_file(path).await {
                return Ok(config);
            }
        }

        // 如果文件不存在，返回默认配置
        Ok(Self::default_config())
    }

    /// 从文件加载配置
    async fn load_from_file(path: &str) -> Result<AddressConfig> {
        let content = tokio::fs::read_to_string(path).await?;
        
        if std::path::Path::new(path)
            .extension()
            .map_or(false, |ext| ext.eq_ignore_ascii_case("toml")) {
            let config: AddressConfig = toml::from_str(&content)?;
            Ok(config)
        } else if std::path::Path::new(path)
            .extension()
            .map_or(false, |ext| ext.eq_ignore_ascii_case("json")) {
            let config: AddressConfig = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            Err(anyhow::anyhow!("Unsupported config file format"))
        }
    }

    /// 获取当前环境
    fn detect_environment() -> String {
        env::var("APP_ENV")
            .unwrap_or_else(|_| env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string()))
    }

    /// 获取默认配置
    fn default_config() -> AddressConfig {
        AddressConfig {
            domains: DomainConfig {
                primary_domain: "ylqkf.com".to_string(),
                api_subdomain: "a.ylqkf.com".to_string(),
                web_subdomain: "b.ylqkf.com".to_string(),
                admin_subdomain: "admin.ylqkf.com".to_string(),
                dev_domain: "localhost".to_string(),
                dev_api_domain: "localhost".to_string(),
                dev_web_domain: "localhost".to_string(),
                test_domain: "test.ylqkf.com".to_string(),
                test_api_domain: "api.test.ylqkf.com".to_string(),
                test_web_domain: "web.test.ylqkf.com".to_string(),
                prod_domain: "ylqkf.com".to_string(),
                prod_api_domain: "a.ylqkf.com".to_string(),
                prod_web_domain: "b.ylqkf.com".to_string(),
            },
            ports: PortConfig {
                server_port: 6006,
                api_port: 6006,
                websocket_port: 6006,
                admin_port: 6007,
                dev_port: 6007,
                test_port: 6008,
                frontend_port: 3000,
                react_dev_port: 3000,
                vue_dev_port: 8080,
                redis_port: 6379,
                postgres_port: 5432,
                nginx_port: 80,
                nginx_ssl_port: 443,
            },
            protocols: ProtocolConfig {
                http_protocol: "http".to_string(),
                https_protocol: "https".to_string(),
                ws_protocol: "ws".to_string(),
                wss_protocol: "wss".to_string(),
                dev_default_protocol: "http".to_string(),
                test_default_protocol: "https".to_string(),
                prod_default_protocol: "https".to_string(),
            },
            urls: UrlConfig {
                dev_api_url: "http://localhost:6006/api".to_string(),
                dev_ws_url: "ws://localhost:6006/ws".to_string(),
                dev_web_url: "http://localhost:3000".to_string(),
                dev_admin_url: "http://localhost:6007".to_string(),
                test_api_url: "https://api.test.ylqkf.com".to_string(),
                test_ws_url: "wss://api.test.ylqkf.com/ws".to_string(),
                test_web_url: "https://web.test.ylqkf.com".to_string(),
                test_admin_url: "https://admin.test.ylqkf.com".to_string(),
                prod_api_url: "https://a.ylqkf.com".to_string(),
                prod_ws_url: "wss://a.ylqkf.com/ws".to_string(),
                prod_web_url: "https://b.ylqkf.com".to_string(),
                prod_admin_url: "https://admin.ylqkf.com".to_string(),
                fallback_api_url: "http://127.0.0.1:6006/api".to_string(),
                fallback_ws_url: "ws://127.0.0.1:6006/ws".to_string(),
            },
            paths: PathConfig {
                api_base_path: "/api".to_string(),
                websocket_path: "/ws".to_string(),
                admin_path: "/admin".to_string(),
                static_path: "/static".to_string(),
                upload_path: "/upload".to_string(),
                download_path: "/download".to_string(),
                auth_path: "/api/auth".to_string(),
                user_path: "/api/user".to_string(),
                message_path: "/api/message".to_string(),
                session_path: "/api/session".to_string(),
                kefu_path: "/api/kefu".to_string(),
                file_path: "/api/file".to_string(),
                voice_path: "/api/voice".to_string(),
                docs_path: "/api-docs".to_string(),
                swagger_path: "/swagger".to_string(),
                redoc_path: "/redoc".to_string(),
                rapidoc_path: "/rapidoc".to_string(),
            },
            cors: CorsConfig {
                enabled: true,
                allow_credentials: true,
                dev_origins: vec![
                    "http://localhost:6006".to_string(),
                    "http://localhost:6007".to_string(),
                    "http://localhost:6008".to_string(),
                    "http://localhost:3000".to_string(),
                    "http://127.0.0.1:6006".to_string(),
                    "http://127.0.0.1:6007".to_string(),
                    "http://127.0.0.1:3000".to_string(),
                ],
                test_origins: vec![
                    "https://web.test.ylqkf.com".to_string(),
                    "https://admin.test.ylqkf.com".to_string(),
                    "https://api.test.ylqkf.com".to_string(),
                ],
                prod_origins: vec![
                    "https://b.ylqkf.com".to_string(),
                    "https://admin.ylqkf.com".to_string(),
                    "https://a.ylqkf.com".to_string(),
                ],
                allowed_methods: vec![
                    "GET".to_string(),
                    "POST".to_string(),
                    "PUT".to_string(),
                    "DELETE".to_string(),
                    "OPTIONS".to_string(),
                    "PATCH".to_string(),
                ],
                allowed_headers: vec![
                    "Content-Type".to_string(),
                    "Authorization".to_string(),
                    "X-Requested-With".to_string(),
                    "Accept".to_string(),
                    "Origin".to_string(),
                    "Access-Control-Request-Method".to_string(),
                    "Access-Control-Request-Headers".to_string(),
                ],
                exposed_headers: vec![
                    "Content-Length".to_string(),
                    "Content-Range".to_string(),
                    "X-Total-Count".to_string(),
                ],
                max_age: 86400,
            },
            ssl: SslConfig {
                enabled: true,
                cert_path: "/etc/ssl/certs/ylqkf.com.crt".to_string(),
                key_path: "/etc/ssl/private/ylqkf.com.key".to_string(),
                ca_path: "/etc/ssl/certs/ca-bundle.crt".to_string(),
                dev_ssl_enabled: false,
                dev_cert_path: "./certs/dev.crt".to_string(),
                dev_key_path: "./certs/dev.key".to_string(),
                ssl_protocols: vec!["TLSv1.2".to_string(), "TLSv1.3".to_string()],
                ssl_ciphers: "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384".to_string(),
                ssl_prefer_server_ciphers: true,
            },
            proxy: ProxyConfig {
                enabled: false,
                proxy_host: "127.0.0.1".to_string(),
                proxy_port: 8080,
                proxy_username: String::new(),
                proxy_password: String::new(),
                reverse_proxy_enabled: true,
                nginx_config_path: "/etc/nginx/sites-available/ylqkf.com".to_string(),
                nginx_ssl_config_path: "/etc/nginx/sites-available/ylqkf.com-ssl".to_string(),
            },
            cdn: CdnConfig {
                enabled: true,
                cdn_domain: "cdn.ylqkf.com".to_string(),
                cdn_protocol: "https".to_string(),
                cdn_path: "/static".to_string(),
                static_cdn_url: "https://cdn.ylqkf.com/static".to_string(),
                image_cdn_url: "https://cdn.ylqkf.com/images".to_string(),
                js_cdn_url: "https://cdn.ylqkf.com/js".to_string(),
                css_cdn_url: "https://cdn.ylqkf.com/css".to_string(),
            },
            monitoring: MonitoringConfig {
                health_check_url: "/health".to_string(),
                metrics_url: "/metrics".to_string(),
                status_url: "/status".to_string(),
                ping_url: "/ping".to_string(),
                uptime_robot_url: "https://uptimerobot.com".to_string(),
                pingdom_url: "https://pingdom.com".to_string(),
                newrelic_url: "https://newrelic.com".to_string(),
            },
            external_apis: ExternalApiConfig {
                openai_api_url: "https://api.openai.com/v1".to_string(),
                google_translate_url: "https://translation.googleapis.com/language/translate/v2".to_string(),
                microsoft_speech_url: "https://speech.microsoft.com/cognitiveservices/v1".to_string(),
                huggingface_api_url: "https://api.huggingface.co/models".to_string(),
                redis_url: "redis://127.0.0.1:6379".to_string(),
                postgres_url: "postgresql://user:password@127.0.0.1:5432/dbname".to_string(),
            },
            websocket: WebSocketConfig {
                heartbeat_interval: 30000,
                reconnect_interval: 5000,
                max_reconnect_attempts: 5,
                message_timeout: 10000,
                max_message_size: 1_048_576,
                ws_path: "/ws".to_string(),
                ws_upgrade_path: "/ws/upgrade".to_string(),
                ws_fallback_path: "/ws/fallback".to_string(),
                subprotocols: vec![
                    "chat".to_string(),
                    "notification".to_string(),
                    "file-transfer".to_string(),
                ],
            },
            load_balancing: LoadBalancingConfig {
                enabled: true,
                algorithm: "round_robin".to_string(),
                backend_servers: vec![
                    "http://127.0.0.1:6006".to_string(),
                    "http://127.0.0.1:6007".to_string(),
                    "http://127.0.0.1:6008".to_string(),
                ],
                health_check_interval: 30,
                health_check_timeout: 5,
                health_check_path: "/health".to_string(),
            },
            failover: FailoverConfig {
                enabled: true,
                primary_endpoint: "https://a.ylqkf.com".to_string(),
                backup_endpoints: vec![
                    "https://backup1.ylqkf.com".to_string(),
                    "https://backup2.ylqkf.com".to_string(),
                ],
                failover_check_interval: 10,
                failover_timeout: 3,
                max_failover_attempts: 3,
            },
            security: SecurityConfig {
                rate_limiting_enabled: true,
                rate_limit_window: 60000,
                rate_limit_max_requests: 100,
                allowed_ips: vec![
                    "127.0.0.1".to_string(),
                    "::1".to_string(),
                    "192.168.1.0/24".to_string(),
                ],
                blocked_ips: vec![
                    "10.0.0.1".to_string(),
                    "172.16.0.1".to_string(),
                ],
                required_headers: vec!["User-Agent".to_string(), "Accept".to_string()],
                blocked_user_agents: vec![
                    "bot".to_string(),
                    "crawler".to_string(),
                    "spider".to_string(),
                ],
            },
            logging: LoggingConfig {
                log_level: "info".to_string(),
                log_format: "json".to_string(),
                log_file_path: "./logs/app.log".to_string(),
                access_log_path: "./logs/access.log".to_string(),
                error_log_path: "./logs/error.log".to_string(),
                max_log_size: 10_485_760,
                max_log_files: 5,
                log_retention_days: 30,
            },
            environment: EnvironmentConfig {
                current_environment: "development".to_string(),
                env_vars: vec![
                    "APP_ENV".to_string(),
                    "SERVER_HOST".to_string(),
                    "SERVER_PORT".to_string(),
                    "REDIS_HOST".to_string(),
                    "REDIS_PORT".to_string(),
                    "REDIS_PASSWORD".to_string(),
                    "JWT_SECRET".to_string(),
                    "API_URL".to_string(),
                    "WS_URL".to_string(),
                ],
                config_priority: vec![
                    "environment_variables".to_string(),
                    "address_config.toml".to_string(),
                    "app-config.json".to_string(),
                    "default_values".to_string(),
                ],
            },
        }
    }

    /// 获取API URL
    #[allow(dead_code)]
    pub async fn get_api_url(&self) -> String {
        let cache_key = format!("api_url_{}", self.environment);
        
        if let Some(cached) = self.cache.read().await.get(&cache_key) {
            return cached.clone();
        }

        let config = self.config.read().await;
        let url = match self.environment.as_str() {
            "development" => config.urls.dev_api_url.clone(),
            "test" => config.urls.test_api_url.clone(),
            "production" => config.urls.prod_api_url.clone(),
            _ => config.urls.fallback_api_url.clone(),
        };

        self.cache.write().await.insert(cache_key, url.clone());
        url
    }

    /// 获取WebSocket URL
    #[allow(dead_code)]
    pub async fn get_ws_url(&self) -> String {
        let cache_key = format!("ws_url_{}", self.environment);
        
        if let Some(cached) = self.cache.read().await.get(&cache_key) {
            return cached.clone();
        }

        let config = self.config.read().await;
        let url = match self.environment.as_str() {
            "development" => config.urls.dev_ws_url.clone(),
            "test" => config.urls.test_ws_url.clone(),
            "production" => config.urls.prod_ws_url.clone(),
            _ => config.urls.fallback_ws_url.clone(),
        };

        self.cache.write().await.insert(cache_key, url.clone());
        url
    }

    /// 获取前端URL
    #[allow(dead_code)]
    pub async fn get_web_url(&self) -> String {
        let config = self.config.read().await;
        match self.environment.as_str() {
            "development" => config.urls.dev_web_url.clone(),
            "test" => config.urls.test_web_url.clone(),
            "production" => config.urls.prod_web_url.clone(),
            _ => config.urls.dev_web_url.clone(),
        }
    }

    /// 获取管理后台URL
    #[allow(dead_code)]
    pub async fn get_admin_url(&self) -> String {
        let config = self.config.read().await;
        match self.environment.as_str() {
            "development" => config.urls.dev_admin_url.clone(),
            "test" => config.urls.test_admin_url.clone(),
            "production" => config.urls.prod_admin_url.clone(),
            _ => config.urls.dev_admin_url.clone(),
        }
    }

    /// 获取CORS允许的源
    #[allow(dead_code)]
    pub async fn get_cors_origins(&self) -> Vec<String> {
        let config = self.config.read().await;
        match self.environment.as_str() {
            "development" => config.cors.dev_origins.clone(),
            "test" => config.cors.test_origins.clone(),
            "production" => config.cors.prod_origins.clone(),
            _ => config.cors.dev_origins.clone(),
        }
    }

    /// 获取服务器端口
    #[allow(dead_code)]
    pub async fn get_server_port(&self) -> u16 {
        let config = self.config.read().await;
        match self.environment.as_str() {
            "development" => config.ports.dev_port,
            "test" => config.ports.test_port,
            "production" => config.ports.server_port,
            _ => config.ports.dev_port,
        }
    }

    /// 获取WebSocket配置
    #[allow(dead_code)]
    pub async fn get_websocket_config(&self) -> WebSocketConfig {
        let config = self.config.read().await;
        config.websocket.clone()
    }

    /// 获取外部API配置
    #[allow(dead_code)]
    pub async fn get_external_api_config(&self) -> ExternalApiConfig {
        let config = self.config.read().await;
        config.external_apis.clone()
    }

    /// 获取安全配置
    #[allow(dead_code)]
    pub async fn get_security_config(&self) -> SecurityConfig {
        let config = self.config.read().await;
        config.security.clone()
    }

    /// 获取监控配置
    #[allow(dead_code)]
    pub async fn get_monitoring_config(&self) -> MonitoringConfig {
        let config = self.config.read().await;
        config.monitoring.clone()
    }

    /// 获取当前环境
    #[allow(dead_code)]
    pub fn get_environment(&self) -> &str {
        &self.environment
    }

    /// 检查是否为开发环境
    #[allow(dead_code)]
    pub fn is_development(&self) -> bool {
        self.environment == "development"
    }

    /// 检查是否为生产环境
    #[allow(dead_code)]
    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }

    /// 检查是否为测试环境
    #[allow(dead_code)]
    pub fn is_test(&self) -> bool {
        self.environment == "test"
    }

    /// 获取完整的配置
    #[allow(dead_code)]
    pub async fn get_full_config(&self) -> AddressConfig {
        self.config.read().await.clone()
    }

    /// 更新配置
    #[allow(dead_code)]
    pub async fn update_config(&self, new_config: AddressConfig) -> Result<()> {
        *self.config.write().await = new_config;
        self.cache.write().await.clear();
        Ok(())
    }

    /// 重新加载配置
    #[allow(dead_code)]
    pub async fn reload_config(&self) -> Result<()> {
        let new_config = Self::load_config().await?;
        self.update_config(new_config).await
    }

    /// 获取配置摘要
    #[allow(dead_code)]
    pub async fn get_config_summary(&self) -> HashMap<String, String> {
        let mut summary = HashMap::new();
        summary.insert("environment".to_string(), self.environment.clone());
        summary.insert("api_url".to_string(), self.get_api_url().await);
        summary.insert("ws_url".to_string(), self.get_ws_url().await);
        summary.insert("web_url".to_string(), self.get_web_url().await);
        summary.insert("admin_url".to_string(), self.get_admin_url().await);
        summary.insert("server_port".to_string(), self.get_server_port().await.to_string());
        summary
    }
}

impl Default for AddressManager {
    fn default() -> Self {
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async {
                AddressManager::new().await.unwrap_or_else(|_| {
                    let config = AddressConfig::default();
                    AddressManager {
                        config: Arc::new(RwLock::new(config)),
                        environment: "development".to_string(),
                        cache: Arc::new(RwLock::new(HashMap::new())),
                    }
                })
            })
    }
}

impl Default for AddressConfig {
    fn default() -> Self {
        Self::default_config()
    }
}

impl AddressConfig {
    fn default_config() -> Self {
        AddressManager::default_config()
    }
}