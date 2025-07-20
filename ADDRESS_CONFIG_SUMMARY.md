# WebSocket/HTTP地址统一配置系统总结

## 📋 系统概述

本系统提供了一个完整的WebSocket、HTTP地址、域名和其他常用配置的统一管理解决方案，支持多环境配置、动态加载、配置验证和热重载功能。

## 🏗️ 系统架构

### 核心组件

1. **AddressManager** - 地址配置管理器
2. **ConfigManager** - 全局配置管理器
3. **ConfigValidator** - 配置验证器
4. **配置迁移工具** - 自动化迁移脚本

### 文件结构

```
src/config/
├── mod.rs                    # 配置模块入口
├── address_manager.rs        # 地址配置管理器
└── ...

config/
├── address_config.toml       # 统一地址配置文件
├── app-config.json          # 应用配置文件
├── app-config.development.json
├── app-config.production.json
└── environment.example       # 环境变量模板

scripts/
└── migrate_address_config.rs # 配置迁移脚本

examples/
└── address_config_example.rs # 使用示例

docs/
├── ADDRESS_CONFIG_GUIDE.md   # 使用指南
├── DATABASE_CONFIG.md        # 数据库配置文档
└── ADDRESS_CONFIG_SUMMARY.md # 本文档
```

## 🚀 主要功能

### 1. 统一地址管理

- **多环境支持**: 开发、测试、生产环境
- **协议管理**: HTTP/HTTPS、WS/WSS
- **域名管理**: 主域名、子域名配置
- **端口管理**: 服务器、API、WebSocket端口

### 2. 配置加载

- **多格式支持**: TOML、JSON配置文件
- **环境变量覆盖**: 支持环境变量优先级
- **默认配置**: 提供完整的默认配置
- **配置缓存**: 异步缓存机制

### 3. 配置验证

- **完整性验证**: 检查必要配置项
- **格式验证**: 验证URL、端口等格式
- **依赖验证**: 检查配置项之间的依赖关系
- **安全验证**: 验证安全相关配置

### 4. 动态配置

- **热重载**: 运行时重新加载配置
- **配置更新**: 动态更新配置项
- **配置摘要**: 获取配置统计信息
- **配置监控**: 监控配置变更

## 🔧 配置项详解

### 域名配置

```toml
[domains]
primary_domain = "ylqkf.com"
api_subdomain = "a.ylqkf.com"
web_subdomain = "b.ylqkf.com"
admin_subdomain = "admin.ylqkf.com"

# 环境特定域名
dev_domain = "localhost"
test_domain = "test.ylqkf.com"
prod_domain = "ylqkf.com"
```

### URL配置

```toml
[urls]
# 开发环境
dev_api_url = "http://localhost:6006/api"
dev_ws_url = "ws://localhost:6006/ws"
dev_web_url = "http://localhost:3000"

# 生产环境
prod_api_url = "https://a.ylqkf.com"
prod_ws_url = "wss://a.ylqkf.com/ws"
prod_web_url = "https://b.ylqkf.com"
```

### CORS配置

```toml
[cors]
enabled = true
allow_credentials = true

dev_origins = [
    "http://localhost:6006",
    "http://localhost:6007",
    "http://localhost:3000"
]

prod_origins = [
    "https://b.ylqkf.com",
    "https://admin.ylqkf.com"
]
```

### 安全配置

```toml
[security]
rate_limiting_enabled = true
rate_limit_window = 60000
rate_limit_max_requests = 100

allowed_ips = [
    "127.0.0.1",
    "::1",
    "192.168.1.0/24"
]
```

## 💻 使用示例

### 基本使用

```rust
use crate::config::AddressManager;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 创建地址管理器
    let address_manager = AddressManager::new().await?;
    
    // 获取配置
    let api_url = address_manager.get_api_url().await;
    let ws_url = address_manager.get_ws_url().await;
    let cors_origins = address_manager.get_cors_origins().await;
    
    println!("API URL: {}", api_url);
    println!("WebSocket URL: {}", ws_url);
    println!("CORS Origins: {:?}", cors_origins);
    
    Ok(())
}
```

### 环境检测

```rust
if address_manager.is_development() {
    println!("运行在开发环境");
    // 使用开发环境配置
} else if address_manager.is_production() {
    println!("运行在生产环境");
    // 使用生产环境配置
}
```

### 配置验证

```rust
use crate::config::{AddressConfig, ConfigValidator};

let config = address_manager.get_full_config().await;
match ConfigValidator::validate_full_config(&config) {
    Ok(()) => println!("配置验证通过"),
    Err(e) => eprintln!("配置验证失败: {}", e),
}
```

### 动态配置更新

```rust
// 更新配置
let mut config = address_manager.get_full_config().await;
config.urls.dev_api_url = "http://localhost:8080/api".to_string();
address_manager.update_config(config).await?;

// 重新加载配置
address_manager.reload_config().await?;
```

## 🔄 迁移指南

### 1. 自动迁移

运行迁移脚本：

```bash
cargo run --bin migrate_address_config
```

脚本将：
- 扫描项目中的硬编码地址
- 生成迁移建议文档
- 创建配置模板
- 执行自动迁移（可选）

### 2. 手动迁移

1. **创建配置文件**:
   ```bash
   cp config/address_config.toml.example config/address_config.toml
   ```

2. **设置环境变量**:
   ```bash
   export APP_ENV=development
   export SERVER_PORT=6006
   ```

3. **更新代码**:
   ```rust
   // 替换硬编码地址
   // 旧代码: let url = "ws://localhost:6006/ws";
   // 新代码: let url = address_manager.get_ws_url().await;
   ```

### 3. 迁移检查清单

- [ ] 配置文件已创建并正确配置
- [ ] 环境变量已设置
- [ ] 硬编码地址已替换为配置管理器调用
- [ ] 配置验证通过
- [ ] 功能测试通过
- [ ] 性能测试通过

## 📊 性能特性

### 缓存机制

- **异步缓存**: 使用RwLock实现线程安全缓存
- **智能缓存**: 根据环境自动缓存配置
- **缓存失效**: 配置更新时自动清除缓存

### 异步加载

- **非阻塞加载**: 配置文件异步读取
- **并发访问**: 支持多线程并发访问
- **错误处理**: 优雅处理加载错误

### 内存优化

- **懒加载**: 按需加载配置项
- **共享引用**: 使用Arc共享配置
- **最小化分配**: 减少不必要的内存分配

## 🔐 安全特性

### 配置安全

- **环境隔离**: 不同环境使用不同配置
- **敏感信息保护**: 支持环境变量覆盖敏感配置
- **配置验证**: 验证配置的安全性和完整性

### 访问控制

- **IP白名单**: 支持IP地址白名单
- **速率限制**: 内置API速率限制
- **请求验证**: 验证请求头和用户代理

### SSL/TLS支持

- **证书管理**: 支持SSL证书配置
- **协议选择**: 支持TLS 1.2/1.3
- **密码套件**: 配置安全的密码套件

## 🧪 测试支持

### 单元测试

```rust
#[tokio::test]
async fn test_address_manager_creation() {
    let manager = AddressManager::new().await;
    assert!(manager.is_ok());
}

#[tokio::test]
async fn test_url_generation() {
    let manager = AddressManager::new().await.unwrap();
    let api_url = manager.get_api_url().await;
    assert!(!api_url.is_empty());
}
```

### 集成测试

```rust
#[tokio::test]
async fn test_config_validation() {
    let config = AddressConfig::default();
    let result = ConfigValidator::validate_full_config(&config);
    assert!(result.is_ok());
}
```

### 性能测试

```rust
#[tokio::test]
async fn test_config_performance() {
    let manager = AddressManager::new().await.unwrap();
    
    let start = std::time::Instant::now();
    for _ in 0..1000 {
        let _ = manager.get_api_url().await;
    }
    let duration = start.elapsed();
    
    assert!(duration.as_millis() < 100); // 100ms内完成1000次调用
}
```

## 📈 监控和维护

### 配置监控

- **配置摘要**: 获取配置统计信息
- **变更监控**: 监控配置变更
- **性能监控**: 监控配置访问性能

### 日志记录

- **配置加载日志**: 记录配置加载过程
- **错误日志**: 记录配置错误
- **访问日志**: 记录配置访问

### 健康检查

- **配置完整性检查**: 检查配置是否完整
- **配置有效性检查**: 检查配置是否有效
- **配置一致性检查**: 检查配置是否一致

## 🚀 部署指南

### 开发环境

1. **安装依赖**:
   ```bash
   cargo build
   ```

2. **设置环境**:
   ```bash
   export APP_ENV=development
   ```

3. **启动服务**:
   ```bash
   cargo run
   ```

### 生产环境

1. **配置环境变量**:
   ```bash
   export APP_ENV=production
   export SERVER_PORT=6006
   export API_URL=https://a.ylqkf.com
   export WS_URL=wss://a.ylqkf.com/ws
   ```

2. **构建发布版本**:
   ```bash
   cargo build --release
   ```

3. **部署服务**:
   ```bash
   ./target/release/your_app
   ```

### Docker部署

```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /app/target/release/your_app .
COPY config/address_config.toml ./config/
CMD ["./your_app"]
```

## 🔧 故障排除

### 常见问题

1. **配置文件未找到**
   - 检查配置文件路径
   - 确保配置文件存在
   - 检查文件权限

2. **配置验证失败**
   - 检查配置格式
   - 验证必要配置项
   - 检查配置依赖关系

3. **环境变量未生效**
   - 检查环境变量名称
   - 确保环境变量已设置
   - 重启应用程序

4. **性能问题**
   - 检查缓存配置
   - 监控配置访问频率
   - 优化配置加载逻辑

### 调试技巧

1. **启用详细日志**:
   ```rust
   std::env::set_var("RUST_LOG", "debug");
   ```

2. **打印配置摘要**:
   ```rust
   let summary = address_manager.get_config_summary().await;
   println!("{:?}", summary);
   ```

3. **验证配置**:
   ```rust
   let config = address_manager.get_full_config().await;
   println!("{:?}", config);
   ```

## 📚 相关文档

- [使用指南](ADDRESS_CONFIG_GUIDE.md) - 详细的使用说明
- [数据库配置](DATABASE_CONFIG.md) - 数据库配置文档
- [API文档](API_DOCUMENTATION.md) - API接口文档
- [部署指南](DEPLOYMENT_GUIDE.md) - 部署相关文档

## 🤝 贡献指南

### 开发环境设置

1. **克隆仓库**:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **安装依赖**:
   ```bash
   cargo build
   ```

3. **运行测试**:
   ```bash
   cargo test
   ```

### 代码规范

- 遵循Rust编码规范
- 添加适当的文档注释
- 编写单元测试
- 确保代码通过clippy检查

### 提交规范

- 使用清晰的提交信息
- 包含相关的测试
- 更新相关文档
- 遵循语义化版本

---

**注意**: 本系统设计为可扩展的，可以根据具体需求添加更多配置项和功能。如有问题或建议，请参考相关文档或联系开发团队。