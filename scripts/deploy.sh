#!/bin/bash

# 生产部署脚本
# 使用方法: ./scripts/deploy.sh [环境] [版本]

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
ENVIRONMENT=${1:-production}
VERSION=${2:-$(git describe --tags --always || echo "latest")}
DEPLOY_DIR="/opt/ylqkf"
BACKUP_DIR="/opt/ylqkf/backups"
SERVICE_NAME="kefu-system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 函数：打印信息
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查先决条件
check_prerequisites() {
    log_info "检查先决条件..."
    
    # 检查二进制文件
    if [ ! -f "target/release/kefu-system" ]; then
        log_error "未找到编译后的二进制文件。请先运行: cargo build --release"
        exit 1
    fi
    
    # 检查配置文件
    for config in config/*.toml config/users.json; do
        if [ ! -f "$config" ]; then
            log_error "配置文件不存在: $config"
            exit 1
        fi
    done
    
    # 检查部署目录权限
    if [ ! -w "$DEPLOY_DIR" ]; then
        log_warn "部署目录不可写: $DEPLOY_DIR"
        log_info "尝试创建部署目录..."
        sudo mkdir -p "$DEPLOY_DIR" "$BACKUP_DIR"
        sudo chown -R $(whoami):$(whoami) "$DEPLOY_DIR"
    fi
    
    log_info "先决条件检查完成 ✓"
}

# 函数：备份当前版本
backup_current() {
    log_info "备份当前版本..."
    
    if [ -f "$DEPLOY_DIR/kefu-system" ]; then
        BACKUP_FILE="$BACKUP_DIR/kefu-system_backup_$TIMESTAMP"
        cp "$DEPLOY_DIR/kefu-system" "$BACKUP_FILE"
        log_info "二进制文件已备份到: $BACKUP_FILE"
    fi
    
    # 备份配置文件
    if [ -d "$DEPLOY_DIR/config" ]; then
        tar -czf "$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz" -C "$DEPLOY_DIR" config
        log_info "配置文件已备份到: $BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"
    fi
}

# 函数：部署新版本
deploy_new_version() {
    log_info "部署新版本..."
    
    # 复制二进制文件
    cp target/release/kefu-system "$DEPLOY_DIR/"
    chmod +x "$DEPLOY_DIR/kefu-system"
    
    # 复制配置文件
    cp -r config "$DEPLOY_DIR/"
    
    # 创建必要的目录
    mkdir -p "$DEPLOY_DIR"/{logs,uploads/{images,files,voices},backups,temp}
    
    # 设置权限
    chown -R kefu:kefu "$DEPLOY_DIR" 2>/dev/null || true
    
    log_info "新版本部署完成 ✓"
}

# 函数：运行健康检查
health_check() {
    log_info "运行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_info "服务运行正常 ✓"
        
        # 检查HTTP端点
        if curl -sf http://localhost:8080/health > /dev/null; then
            log_info "健康检查端点响应正常 ✓"
            return 0
        else
            log_error "健康检查端点无响应"
            return 1
        fi
    else
        log_error "服务未运行"
        return 1
    fi
}

# 函数：回滚
rollback() {
    log_error "部署失败，开始回滚..."
    
    # 查找最新的备份
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/kefu-system_backup_* 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$DEPLOY_DIR/kefu-system"
        chmod +x "$DEPLOY_DIR/kefu-system"
        systemctl restart $SERVICE_NAME
        log_info "已回滚到上一版本"
    else
        log_error "未找到备份文件，无法回滚"
        exit 1
    fi
}

# 函数：更新systemd服务
update_systemd_service() {
    log_info "更新systemd服务配置..."
    
    cat > /tmp/kefu-system.service << EOF
[Unit]
Description=YLQKF Customer Service System
After=network.target redis.service

[Service]
Type=simple
User=kefu
Group=kefu
WorkingDirectory=$DEPLOY_DIR
Environment="RUST_LOG=info"
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=$DEPLOY_DIR/kefu-system
Restart=always
RestartSec=5
StandardOutput=append:$DEPLOY_DIR/logs/kefu-system.log
StandardError=append:$DEPLOY_DIR/logs/kefu-system.error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo mv /tmp/kefu-system.service /etc/systemd/system/
    sudo systemctl daemon-reload
    log_info "Systemd服务配置已更新 ✓"
}

# 函数：生成版本信息
generate_version_info() {
    cat > "$DEPLOY_DIR/VERSION" << EOF
Version: $VERSION
Environment: $ENVIRONMENT
Deployed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Deployed By: $(whoami)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Build Time: $(stat -c %Y target/release/kefu-system | xargs -I{} date -d @{} +"%Y-%m-%d %H:%M:%S")
EOF
    
    log_info "版本信息已生成"
}

# 主部署流程
main() {
    log_info "开始部署 YLQKF 客服系统"
    log_info "环境: $ENVIRONMENT"
    log_info "版本: $VERSION"
    
    # 执行部署步骤
    check_prerequisites
    backup_current
    
    # 停止服务
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_info "停止服务..."
        sudo systemctl stop $SERVICE_NAME
    fi
    
    # 部署新版本
    deploy_new_version
    update_systemd_service
    generate_version_info
    
    # 启动服务
    log_info "启动服务..."
    sudo systemctl start $SERVICE_NAME
    sudo systemctl enable $SERVICE_NAME
    
    # 健康检查
    if health_check; then
        log_info "部署成功完成! 🎉"
        log_info "服务运行在: http://localhost:8080"
        
        # 显示服务状态
        echo ""
        sudo systemctl status $SERVICE_NAME --no-pager
    else
        log_error "健康检查失败"
        rollback
        exit 1
    fi
}

# 执行主函数
main