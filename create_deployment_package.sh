#!/bin/bash

echo "📦 开始创建部署包..."

# 设置变量
PACKAGE_NAME="kefu-system-release"
PACKAGE_VERSION="1.0.0"
BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
PACKAGE_DIR="${PACKAGE_NAME}-${PACKAGE_VERSION}-${BUILD_DATE}"

# 创建包目录
echo "📁 创建包目录: ${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}"

# 创建目录结构
mkdir -p "${PACKAGE_DIR}/bin"
mkdir -p "${PACKAGE_DIR}/config"
mkdir -p "${PACKAGE_DIR}/data"
mkdir -p "${PACKAGE_DIR}/logs"
mkdir -p "${PACKAGE_DIR}/static"
mkdir -p "${PACKAGE_DIR}/docs"
mkdir -p "${PACKAGE_DIR}/scripts"

# 复制二进制文件
echo "📋 复制二进制文件..."
cp target/release/kefu-system "${PACKAGE_DIR}/bin/"

# 复制配置文件
echo "📋 复制配置文件..."
cp config/*.json "${PACKAGE_DIR}/config/"
cp config/*.toml "${PACKAGE_DIR}/config/"
cp config/*.example "${PACKAGE_DIR}/config/"

# 复制文档
echo "📋 复制文档..."
cp README.md "${PACKAGE_DIR}/"
cp FINAL_COMPILATION_REPORT.md "${PACKAGE_DIR}/docs/"
cp ADDRESS_CONFIG_SUMMARY.md "${PACKAGE_DIR}/docs/"
cp API_DOCUMENTATION.md "${PACKAGE_DIR}/docs/"
cp DATABASE_CONFIG.md "${PACKAGE_DIR}/docs/"

# 复制脚本
echo "📋 复制脚本..."
cp scripts/* "${PACKAGE_DIR}/scripts/" 2>/dev/null || true

# 复制静态文件
echo "📋 复制静态文件..."
cp -r static/* "${PACKAGE_DIR}/static/" 2>/dev/null || true

# 创建启动脚本
echo "📋 创建启动脚本..."
cat > "${PACKAGE_DIR}/start.sh" << 'EOF'
#!/bin/bash

# 客服系统启动脚本
# 使用方法: ./start.sh [环境]

set -e

# 默认环境
ENVIRONMENT=${1:-development}
CONFIG_FILE="config/app-config.${ENVIRONMENT}.json"

echo "🚀 启动客服系统..."
echo "📊 环境: ${ENVIRONMENT}"
echo "📁 配置文件: ${CONFIG_FILE}"

# 检查配置文件
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "❌ 配置文件不存在: ${CONFIG_FILE}"
    echo "💡 可用的配置文件:"
    ls -la config/app-config.*.json 2>/dev/null || echo "   无配置文件"
    exit 1
fi

# 检查二进制文件
if [ ! -f "bin/kefu-system" ]; then
    echo "❌ 二进制文件不存在: bin/kefu-system"
    exit 1
fi

# 创建必要的目录
mkdir -p logs
mkdir -p data

# 设置环境变量
export APP_ENV="${ENVIRONMENT}"
export RUST_LOG="info"

# 启动服务
echo "✅ 启动服务..."
exec ./bin/kefu-system
EOF

chmod +x "${PACKAGE_DIR}/start.sh"

# 创建停止脚本
echo "📋 创建停止脚本..."
cat > "${PACKAGE_DIR}/stop.sh" << 'EOF'
#!/bin/bash

# 客服系统停止脚本

echo "🛑 停止客服系统..."

# 查找进程
PID=$(pgrep -f "kefu-system" || true)

if [ -n "$PID" ]; then
    echo "📊 找到进程 PID: $PID"
    echo "🔄 发送停止信号..."
    kill -TERM "$PID"
    
    # 等待进程结束
    for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "✅ 服务已停止"
            exit 0
        fi
        sleep 1
    done
    
    # 强制停止
    echo "⚠️ 强制停止进程..."
    kill -KILL "$PID" 2>/dev/null || true
    echo "✅ 服务已强制停止"
else
    echo "ℹ️ 未找到运行中的服务"
fi
EOF

chmod +x "${PACKAGE_DIR}/stop.sh"

# 创建状态检查脚本
echo "📋 创建状态检查脚本..."
cat > "${PACKAGE_DIR}/status.sh" << 'EOF'
#!/bin/bash

# 客服系统状态检查脚本

echo "📊 客服系统状态检查"

# 检查进程
PID=$(pgrep -f "kefu-system" || true)

if [ -n "$PID" ]; then
    echo "✅ 服务运行中 (PID: $PID)"
    
    # 检查端口
    if command -v netstat >/dev/null 2>&1; then
        echo "🌐 端口监听状态:"
        netstat -tlnp 2>/dev/null | grep kefu-system || echo "   未找到端口监听"
    fi
    
    # 检查内存使用
    if command -v ps >/dev/null 2>&1; then
        echo "💾 内存使用:"
        ps -o pid,ppid,cmd,%mem,%cpu --no-headers -p "$PID" 2>/dev/null || echo "   无法获取进程信息"
    fi
else
    echo "❌ 服务未运行"
fi

# 检查日志文件
echo "📝 日志文件状态:"
if [ -d "logs" ]; then
    ls -la logs/ 2>/dev/null || echo "   日志目录为空"
else
    echo "   日志目录不存在"
fi

# 检查数据目录
echo "💾 数据目录状态:"
if [ -d "data" ]; then
    ls -la data/ 2>/dev/null || echo "   数据目录为空"
else
    echo "   数据目录不存在"
fi
EOF

chmod +x "${PACKAGE_DIR}/status.sh"

# 创建安装脚本
echo "📋 创建安装脚本..."
cat > "${PACKAGE_DIR}/install.sh" << 'EOF'
#!/bin/bash

# 客服系统安装脚本

set -e

echo "🔧 安装客服系统..."

# 检查系统要求
echo "📋 检查系统要求..."

# 检查操作系统
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✅ 操作系统: Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ 操作系统: macOS"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

# 检查架构
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    echo "✅ 架构: x86_64"
elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
    echo "✅ 架构: ARM64"
else
    echo "⚠️ 未知架构: $ARCH"
fi

# 检查依赖库
echo "📋 检查依赖库..."

# 检查 OpenSSL
if ldconfig -p | grep -q libssl; then
    echo "✅ OpenSSL: 已安装"
else
    echo "❌ OpenSSL: 未安装"
    echo "💡 安装命令:"
    echo "   Ubuntu/Debian: sudo apt install libssl-dev"
    echo "   CentOS/RHEL: sudo yum install openssl-devel"
    echo "   macOS: brew install openssl"
fi

# 检查 zlib
if ldconfig -p | grep -q libz; then
    echo "✅ zlib: 已安装"
else
    echo "❌ zlib: 未安装"
    echo "💡 安装命令:"
    echo "   Ubuntu/Debian: sudo apt install zlib1g-dev"
    echo "   CentOS/RHEL: sudo yum install zlib-devel"
    echo "   macOS: brew install zlib"
fi

# 检查 zstd
if ldconfig -p | grep -q libzstd; then
    echo "✅ zstd: 已安装"
else
    echo "❌ zstd: 未安装"
    echo "💡 安装命令:"
    echo "   Ubuntu/Debian: sudo apt install libzstd-dev"
    echo "   CentOS/RHEL: sudo yum install libzstd-devel"
    echo "   macOS: brew install zstd"
fi

# 创建系统服务
echo "📋 创建系统服务..."

SERVICE_FILE="/etc/systemd/system/kefu-system.service"
INSTALL_DIR=$(pwd)

if [ -w /etc/systemd/system ]; then
    cat > "$SERVICE_FILE" << SERVICE_EOF
[Unit]
Description=Kefu System Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/bin/kefu-system
Restart=always
RestartSec=5
Environment=APP_ENV=production
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
SERVICE_EOF

    echo "✅ 系统服务已创建: $SERVICE_FILE"
    echo "💡 启用服务: sudo systemctl enable kefu-system"
    echo "💡 启动服务: sudo systemctl start kefu-system"
    echo "💡 查看状态: sudo systemctl status kefu-system"
else
    echo "⚠️ 无法创建系统服务 (需要 root 权限)"
    echo "💡 手动创建服务文件: $SERVICE_FILE"
fi

echo "✅ 安装完成！"
echo "🚀 启动服务: ./start.sh production"
EOF

chmod +x "${PACKAGE_DIR}/install.sh"

# 创建依赖检查脚本
echo "📋 创建依赖检查脚本..."
cat > "${PACKAGE_DIR}/check_dependencies.sh" << 'EOF'
#!/bin/bash

# 依赖检查脚本

echo "🔍 检查系统依赖..."

# 检查动态库依赖
echo "📋 动态库依赖:"
if command -v ldd >/dev/null 2>&1; then
    ldd bin/kefu-system
else
    echo "❌ ldd 命令不可用"
fi

echo ""
echo "📋 系统库检查:"

# 检查 OpenSSL
if ldconfig -p | grep -q libssl; then
    echo "✅ libssl: 已安装"
else
    echo "❌ libssl: 未安装"
fi

# 检查 OpenSSL crypto
if ldconfig -p | grep -q libcrypto; then
    echo "✅ libcrypto: 已安装"
else
    echo "❌ libcrypto: 未安装"
fi

# 检查 zlib
if ldconfig -p | grep -q libz; then
    echo "✅ libz: 已安装"
else
    echo "❌ libz: 未安装"
fi

# 检查 zstd
if ldconfig -p | grep -q libzstd; then
    echo "✅ libzstd: 已安装"
else
    echo "❌ libzstd: 未安装"
fi

# 检查 GCC 运行时
if ldconfig -p | grep -q libgcc_s; then
    echo "✅ libgcc_s: 已安装"
else
    echo "❌ libgcc_s: 未安装"
fi

echo ""
echo "📋 网络端口检查:"
echo "💡 确保以下端口可用:"
echo "   - 6006: HTTP API 服务"
echo "   - 6007: WebSocket 服务"
echo "   - 6379: Redis 服务 (如果使用外部 Redis)"

echo ""
echo "📋 文件权限检查:"
if [ -r "bin/kefu-system" ]; then
    echo "✅ 二进制文件可读"
else
    echo "❌ 二进制文件不可读"
fi

if [ -x "bin/kefu-system" ]; then
    echo "✅ 二进制文件可执行"
else
    echo "❌ 二进制文件不可执行"
fi

if [ -w "logs" ]; then
    echo "✅ 日志目录可写"
else
    echo "❌ 日志目录不可写"
fi

if [ -w "data" ]; then
    echo "✅ 数据目录可写"
else
    echo "❌ 数据目录不可写"
fi
EOF

chmod +x "${PACKAGE_DIR}/check_dependencies.sh"

# 创建 README 文件
echo "📋 创建部署说明..."
cat > "${PACKAGE_DIR}/DEPLOYMENT_README.md" << 'EOF'
# 客服系统部署指南

## 📦 包信息
- **版本**: 1.0.0
- **构建日期**: $(date)
- **架构**: x86_64
- **二进制大小**: 11MB

## 🚀 快速开始

### 1. 检查依赖
```bash
./check_dependencies.sh
```

### 2. 安装系统服务 (可选)
```bash
sudo ./install.sh
```

### 3. 启动服务
```bash
# 开发环境
./start.sh development

# 生产环境
./start.sh production
```

### 4. 检查状态
```bash
./status.sh
```

### 5. 停止服务
```bash
./stop.sh
```

## 📋 系统要求

### 必需依赖
- **OpenSSL**: libssl.so.3, libcrypto.so.3
- **zlib**: libz.so.1
- **zstd**: libzstd.so.1
- **GCC 运行时**: libgcc_s.so.1
- **标准 C 库**: libc.so.6, libm.so.6

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

## 📁 目录结构
```
kefu-system/
├── bin/                    # 二进制文件
│   └── kefu-system        # 主程序
├── config/                 # 配置文件
│   ├── app-config.json    # 主配置
│   ├── app-config.development.json
│   ├── app-config.production.json
│   └── address_config.toml
├── data/                   # 数据目录
├── logs/                   # 日志目录
├── static/                 # 静态文件
├── docs/                   # 文档
├── scripts/                # 脚本
├── start.sh               # 启动脚本
├── stop.sh                # 停止脚本
├── status.sh              # 状态检查
├── install.sh             # 安装脚本
└── check_dependencies.sh  # 依赖检查
```

## ⚙️ 配置说明

### 环境配置
- **development**: 开发环境配置
- **production**: 生产环境配置

### 主要配置项
- **服务器端口**: 6006 (HTTP), 6007 (WebSocket)
- **Redis 配置**: 本地 Redis 或外部 Redis
- **日志级别**: info, debug, warn, error
- **数据目录**: ./data
- **日志目录**: ./logs

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
   netstat -tlnp | grep :6006
   # 停止占用端口的进程
   ```

4. **配置文件错误**
   ```bash
   # 检查配置文件语法
   cat config/app-config.json | jq .
   ```

### 日志查看
```bash
# 实时日志
tail -f logs/app.log

# 错误日志
tail -f logs/error.log
```

## 📞 技术支持

如遇到问题，请检查：
1. 系统依赖是否完整
2. 配置文件是否正确
3. 端口是否被占用
4. 文件权限是否正确
5. 日志文件中的错误信息

## 📄 许可证

本项目采用 MIT 许可证。
EOF

# 创建版本信息文件
echo "📋 创建版本信息..."
cat > "${PACKAGE_DIR}/VERSION" << EOF
KEFU_SYSTEM_VERSION=1.0.0
BUILD_DATE=$(date)
BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
RUST_VERSION=$(rustc --version 2>/dev/null || echo "unknown")
TARGET_ARCH=x86_64-unknown-linux-gnu
BINARY_SIZE=$(du -h bin/kefu-system | cut -f1)
EOF

# 创建压缩包
echo "📦 创建压缩包..."
tar -czf "${PACKAGE_DIR}.tar.gz" "${PACKAGE_DIR}"

# 创建 ZIP 包
echo "📦 创建 ZIP 包..."
zip -r "${PACKAGE_DIR}.zip" "${PACKAGE_DIR}"

# 清理临时目录
echo "🧹 清理临时目录..."
rm -rf "${PACKAGE_DIR}"

# 显示结果
echo ""
echo "🎉 部署包创建完成！"
echo ""
echo "📦 生成的文件:"
echo "   - ${PACKAGE_DIR}.tar.gz"
echo "   - ${PACKAGE_DIR}.zip"
echo ""
echo "📋 包内容:"
echo "   - 二进制文件: bin/kefu-system (11MB)"
echo "   - 配置文件: config/"
echo "   - 启动脚本: start.sh, stop.sh, status.sh"
echo "   - 安装脚本: install.sh"
echo "   - 依赖检查: check_dependencies.sh"
echo "   - 部署文档: DEPLOYMENT_README.md"
echo ""
echo "🚀 使用方法:"
echo "   1. 解压包: tar -xzf ${PACKAGE_DIR}.tar.gz"
echo "   2. 进入目录: cd ${PACKAGE_DIR}"
echo "   3. 检查依赖: ./check_dependencies.sh"
echo "   4. 启动服务: ./start.sh production"
echo ""
echo "📋 系统依赖:"
echo "   - OpenSSL (libssl.so.3, libcrypto.so.3)"
echo "   - zlib (libz.so.1)"
echo "   - zstd (libzstd.so.1)"
echo "   - GCC 运行时 (libgcc_s.so.1)"
echo "   - 标准 C 库 (libc.so.6, libm.so.6)"