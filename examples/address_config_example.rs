//! 地址配置使用示例
//! 
//! 此示例展示了如何使用AddressManager来管理WebSocket、HTTP地址和域名配置

use std::collections::HashMap;
use tokio;

// 注意：在实际项目中，这些模块应该从crate中导入
// use your_crate::config::{AddressManager, ConfigManager, ConfigValidator};

// 模拟配置模块（实际使用时请替换为真实的模块导入）
mod mock_config {
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::env;
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use anyhow::Result;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct AddressConfig {
        pub domains: DomainConfig,
        pub urls: UrlConfig,
        pub environment: EnvironmentConfig,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DomainConfig {
        pub primary_domain: String,
        pub api_subdomain: String,
        pub web_subdomain: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct UrlConfig {
        pub dev_api_url: String,
        pub dev_ws_url: String,
        pub prod_api_url: String,
        pub prod_ws_url: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct EnvironmentConfig {
        pub current_environment: String,
    }

    pub struct AddressManager {
        config: Arc<RwLock<AddressConfig>>,
        environment: String,
        cache: Arc<RwLock<HashMap<String, String>>>,
    }

    impl AddressManager {
        pub async fn new() -> Result<Self> {
            let config = Self::default_config();
            let environment = Self::get_environment_static();
            
            Ok(Self {
                config: Arc::new(RwLock::new(config)),
                environment,
                cache: Arc::new(RwLock::new(HashMap::new())),
            })
        }

        fn get_environment_static() -> String {
            env::var("APP_ENV").unwrap_or_else(|_| "development".to_string())
        }

        fn default_config() -> AddressConfig {
            AddressConfig {
                domains: DomainConfig {
                    primary_domain: "ylqkf.com".to_string(),
                    api_subdomain: "a.ylqkf.com".to_string(),
                    web_subdomain: "b.ylqkf.com".to_string(),
                },
                urls: UrlConfig {
                    dev_api_url: "http://localhost:6006/api".to_string(),
                    dev_ws_url: "ws://localhost:6006/ws".to_string(),
                    prod_api_url: "https://a.ylqkf.com".to_string(),
                    prod_ws_url: "wss://a.ylqkf.com/ws".to_string(),
                },
                environment: EnvironmentConfig {
                    current_environment: "development".to_string(),
                },
            }
        }

        pub async fn get_api_url(&self) -> String {
            let config = self.config.read().await;
            match self.environment.as_str() {
                "development" => config.urls.dev_api_url.clone(),
                "production" => config.urls.prod_api_url.clone(),
                _ => config.urls.dev_api_url.clone(),
            }
        }

        pub async fn get_ws_url(&self) -> String {
            let config = self.config.read().await;
            match self.environment.as_str() {
                "development" => config.urls.dev_ws_url.clone(),
                "production" => config.urls.prod_ws_url.clone(),
                _ => config.urls.dev_ws_url.clone(),
            }
        }

        pub fn get_environment(&self) -> &str {
            &self.environment
        }

        pub fn is_development(&self) -> bool {
            self.environment == "development"
        }

        pub fn is_production(&self) -> bool {
            self.environment == "production"
        }

        pub async fn get_config_summary(&self) -> HashMap<String, String> {
            let mut summary = HashMap::new();
            summary.insert("environment".to_string(), self.environment.clone());
            summary.insert("api_url".to_string(), self.get_api_url().await);
            summary.insert("ws_url".to_string(), self.get_ws_url().await);
            summary
        }
    }
}

use mock_config::AddressManager;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("🚀 地址配置示例开始\n");

    // 示例1: 基本使用
    basic_usage_example().await?;

    // 示例2: 环境检测
    environment_detection_example().await?;

    // 示例3: URL生成
    url_generation_example().await?;

    // 示例4: 配置摘要
    config_summary_example().await?;

    // 示例5: 动态配置
    dynamic_config_example().await?;

    println!("\n✅ 所有示例执行完成");
    Ok(())
}

/// 示例1: 基本使用
async fn basic_usage_example() -> anyhow::Result<()> {
    println!("📋 示例1: 基本使用");
    println!("{}", "=".repeat(50));

    // 创建地址管理器
    let address_manager = AddressManager::new().await?;
    
    // 获取各种URL
    let api_url = address_manager.get_api_url().await;
    let ws_url = address_manager.get_ws_url().await;
    
    println!("🔗 API URL: {}", api_url);
    println!("🔌 WebSocket URL: {}", ws_url);
    println!("🌍 当前环境: {}", address_manager.get_environment());
    
    println!();
    Ok(())
}

/// 示例2: 环境检测
async fn environment_detection_example() -> anyhow::Result<()> {
    println!("📋 示例2: 环境检测");
    println!("{}", "=".repeat(50));

    let address_manager = AddressManager::new().await?;
    
    // 检查当前环境
    if address_manager.is_development() {
        println!("🛠️  运行在开发环境");
        println!("   - 使用本地地址");
        println!("   - 启用调试功能");
        println!("   - 使用HTTP协议");
    } else if address_manager.is_production() {
        println!("🚀 运行在生产环境");
        println!("   - 使用域名地址");
        println!("   - 启用安全功能");
        println!("   - 使用HTTPS协议");
    } else {
        println!("🧪 运行在测试环境");
    }
    
    println!();
    Ok(())
}

/// 示例3: URL生成
async fn url_generation_example() -> anyhow::Result<()> {
    println!("📋 示例3: URL生成");
    println!("{}", "=".repeat(50));

    let address_manager = AddressManager::new().await?;
    
    // 构建API端点URL
    let base_api_url = address_manager.get_api_url().await;
    let user_api = format!("{}/user", base_api_url);
    let message_api = format!("{}/message", base_api_url);
    let session_api = format!("{}/session", base_api_url);
    
    println!("🔗 基础API URL: {}", base_api_url);
    println!("👤 用户API: {}", user_api);
    println!("💬 消息API: {}", message_api);
    println!("📞 会话API: {}", session_api);
    
    // 构建WebSocket端点URL
    let base_ws_url = address_manager.get_ws_url().await;
    let chat_ws = format!("{}?protocol=chat", base_ws_url);
    let notification_ws = format!("{}?protocol=notification", base_ws_url);
    
    println!("🔌 基础WebSocket URL: {}", base_ws_url);
    println!("💬 聊天WebSocket: {}", chat_ws);
    println!("🔔 通知WebSocket: {}", notification_ws);
    
    println!();
    Ok(())
}

/// 示例4: 配置摘要
async fn config_summary_example() -> anyhow::Result<()> {
    println!("📋 示例4: 配置摘要");
    println!("{}", "=".repeat(50));

    let address_manager = AddressManager::new().await?;
    
    // 获取配置摘要
    let summary = address_manager.get_config_summary().await;
    
    println!("📊 配置摘要:");
    for (key, value) in summary {
        println!("   {}: {}", key, value);
    }
    
    println!();
    Ok(())
}

/// 示例5: 动态配置
async fn dynamic_config_example() -> anyhow::Result<()> {
    println!("📋 示例5: 动态配置");
    println!("{}", "=".repeat(50));

    // 模拟不同环境下的配置
    let environments = ["development", "production"];
    
    for env in &environments {
        // 设置环境变量
        std::env::set_var("APP_ENV", env);
        
        // 创建新的地址管理器
        let address_manager = AddressManager::new().await?;
        
        println!("🌍 环境: {}", env);
        println!("   API URL: {}", address_manager.get_api_url().await);
        println!("   WebSocket URL: {}", address_manager.get_ws_url().await);
        println!();
    }
    
    // 清理环境变量
    std::env::remove_var("APP_ENV");
    
    Ok(())
}

/// 模拟WebSocket管理器使用地址配置
struct WebSocketManager {
    address_manager: AddressManager,
}

impl WebSocketManager {
    async fn new() -> anyhow::Result<Self> {
        let address_manager = AddressManager::new().await?;
        Ok(Self { address_manager })
    }
    
    async fn get_connection_info(&self) -> HashMap<String, String> {
        let mut info = HashMap::new();
        info.insert("ws_url".to_string(), self.address_manager.get_ws_url().await);
        info.insert("api_url".to_string(), self.address_manager.get_api_url().await);
        info.insert("environment".to_string(), self.address_manager.get_environment().to_string());
        info
    }
    
    async fn is_secure_connection(&self) -> bool {
        self.address_manager.is_production()
    }
}

/// 模拟API路由使用地址配置
struct ApiRouter {
    address_manager: AddressManager,
}

impl ApiRouter {
    async fn new() -> anyhow::Result<Self> {
        let address_manager = AddressManager::new().await?;
        Ok(Self { address_manager })
    }
    
    async fn get_api_info(&self) -> HashMap<String, String> {
        let mut info = HashMap::new();
        info.insert("base_url".to_string(), self.address_manager.get_api_url().await);
        info.insert("environment".to_string(), self.address_manager.get_environment().to_string());
        info.insert("secure".to_string(), self.address_manager.is_production().to_string());
        info
    }
    
    async fn build_endpoint_url(&self, endpoint: &str) -> String {
        let base_url = self.address_manager.get_api_url().await;
        format!("{}{}", base_url, endpoint)
    }
}

/// 集成示例
async fn integration_example() -> anyhow::Result<()> {
    println!("📋 集成示例: 在组件中使用地址配置");
    println!("{}", "=".repeat(50));

    // WebSocket管理器
    let ws_manager = WebSocketManager::new().await?;
    let ws_info = ws_manager.get_connection_info().await;
    println!("🔌 WebSocket管理器:");
    for (key, value) in &ws_info {
        println!("   {}: {}", key, value);
    }
    
    // API路由器
    let api_router = ApiRouter::new().await?;
    let api_info = api_router.get_api_info().await;
    println!("\n🔗 API路由器:");
    for (key, value) in &api_info {
        println!("   {}: {}", key, value);
    }
    
    // 构建端点URL
    let user_endpoint = api_router.build_endpoint_url("/user").await;
    let message_endpoint = api_router.build_endpoint_url("/message").await;
    println!("\n📡 API端点:");
    println!("   用户端点: {}", user_endpoint);
    println!("   消息端点: {}", message_endpoint);
    
    println!();
    Ok(())
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
    async fn test_url_generation() {
        let manager = AddressManager::new().await.unwrap();
        let api_url = manager.get_api_url().await;
        let ws_url = manager.get_ws_url().await;
        
        assert!(!api_url.is_empty());
        assert!(!ws_url.is_empty());
    }

    #[tokio::test]
    async fn test_environment_detection() {
        std::env::set_var("APP_ENV", "development");
        let manager = AddressManager::new().await.unwrap();
        assert!(manager.is_development());
        
        std::env::set_var("APP_ENV", "production");
        let manager = AddressManager::new().await.unwrap();
        assert!(manager.is_production());
        
        // 清理
        std::env::remove_var("APP_ENV");
    }
}