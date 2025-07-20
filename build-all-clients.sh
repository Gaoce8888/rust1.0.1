#!/bin/bash

# 客服系统客户端构建脚本
echo "🚀 开始构建客服系统所有客户端..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 构建客服端
print_status "构建客服端 (端口: 6005)..."
cd static/react-kefu

if [ "$1" = "--build" ]; then
    npm install && npm run build
    if [ $? -eq 0 ]; then
        print_success "客服端生产版本构建完成"
    else
        print_error "客服端构建失败"
        exit 1
    fi
else
    print_status "启动客服端开发服务器..."
    print_success "客服端将在 http://localhost:6005 启动"
    # 在后台启动客服端
    npm install && npm run dev &
    KEFU_PID=$!
    echo $KEFU_PID > /tmp/kefu-pid
fi

cd ../..

# 构建客户端
print_status "构建客户端 (端口: 8004)..."
cd static/react-kehu

if [ "$1" = "--build" ]; then
    npm install && npm run build
    if [ $? -eq 0 ]; then
        print_success "客户端生产版本构建完成"
    else
        print_error "客户端构建失败"
        exit 1
    fi
else
    print_status "启动客户端开发服务器..."
    print_success "客户端将在 http://localhost:8004 启动"
    # 在后台启动客户端
    npm install && npm run dev &
    KEHU_PID=$!
    echo $KEHU_PID > /tmp/kehu-pid
fi

cd ../..

if [ "$1" != "--build" ]; then
    print_success "所有客户端启动完成！"
    echo ""
    echo "📱 客户端访问地址:"
    echo "   - 客服端: http://localhost:6005"
    echo "   - 客户端: http://localhost:8004"
    echo ""
    echo "🔄 按 Ctrl+C 停止所有服务"
    echo ""
    
    # 等待用户中断
    trap 'cleanup' INT
    wait
fi

cleanup() {
    print_status "正在停止所有服务..."
    
    # 停止客服端
    if [ -f /tmp/kefu-pid ]; then
        KEFU_PID=$(cat /tmp/kefu-pid)
        kill $KEFU_PID 2>/dev/null
        rm /tmp/kefu-pid
    fi
    
    # 停止客户端
    if [ -f /tmp/kehu-pid ]; then
        KEHU_PID=$(cat /tmp/kehu-pid)
        kill $KEHU_PID 2>/dev/null
        rm /tmp/kehu-pid
    fi
    
    print_success "所有服务已停止"
    exit 0
}