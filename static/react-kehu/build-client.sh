#!/bin/bash

# 客户端构建脚本
echo "🚀 开始构建客服系统客户端..."

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

echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 检查是否要构建生产版本
if [ "$1" = "--build" ]; then
    echo "🏗️  构建生产版本..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败"
        exit 1
    fi
    
    echo "✅ 生产版本构建完成"
    echo "📁 构建文件位于 dist/ 目录"
else
    echo "🚀 启动开发服务器..."
    echo "📍 访问地址: http://localhost:8004"
    echo "🔄 按 Ctrl+C 停止服务器"
    npm run dev
fi