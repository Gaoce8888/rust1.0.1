# WebSocket/HTTP地址统一配置指南

## 📋 概述

本系统提供了统一的地址配置管理，支持WebSocket、HTTP地址、域名和其他常用配置的统一处理。通过 `AddressManager` 可以轻松管理不同环境下的配置。

## 🚀 快速开始

### 1. 基本使用

```rust
use crate::config::{AddressManager, ConfigManager};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 创建地址管理器
    let address_manager = AddressManager::new().await?;
    
    // 获取API URL
    let api_url = address_manager.get_api_url().await;
    println!("API URL: {}", api_url);
    
    // 获取WebSocket URL
    let ws_url = address_manager.get_ws_url().await;
    println!("WebSocket URL: {}", ws_url);
    
    // 获取前端URL
    let web_url = address_manager.get_web_url().await;
    println!("Web URL: {}", web_url);
    
    Ok(())
}
```

### 2. 使用配置管理器

```rust
use crate::config::ConfigManager;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 创建配置管理器
    let mut config_manager = ConfigManager::new().await?;
    
    // 获取地址管理器
    let address_manager = config_manager.address_manager();
    
    // 获取配置摘要
    let summary = config_manager.get_summary().await;
    for (key, value) in summary {
        println!("{}: {}", key, value);
    }
    
    // 重新加载配置
    config_manager.reload_all().await?;
    
    Ok(())
}
```

## 🔧 配置文件

### 1. 主配置文件

**文件位置**: `config/address_config.toml`

```toml
[domains]
primary_domain = "ylqkf.com"
api_subdomain = "a.ylqkf.com"
web_subdomain = "b.ylqkf.com"

[urls]
dev_api_url = "http://localhost:6006/api"
dev_ws_url = "ws://localhost:6006/ws"
prod_api_url = "https://a.ylqkf.com"
prod_ws_url = "wss://a.ylqkf.com/ws"
```

### 2. 环境变量配置

```bash
# 设置环境
export APP_ENV=production

# 设置服务器端口
export SERVER_PORT=6006

# 设置API URL
export API_URL=https://a.ylqkf.com

# 设置WebSocket URL
export WS_URL=wss://a.ylqkf.com/ws
```

## 🌍 环境配置

### 1. 开发环境

```rust
// 检查当前环境
if address_manager.is_development() {
    println!("运行在开发环境");
    // 使用开发环境配置
    let api_url = address_manager.get_api_url().await; // http://localhost:6006/api
    let ws_url = address_manager.get_ws_url().await;   // ws://localhost:6006/ws
}
```

### 2. 生产环境

```rust
if address_manager.is_production() {
    println!("运行在生产环境");
    // 使用生产环境配置
    let api_url = address_manager.get_api_url().await; // https://a.ylqkf.com
    let ws_url = address_manager.get_ws_url().await;   // wss://a.ylqkf.com/ws
}
```

### 3. 测试环境

```rust
if address_manager.is_test() {
    println!("运行在测试环境");
    // 使用测试环境配置
    let api_url = address_manager.get_api_url().await; // https://api.test.ylqkf.com
    let ws_url = address_manager.get_ws_url().await;   // wss://api.test.ylqkf.com/ws
}
```

## 🔗 URL生成

### 1. 基本URL获取

```rust
// 获取各种URL
let api_url = address_manager.get_api_url().await;
let ws_url = address_manager.get_ws_url().await;
let web_url = address_manager.get_web_url().await;
let admin_url = address_manager.get_admin_url().await;

// 获取CORS允许的源
let cors_origins = address_manager.get_cors_origins().await;
```

### 2. 动态URL构建

```rust
use std::collections::HashMap;

// 构建API端点URL
async fn build_api_endpoint(address_manager: &AddressManager, endpoint: &str) -> String {
    let base_url = address_manager.get_api_url().await;
    format!("{}{}", base_url, endpoint)
}

// 使用示例
let user_api = build_api_endpoint(&address_manager, "/user").await;
let message_api = build_api_endpoint(&address_manager, "/message").await;
```

## 🔧 配置验证

### 1. 验证配置

```rust
use crate::config::{AddressConfig, ConfigValidator};

// 验证完整配置
let config = address_manager.get_full_config().await;
let validation_result = ConfigValidator::validate_full_config(&config);

match validation_result {
    Ok(()) => println!("配置验证通过"),
    Err(e) => eprintln!("配置验证失败: {}", e),
}
```

### 2. 验证特定配置

```rust
// 验证WebSocket配置
let ws_config = address_manager.get_websocket_config().await;
let ws_validation = ConfigValidator::validate_websocket_config(&ws_config);

// 验证安全配置
let security_config = address_manager.get_security_config().await;
let security_validation = ConfigValidator::validate_security_config(&security_config);
```

## 🔄 配置更新

### 1. 更新配置

```rust
// 获取当前配置
let mut config = address_manager.get_full_config().await;

// 修改配置
config.urls.dev_api_url = "http://localhost:8080/api".to_string();
config.urls.dev_ws_url = "ws://localhost:8080/ws".to_string();

// 更新配置
address_manager.update_config(config).await?;
```

### 2. 重新加载配置

```rust
// 重新加载配置文件
address_manager.reload_config().await?;
```

## 📊 配置监控

### 1. 获取配置摘要

```rust
// 获取配置摘要
let summary = address_manager.get_config_summary().await;

// 打印摘要
for (key, value) in summary {
    println!("{}: {}", key, value);
}
```

### 2. 配置统计

```rust
// 获取完整配置
let full_config = address_manager.get_full_config().await;

// 统计信息
println!("域名数量: {}", full_config.domains.primary_domain.len());
println!("端口配置: {}", full_config.ports.server_port);
println!("CORS源数量: {}", full_config.cors.dev_origins.len());
```

## 🛠️ 集成到现有代码

### 1. 在WebSocket管理器中使用

```rust
use crate::config::AddressManager;

pub struct WebSocketManager {
    address_manager: AddressManager,
    // ... 其他字段
}

impl WebSocketManager {
    pub async fn new() -> anyhow::Result<Self> {
        let address_manager = AddressManager::new().await?;
        
        Ok(Self {
            address_manager,
            // ... 其他字段初始化
        })
    }
    
    pub async fn get_ws_url(&self) -> String {
        self.address_manager.get_ws_url().await
    }
    
    pub async fn get_api_url(&self) -> String {
        self.address_manager.get_api_url().await
    }
}
```

### 2. 在API路由中使用

```rust
use crate::config::AddressManager;
use warp::Filter;

pub fn create_routes(address_manager: AddressManager) -> impl Filter<Extract = impl warp::Reply> + Clone {
    let api_url = address_manager.get_api_url();
    let ws_url = address_manager.get_ws_url();
    
    // 创建路由
    warp::path("api")
        .and(warp::any().map(move || address_manager.clone()))
        .and_then(handle_api)
}

async fn handle_api(address_manager: AddressManager) -> Result<impl warp::Reply, warp::Rejection> {
    let api_url = address_manager.get_api_url().await;
    let ws_url = address_manager.get_ws_url().await;
    
    let response = serde_json::json!({
        "api_url": api_url,
        "ws_url": ws_url,
        "environment": address_manager.get_environment()
    });
    
    Ok(warp::reply::json(&response))
}
```

### 3. 在服务器启动中使用

```rust
use crate::config::ConfigManager;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化配置管理器
    let config_manager = ConfigManager::new().await?;
    let address_manager = config_manager.address_manager();
    
    // 获取服务器配置
    let server_port = address_manager.get_server_port().await;
    let cors_origins = address_manager.get_cors_origins().await;
    
    // 启动服务器
    println!("🚀 启动服务器在端口: {}", server_port);
    println!("🌍 当前环境: {}", address_manager.get_environment());
    println!("🔗 API URL: {}", address_manager.get_api_url().await);
    println!("🔌 WebSocket URL: {}", address_manager.get_ws_url().await);
    
    // ... 服务器启动逻辑
    
    Ok(())
}
```

## 🔐 安全配置

### 1. 获取安全配置

```rust
// 获取安全配置
let security_config = address_manager.get_security_config().await;

// 检查速率限制
if security_config.rate_limiting_enabled {
    println!("速率限制已启用");
    println!("时间窗口: {}ms", security_config.rate_limit_window);
    println!("最大请求数: {}", security_config.rate_limit_max_requests);
}

// 检查IP白名单
println!("允许的IP: {:?}", security_config.allowed_ips);
println!("阻止的IP: {:?}", security_config.blocked_ips);
```

### 2. 安全验证

```rust
use std::net::IpAddr;

fn validate_ip_access(security_config: &SecurityConfig, client_ip: IpAddr) -> bool {
    let client_ip_str = client_ip.to_string();
    
    // 检查是否在阻止列表中
    if security_config.blocked_ips.contains(&client_ip_str) {
        return false;
    }
    
    // 检查是否在允许列表中
    security_config.allowed_ips.contains(&client_ip_str)
}
```

## 📈 监控配置

### 1. 获取监控配置

```rust
// 获取监控配置
let monitoring_config = address_manager.get_monitoring_config().await;

// 健康检查URL
let health_url = monitoring_config.health_check_url;
let metrics_url = monitoring_config.metrics_url;
let status_url = monitoring_config.status_url;
let ping_url = monitoring_config.ping_url;
```

### 2. 监控端点

```rust
use warp::Filter;

pub fn create_monitoring_routes(address_manager: AddressManager) -> impl Filter<Extract = impl warp::Reply> + Clone {
    let monitoring_config = address_manager.get_monitoring_config();
    
    // 健康检查端点
    let health_route = warp::path("health")
        .and(warp::get())
        .map(|| "OK");
    
    // 状态端点
    let status_route = warp::path("status")
        .and(warp::get())
        .and(with_address_manager(address_manager.clone()))
        .and_then(handle_status);
    
    health_route.or(status_route)
}

async fn handle_status(address_manager: AddressManager) -> Result<impl warp::Reply, warp::Rejection> {
    let summary = address_manager.get_config_summary().await;
    Ok(warp::reply::json(&summary))
}

fn with_address_manager(address_manager: AddressManager) -> impl Filter<Extract = (AddressManager,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || address_manager.clone())
}
```

## 🔧 故障排除

### 1. 配置加载问题

```rust
// 检查配置文件是否存在
use std::path::Path;

if !Path::new("config/address_config.toml").exists() {
    eprintln!("配置文件不存在，使用默认配置");
}

// 检查环境变量
if let Ok(env) = std::env::var("APP_ENV") {
    println!("当前环境: {}", env);
} else {
    println!("未设置APP_ENV，使用默认环境: development");
}
```

### 2. 配置验证问题

```rust
// 验证配置
let config = address_manager.get_full_config().await;
match ConfigValidator::validate_full_config(&config) {
    Ok(()) => println!("✅ 配置验证通过"),
    Err(e) => {
        eprintln!("❌ 配置验证失败: {}", e);
        // 使用默认配置
        let default_config = AddressConfig::default();
        address_manager.update_config(default_config).await?;
    }
}
```

### 3. 环境变量问题

```rust
// 检查必要的环境变量
let required_vars = ["APP_ENV", "SERVER_PORT"];
for var in &required_vars {
    match std::env::var(var) {
        Ok(value) => println!("{}: {}", var, value),
        Err(_) => println!("⚠️  未设置环境变量: {}", var),
    }
}
```

## 📝 最佳实践

### 1. 配置管理

- ✅ 使用环境变量覆盖配置文件
- ✅ 定期验证配置有效性
- ✅ 使用配置摘要进行监控
- ✅ 实现配置热重载

### 2. 安全考虑

- ✅ 生产环境使用HTTPS/WSS
- ✅ 设置适当的CORS策略
- ✅ 启用速率限制
- ✅ 配置IP白名单

### 3. 性能优化

- ✅ 使用配置缓存
- ✅ 异步加载配置
- ✅ 实现配置懒加载
- ✅ 监控配置访问性能

### 4. 错误处理

- ✅ 提供默认配置
- ✅ 优雅处理配置错误
- ✅ 记录配置变更
- ✅ 实现配置回滚

---

**注意**: 在生产环境中，请确保所有敏感配置都通过环境变量或安全的配置管理系统提供。