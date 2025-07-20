# 📦 客服系统部署包使用指南

## 🎯 概述

本部署包包含完整的客服系统，已优化为生产环境使用，包含所有必要的依赖和配置。

## 📦 包信息

- **包名**: `kefu-system-release-1.0.0-20250720_043525`
- **版本**: 1.0.0
- **构建日期**: 2025-07-20 04:35:25
- **架构**: x86_64-unknown-linux-gnu
- **压缩包大小**: 
  - TAR.GZ: 6.8MB
  - ZIP: 6.9MB
- **解压后大小**: ~50MB

## 🔧 系统依赖

### 必需依赖库
```bash
# 动态库依赖 (通过 ldd 检查)
libssl.so.3      # OpenSSL 加密库
libcrypto.so.3   # OpenSSL 加密库
libz.so.1        # zlib 压缩库
libzstd.so.1     # zstd 压缩库
libgcc_s.so.1    # GCC 运行时库
libc.so.6        # 标准 C 库
libm.so.6        # 数学库
```

### 安装依赖 (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libssl-dev zlib1g-dev libzstd-dev
```

### 安装依赖 (CentOS/RHEL)
```bash
sudo yum install openssl-devel zlib-devel libzstd-devel
```

### 安装依赖 (macOS)
```bash
brew install openssl zlib zstd
```

## 🚀 快速部署

### 1. 解压部署包
```bash
# 使用 tar.gz
tar -xzf kefu-system-release-1.0.0-20250720_043525.tar.gz

# 或使用 zip
unzip kefu-system-release-1.0.0-20250720_043525.zip
```

### 2. 进入目录
```bash
cd kefu-system-release-1.0.0-20250720_043525
```

### 3. 检查依赖
```bash
./check_dependencies.sh
```

### 4. 启动服务
```bash
# 开发环境
./start.sh development

# 生产环境
./start.sh production
```

### 5. 检查状态
```bash
./status.sh
```

## 📁 目录结构

```
kefu-system-release-1.0.0-20250720_043525/
├── bin/                           # 二进制文件
│   └── kefu-system               # 主程序 (11MB)
├── config/                        # 配置文件
│   ├── app-config.json           # 主配置文件
│   ├── app-config.development.json
│   ├── app-config.production.json
│   ├── address_config.toml       # 地址配置
│   ├── redis_pool.toml          # Redis 配置
│   ├── message_system.toml      # 消息系统配置
│   ├── users.json               # 用户数据
│   ├── nginx.conf.example       # Nginx 配置示例
│   └── environment.example      # 环境变量示例
├── data/                         # 数据目录 (运行时创建)
├── logs/                         # 日志目录 (运行时创建)
├── static/                       # 静态文件
│   ├── react-kefu/              # 客服端前端
│   └── react-kehu/              # 客户端前端
├── docs/                         # 文档
│   ├── FINAL_COMPILATION_REPORT.md
│   ├── ADDRESS_CONFIG_SUMMARY.md
│   ├── API_DOCUMENTATION.md
│   └── DATABASE_CONFIG.md
├── scripts/                      # 脚本
│   └── migrate_address_config.rs
├── start.sh                      # 启动脚本
├── stop.sh                       # 停止脚本
├── status.sh                     # 状态检查脚本
├── install.sh                    # 系统服务安装脚本
├── check_dependencies.sh         # 依赖检查脚本
├── DEPLOYMENT_README.md          # 部署说明
├── README.md                     # 项目说明
└── VERSION                       # 版本信息
```

## ⚙️ 配置说明

### 环境配置
- **development**: 开发环境，包含调试信息
- **production**: 生产环境，优化性能

### 主要配置项
```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 6006
  },
  "websocket": {
    "heartbeat_interval": 30000,
    "reconnect_interval": 5000
  },
  "redis": {
    "host": "127.0.0.1",
    "port": 6379
  }
}
```

### 端口配置
- **6006**: HTTP API 服务
- **6007**: WebSocket 服务
- **6379**: Redis 服务 (如果使用外部 Redis)

## 🔧 管理命令

### 启动服务
```bash
# 开发环境
./start.sh development

# 生产环境
./start.sh production

# 自定义环境
./start.sh custom
```

### 停止服务
```bash
./stop.sh
```

### 检查状态
```bash
./status.sh
```

### 安装系统服务
```bash
sudo ./install.sh
```

### 检查依赖
```bash
./check_dependencies.sh
```

## 🐳 Docker 部署

### 创建 Dockerfile
```dockerfile
FROM ubuntu:22.04

# 安装依赖
RUN apt-get update && apt-get install -y \
    libssl3 \
    zlib1g \
    libzstd1 \
    && rm -rf /var/lib/apt/lists/*

# 复制部署包
COPY kefu-system-release-1.0.0-20250720_043525 /app
WORKDIR /app

# 设置权限
RUN chmod +x bin/kefu-system *.sh

# 暴露端口
EXPOSE 6006 6007

# 启动命令
CMD ["./start.sh", "production"]
```

### 构建和运行
```bash
# 构建镜像
docker build -t kefu-system .

# 运行容器
docker run -d \
  --name kefu-system \
  -p 6006:6006 \
  -p 6007:6007 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  kefu-system
```

## 🔒 安全配置

### 防火墙设置
```bash
# 开放必要端口
sudo ufw allow 6006/tcp  # HTTP API
sudo ufw allow 6007/tcp  # WebSocket
sudo ufw allow 6379/tcp  # Redis (如果需要)
```

### SSL/TLS 配置
```bash
# 使用 Nginx 反向代理
sudo cp config/nginx.conf.example /etc/nginx/sites-available/kefu-system
sudo ln -s /etc/nginx/sites-available/kefu-system /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 环境变量
```bash
# 设置生产环境变量
export APP_ENV=production
export RUST_LOG=info
export REDIS_URL=redis://localhost:6379
```

## 📊 监控和日志

### 日志文件
```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看访问日志
tail -f logs/access.log
```

### 性能监控
```bash
# 检查进程状态
ps aux | grep kefu-system

# 检查内存使用
top -p $(pgrep kefu-system)

# 检查端口监听
netstat -tlnp | grep kefu-system
```

### 健康检查
```bash
# API 健康检查
curl http://localhost:6006/api/health

# WebSocket 连接测试
wscat -c ws://localhost:6007/ws
```

## 🔧 故障排除

### 常见问题

1. **权限错误**
   ```bash
   chmod +x bin/kefu-system
   chmod +x *.sh
   ```

2. **依赖缺失**
   ```bash
   ./check_dependencies.sh
   # 根据输出安装缺失的依赖
   ```

3. **端口被占用**
   ```bash
   # 查找占用端口的进程
   netstat -tlnp | grep :6006
   
   # 停止占用进程
   sudo kill -9 <PID>
   ```

4. **配置文件错误**
   ```bash
   # 验证 JSON 语法
   cat config/app-config.json | jq .
   
   # 验证 TOML 语法
   cat config/address_config.toml
   ```

5. **Redis 连接失败**
   ```bash
   # 检查 Redis 服务
   sudo systemctl status redis
   
   # 启动 Redis
   sudo systemctl start redis
   ```

### 日志分析
```bash
# 查看最近的错误
grep ERROR logs/app.log | tail -20

# 查看启动日志
grep "Starting" logs/app.log

# 查看连接日志
grep "Connection" logs/app.log
```

## 📞 技术支持

### 获取帮助
1. 查看 `docs/` 目录中的文档
2. 检查 `logs/` 目录中的日志文件
3. 运行 `./check_dependencies.sh` 检查系统状态
4. 查看 `DEPLOYMENT_README.md` 获取详细说明

### 联系信息
- **项目文档**: 查看 `docs/` 目录
- **API 文档**: `docs/API_DOCUMENTATION.md`
- **配置说明**: `docs/ADDRESS_CONFIG_SUMMARY.md`
- **数据库配置**: `docs/DATABASE_CONFIG.md`

## 📄 许可证

本项目采用 MIT 许可证。

---

**🎉 恭喜！您已成功部署客服系统。系统现在应该可以正常运行了。**