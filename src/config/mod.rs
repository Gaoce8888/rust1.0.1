//! 配置管理模块
//! 
//! 此模块提供了统一的配置管理功能，包括：
//! - 地址配置管理
//! - 环境配置
//! - 配置加载和验证

pub mod address_manager;

pub use address_manager::{
    AddressConfig, AddressManager, DomainConfig, PortConfig, ProtocolConfig,
    UrlConfig, PathConfig, CorsConfig, SslConfig, ProxyConfig, CdnConfig,
    MonitoringConfig, ExternalApiConfig, WebSocketConfig, LoadBalancingConfig,
    FailoverConfig, SecurityConfig, LoggingConfig, EnvironmentConfig,
};

/// 配置管理器
pub struct ConfigManager {
    address_manager: AddressManager,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub async fn new() -> anyhow::Result<Self> {
        let address_manager = AddressManager::new().await?;
        
        Ok(Self {
            address_manager,
        })
    }

    /// 获取地址管理器
    pub fn address_manager(&self) -> &AddressManager {
        &self.address_manager
    }

    /// 获取地址管理器的可变引用
    pub fn address_manager_mut(&mut self) -> &mut AddressManager {
        &mut self.address_manager
    }

    /// 重新加载所有配置
    pub async fn reload_all(&mut self) -> anyhow::Result<()> {
        self.address_manager.reload_config().await?;
        Ok(())
    }

    /// 获取配置摘要
    pub async fn get_summary(&self) -> std::collections::HashMap<String, String> {
        self.address_manager.get_config_summary().await
    }
}

impl Default for ConfigManager {
    fn default() -> Self {
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async {
                ConfigManager::new().await.unwrap_or_else(|_| {
                    ConfigManager {
                        address_manager: AddressManager::default(),
                    }
                })
            })
    }
}

/// 全局配置实例
pub static mut GLOBAL_CONFIG: Option<ConfigManager> = None;

/// 初始化全局配置
pub async fn init_global_config() -> anyhow::Result<()> {
    let config_manager = ConfigManager::new().await?;
    unsafe {
        GLOBAL_CONFIG = Some(config_manager);
    }
    Ok(())
}

/// 获取全局配置管理器
pub fn get_global_config() -> Option<&'static ConfigManager> {
    unsafe { GLOBAL_CONFIG.as_ref() }
}

/// 获取全局配置管理器的可变引用
pub fn get_global_config_mut() -> Option<&'static mut ConfigManager> {
    unsafe { GLOBAL_CONFIG.as_mut() }
}

/// 配置验证器
pub struct ConfigValidator;

impl ConfigValidator {
    /// 验证地址配置
    pub fn validate_address_config(config: &AddressConfig) -> anyhow::Result<()> {
        // 验证域名配置
        if config.domains.primary_domain.is_empty() {
            return Err(anyhow::anyhow!("Primary domain cannot be empty"));
        }

        // 验证端口配置
        if config.ports.server_port == 0 {
            return Err(anyhow::anyhow!("Server port cannot be 0"));
        }

        // 验证URL配置
        if config.urls.dev_api_url.is_empty() {
            return Err(anyhow::anyhow!("Development API URL cannot be empty"));
        }

        // 验证CORS配置
        if config.cors.dev_origins.is_empty() {
            return Err(anyhow::anyhow!("Development CORS origins cannot be empty"));
        }

        Ok(())
    }

    /// 验证WebSocket配置
    pub fn validate_websocket_config(config: &WebSocketConfig) -> anyhow::Result<()> {
        if config.heartbeat_interval == 0 {
            return Err(anyhow::anyhow!("WebSocket heartbeat interval cannot be 0"));
        }

        if config.max_message_size == 0 {
            return Err(anyhow::anyhow!("WebSocket max message size cannot be 0"));
        }

        Ok(())
    }

    /// 验证安全配置
    pub fn validate_security_config(config: &SecurityConfig) -> anyhow::Result<()> {
        if config.rate_limit_window == 0 {
            return Err(anyhow::anyhow!("Rate limit window cannot be 0"));
        }

        if config.rate_limit_max_requests == 0 {
            return Err(anyhow::anyhow!("Rate limit max requests cannot be 0"));
        }

        Ok(())
    }

    /// 验证完整配置
    pub fn validate_full_config(config: &AddressConfig) -> anyhow::Result<()> {
        Self::validate_address_config(config)?;
        Self::validate_websocket_config(&config.websocket)?;
        Self::validate_security_config(&config.security)?;
        Ok(())
    }
}

/// 配置工具函数
pub mod utils {
    use super::*;
    use std::collections::HashMap;

    /// 从环境变量构建配置
    pub fn build_config_from_env() -> AddressConfig {
        let mut config = AddressConfig::default();
        
        // 从环境变量更新配置
        if let Ok(env) = std::env::var("APP_ENV") {
            config.environment.current_environment = env;
        }

        if let Ok(port) = std::env::var("SERVER_PORT") {
            if let Ok(port_num) = port.parse::<u16>() {
                config.ports.server_port = port_num;
            }
        }

        if let Ok(api_url) = std::env::var("API_URL") {
            match config.environment.current_environment.as_str() {
                "development" => config.urls.dev_api_url = api_url,
                "test" => config.urls.test_api_url = api_url,
                "production" => config.urls.prod_api_url = api_url,
                _ => config.urls.dev_api_url = api_url,
            }
        }

        if let Ok(ws_url) = std::env::var("WS_URL") {
            match config.environment.current_environment.as_str() {
                "development" => config.urls.dev_ws_url = ws_url,
                "test" => config.urls.test_ws_url = ws_url,
                "production" => config.urls.prod_ws_url = ws_url,
                _ => config.urls.dev_ws_url = ws_url,
            }
        }

        config
    }

    /// 将配置转换为环境变量
    pub fn config_to_env_vars(config: &AddressConfig) -> HashMap<String, String> {
        let mut env_vars = HashMap::new();
        
        env_vars.insert("APP_ENV".to_string(), config.environment.current_environment.clone());
        env_vars.insert("SERVER_PORT".to_string(), config.ports.server_port.to_string());
        
        match config.environment.current_environment.as_str() {
            "development" => {
                env_vars.insert("API_URL".to_string(), config.urls.dev_api_url.clone());
                env_vars.insert("WS_URL".to_string(), config.urls.dev_ws_url.clone());
            }
            "test" => {
                env_vars.insert("API_URL".to_string(), config.urls.test_api_url.clone());
                env_vars.insert("WS_URL".to_string(), config.urls.test_ws_url.clone());
            }
            "production" => {
                env_vars.insert("API_URL".to_string(), config.urls.prod_api_url.clone());
                env_vars.insert("WS_URL".to_string(), config.urls.prod_ws_url.clone());
            }
            _ => {
                env_vars.insert("API_URL".to_string(), config.urls.dev_api_url.clone());
                env_vars.insert("WS_URL".to_string(), config.urls.dev_ws_url.clone());
            }
        }

        env_vars
    }

    /// 生成配置文档
    pub fn generate_config_docs(config: &AddressConfig) -> String {
        let mut docs = String::new();
        
        docs.push_str("# 配置文档\n\n");
        docs.push_str(&format!("## 当前环境: {}\n\n", config.environment.current_environment));
        
        docs.push_str("## URL配置\n\n");
        docs.push_str(&format!("- API URL: {}\n", config.urls.dev_api_url));
        docs.push_str(&format!("- WebSocket URL: {}\n", config.urls.dev_ws_url));
        docs.push_str(&format!("- 前端 URL: {}\n", config.urls.dev_web_url));
        docs.push_str(&format!("- 管理后台 URL: {}\n", config.urls.dev_admin_url));
        
        docs.push_str("\n## 端口配置\n\n");
        docs.push_str(&format!("- 服务器端口: {}\n", config.ports.server_port));
        docs.push_str(&format!("- API端口: {}\n", config.ports.api_port));
        docs.push_str(&format!("- WebSocket端口: {}\n", config.ports.websocket_port));
        
        docs.push_str("\n## 域名配置\n\n");
        docs.push_str(&format!("- 主域名: {}\n", config.domains.primary_domain));
        docs.push_str(&format!("- API子域名: {}\n", config.domains.api_subdomain));
        docs.push_str(&format!("- Web子域名: {}\n", config.domains.web_subdomain));
        
        docs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_address_manager_creation() {
        let manager = AddressManager::new().await;
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_config_validation() {
        let config = AddressConfig::default();
        let result = ConfigValidator::validate_full_config(&config);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_url_generation() {
        let manager = AddressManager::new().await.unwrap();
        let api_url = manager.get_api_url().await;
        let ws_url = manager.get_ws_url().await;
        
        assert!(!api_url.is_empty());
        assert!(!ws_url.is_empty());
    }

    #[test]
    fn test_config_from_env() {
        std::env::set_var("APP_ENV", "test");
        std::env::set_var("SERVER_PORT", "8080");
        
        let config = utils::build_config_from_env();
        assert_eq!(config.environment.current_environment, "test");
        assert_eq!(config.ports.server_port, 8080);
        
        // 清理环境变量
        std::env::remove_var("APP_ENV");
        std::env::remove_var("SERVER_PORT");
    }
}
pub mod compatibility;
pub use compatibility::{AppConfig, StorageConfig, init_config};
