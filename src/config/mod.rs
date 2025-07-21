//! 配置管理模块
//! 
//! 此模块提供了统一的配置管理功能，包括：
//! - 地址配置管理
//! - 环境配置
//! - 配置加载和验证

pub mod address_manager;

use crate::config::address_manager::{
    AddressConfig, AddressManager,
};



/// 配置管理器
pub struct Manager {
    address_manager: AddressManager,
}

impl Manager {
    /// 创建新的配置管理器
    /// 
    /// # Errors
    /// 
    /// Returns an error if address manager initialization fails
    pub async fn new() -> anyhow::Result<Self> {
        let address_manager = AddressManager::new().await?;
        Ok(Self {
            address_manager,
        })
    }

    /// 获取地址管理器
    #[allow(dead_code)]
    #[must_use] pub fn address_manager(&self) -> &AddressManager {
        &self.address_manager
    }

    /// 获取地址管理器的可变引用
    #[allow(dead_code)]
    pub fn address_manager_mut(&mut self) -> &mut AddressManager {
        &mut self.address_manager
    }

    /// 重新加载所有配置
    #[allow(dead_code)]
    pub async fn reload_all(&mut self) -> anyhow::Result<()> {
        self.address_manager.reload_config().await?;
        Ok(())
    }

    /// 获取配置摘要
    #[allow(dead_code)]
    pub async fn get_summary(&self) -> std::collections::HashMap<String, String> {
        self.address_manager.get_config_summary().await
    }
}

impl Default for Manager {
    fn default() -> Self {
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async {
                Manager::new().await.unwrap_or_else(|_| {
                    Manager {
                        address_manager: AddressManager::default(),
                    }
                })
            })
    }
}

/// 全局配置实例
#[allow(dead_code)]
pub static mut GLOBAL_CONFIG: Option<Manager> = None;

/// 初始化全局配置
#[allow(dead_code)]
pub async fn init_global_config() -> anyhow::Result<()> {
    let config_manager = Manager::new().await?;
    unsafe {
        GLOBAL_CONFIG = Some(config_manager);
    }
    Ok(())
}

/// 获取全局配置管理器
#[allow(dead_code)]
#[must_use] pub fn get_global_config() -> Option<&'static Manager> {
    unsafe { GLOBAL_CONFIG.as_ref() }
}

/// 获取全局配置管理器的可变引用
#[allow(dead_code)]
#[must_use] pub fn get_global_config_mut() -> Option<&'static mut Manager> {
    unsafe { GLOBAL_CONFIG.as_mut() }
}

/// 配置验证器
#[allow(dead_code)]
pub struct ConfigValidator;

impl ConfigValidator {
    /// 验证地址配置
    #[allow(dead_code)]
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

    /// `验证WebSocket配置`
    #[allow(dead_code)]
    pub fn validate_websocket_config(config: &crate::config::address_manager::WebSocketConfig) -> anyhow::Result<()> {
        if config.heartbeat_interval == 0 {
            return Err(anyhow::anyhow!("WebSocket heartbeat interval cannot be 0"));
        }

        if config.max_message_size == 0 {
            return Err(anyhow::anyhow!("WebSocket max message size cannot be 0"));
        }

        Ok(())
    }

    /// 验证安全配置
    #[allow(dead_code)]
    pub fn validate_security_config(config: &crate::config::address_manager::SecurityConfig) -> anyhow::Result<()> {
        if config.rate_limit_window == 0 {
            return Err(anyhow::anyhow!("Rate limit window cannot be 0"));
        }

        if config.rate_limit_max_requests == 0 {
            return Err(anyhow::anyhow!("Rate limit max requests cannot be 0"));
        }

        Ok(())
    }

    /// 验证完整配置
    #[allow(dead_code)]
    pub fn validate_full_config(config: &AddressConfig) -> anyhow::Result<()> {
        Self::validate_address_config(config)?;
        Self::validate_websocket_config(&config.websocket)?;
        Self::validate_security_config(&config.security)?;
        Ok(())
    }
}

/// 配置工具函数
pub mod utils {
    use super::AddressConfig;
    use std::collections::HashMap;

    /// 从环境变量构建配置
    #[allow(dead_code)]
    #[must_use] pub fn build_config_from_env() -> AddressConfig {
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
    #[allow(dead_code)]
    #[must_use] pub fn config_to_env_vars(config: &AddressConfig) -> HashMap<String, String> {
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
    #[allow(dead_code)]
    #[must_use] pub fn generate_config_docs(config: &AddressConfig) -> String {
        format!(
            "# 配置文档\n\n## 环境: {}\n## 服务器端口: {}\n## API URL: {}\n## WebSocket URL: {}",
            config.environment.current_environment,
            config.ports.server_port,
            config.urls.dev_api_url,
            config.urls.dev_ws_url
        )
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
        let result = ConfigValidator::validate_address_config(&config);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_url_generation() {
        let manager = AddressManager::new().await.unwrap();
        let api_url = manager.get_api_url().await;
        assert!(!api_url.is_empty());
    }

    #[test]
    fn test_config_from_env() {
        let config = utils::build_config_from_env();
        assert!(!config.environment.current_environment.is_empty());
    }
}

pub mod compatibility;

pub use compatibility::{AppConfig, StorageConfig, init_config};
