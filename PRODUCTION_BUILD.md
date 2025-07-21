# 生产环境编译和部署指南

## 编译时间：2025-01-20 UTC

## 编译命令
```bash
cargo build --release
```

## 编译优化

### Cargo.toml 优化配置
```toml
[profile.release]
opt-level = 3          # 最大优化级别
lto = true             # 链接时优化
codegen-units = 1      # 单一代码生成单元，最大优化
strip = true           # 移除调试符号
panic = "abort"        # panic时直接终止，减小二进制大小
```

## 生产环境配置检查清单

### 1. 环境变量
```bash
# 必需的环境变量
export RUST_LOG=info
export REDIS_URL=redis://your-redis-server:6379
export DATABASE_URL=your-database-url
export JWT_SECRET=your-secure-jwt-secret
export OPENAI_API_KEY=your-openai-key
export GOOGLE_TRANSLATE_API_KEY=your-google-key
export AZURE_SPEECH_KEY=your-azure-key
```

### 2. 配置文件
- ✅ `config/address_config.toml` - 地址配置
- ✅ `config/redis_pool.toml` - Redis连接池配置
- ✅ `config/message_system.toml` - 消息系统配置
- ✅ `config/ai_config.toml` - AI功能配置
- ✅ `config/users.json` - 用户配置

### 3. 目录结构
```bash
# 创建必要的目录
mkdir -p logs
mkdir -p uploads/images
mkdir -p uploads/files
mkdir -p uploads/voices
mkdir -p backups
mkdir -p temp
```

### 4. 系统依赖
- Redis 6.0+
- OpenSSL
- 系统信息工具 (sys-info)

## 部署步骤

### 1. 编译产物
编译完成后，生产二进制文件位于：
```
target/release/rust-warp-chat-server
```

### 2. 部署命令
```bash
# 复制二进制文件到部署目录
cp target/release/rust-warp-chat-server /opt/ylqkf/

# 复制配置文件
cp -r config /opt/ylqkf/

# 设置权限
chmod +x /opt/ylqkf/rust-warp-chat-server
```

### 3. Systemd 服务配置
创建 `/etc/systemd/system/ylqkf.service`:
```ini
[Unit]
Description=YLQKF Customer Service System
After=network.target redis.service

[Service]
Type=simple
User=ylqkf
Group=ylqkf
WorkingDirectory=/opt/ylqkf
Environment="RUST_LOG=info"
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=/opt/ylqkf/rust-warp-chat-server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 4. 启动服务
```bash
sudo systemctl daemon-reload
sudo systemctl enable ylqkf
sudo systemctl start ylqkf
sudo systemctl status ylqkf
```

## 性能优化建议

### 1. 编译器优化
- 使用最新的Rust稳定版
- 启用LTO（链接时优化）
- 使用单一代码生成单元
- 移除调试符号

### 2. 运行时优化
- 调整Redis连接池大小
- 配置适当的并发限制
- 启用HTTP/2
- 使用CDN加速静态资源

### 3. 监控设置
- 配置Prometheus指标导出
- 设置日志轮转
- 监控内存和CPU使用
- 设置告警阈值

## 安全加固

### 1. 网络安全
- 使用HTTPS（配置SSL证书）
- 限制CORS来源
- 启用请求限流
- 配置防火墙规则

### 2. 应用安全
- 所有API密钥使用环境变量
- 启用JWT认证
- 定期轮换密钥
- 审计日志记录

### 3. 数据安全
- Redis密码保护
- 数据加密传输
- 定期备份
- 敏感信息脱敏

## 健康检查

### 1. 应用健康检查端点
```
GET /health
GET /api/system/health
```

### 2. 依赖服务检查
- Redis连接状态
- 文件系统权限
- 内存使用情况
- CPU负载

## 故障恢复

### 1. 自动重启
- Systemd自动重启配置
- 健康检查失败重启
- 资源限制触发重启

### 2. 数据备份
- 定期备份配置文件
- 导出消息数据
- Redis数据持久化

### 3. 回滚方案
- 保留上一版本二进制文件
- 配置文件版本控制
- 数据库迁移回滚脚本

## 性能基准

编译优化后的预期性能：
- 启动时间：< 2秒
- 内存占用：< 500MB（空闲）
- 并发连接：10,000+
- 消息吞吐量：50,000+ msg/s
- API响应时间：< 50ms (p99)

## 监控指标

需要监控的关键指标：
- WebSocket连接数
- 消息发送/接收速率
- API请求延迟
- Redis命令执行时间
- 系统资源使用率

## 更新日志

### 版本信息
- 编译时间：{TIMESTAMP}
- Rust版本：1.82.0
- 目标平台：x86_64-unknown-linux-gnu
- 优化级别：3 (最高)