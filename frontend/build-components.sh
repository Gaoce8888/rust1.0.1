#!/bin/bash

# 企业级React组件库构建脚本

set -e

echo "🚀 开始构建企业级React组件库..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查Node.js版本
check_node_version() {
    print_step "检查Node.js版本..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js版本过低，需要v16.0.0或更高版本，当前版本: $NODE_VERSION"
        exit 1
    fi
    
    print_message "Node.js版本检查通过: $NODE_VERSION"
}

# 检查npm版本
check_npm_version() {
    print_step "检查npm版本..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm未安装，请先安装npm"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_message "npm版本: $NPM_VERSION"
}

# 安装共享组件库依赖
install_shared_dependencies() {
    print_step "安装共享组件库依赖..."
    
    cd frontend/shared-components
    
    if [ ! -f "package.json" ]; then
        print_error "共享组件库package.json不存在"
        exit 1
    fi
    
    print_message "安装依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_message "共享组件库依赖安装完成"
    else
        print_error "共享组件库依赖安装失败"
        exit 1
    fi
    
    cd ../..
}

# 构建共享组件库
build_shared_components() {
    print_step "构建共享组件库..."
    
    cd frontend/shared-components
    
    print_message "开始构建..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_message "共享组件库构建完成"
    else
        print_error "共享组件库构建失败"
        exit 1
    fi
    
    cd ../..
}

# 安装客服端依赖
install_kefu_dependencies() {
    print_step "安装客服端依赖..."
    
    cd frontend/kefu-app
    
    if [ ! -f "package.json" ]; then
        print_error "客服端package.json不存在"
        exit 1
    fi
    
    print_message "安装依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_message "客服端依赖安装完成"
    else
        print_error "客服端依赖安装失败"
        exit 1
    fi
    
    cd ../..
}

# 安装客户端依赖
install_kehu_dependencies() {
    print_step "安装客户端依赖..."
    
    cd frontend/kehu-app
    
    if [ ! -f "package.json" ]; then
        print_error "客户端package.json不存在"
        exit 1
    fi
    
    print_message "安装依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_message "客户端依赖安装完成"
    else
        print_error "客户端依赖安装失败"
        exit 1
    fi
    
    cd ../..
}

# 运行类型检查
run_type_check() {
    print_step "运行TypeScript类型检查..."
    
    cd frontend/shared-components
    
    print_message "检查类型..."
    npm run type-check
    
    if [ $? -eq 0 ]; then
        print_message "类型检查通过"
    else
        print_error "类型检查失败"
        exit 1
    fi
    
    cd ../..
}

# 运行代码检查
run_lint() {
    print_step "运行代码检查..."
    
    cd frontend/shared-components
    
    print_message "检查代码..."
    npm run lint
    
    if [ $? -eq 0 ]; then
        print_message "代码检查通过"
    else
        print_warning "代码检查发现问题，但继续构建"
    fi
    
    cd ../..
}

# 创建符号链接
create_symlinks() {
    print_step "创建符号链接..."
    
    cd frontend
    
    # 为客服端创建符号链接
    if [ -d "kefu-app/node_modules" ]; then
        cd kefu-app/node_modules
        if [ ! -L "@enterprise" ]; then
            ln -sf ../../shared-components @enterprise/shared-components
            print_message "客服端符号链接创建完成"
        fi
        cd ../..
    fi
    
    # 为客户端创建符号链接
    if [ -d "kehu-app/node_modules" ]; then
        cd kehu-app/node_modules
        if [ ! -L "@enterprise" ]; then
            ln -sf ../../shared-components @enterprise/shared-components
            print_message "客户端符号链接创建完成"
        fi
        cd ../..
    fi
    
    cd ..
}

# 验证构建结果
verify_build() {
    print_step "验证构建结果..."
    
    # 检查构建输出
    if [ ! -d "frontend/shared-components/dist" ]; then
        print_error "共享组件库构建输出不存在"
        exit 1
    fi
    
    # 检查主要文件
    REQUIRED_FILES=(
        "frontend/shared-components/dist/index.js"
        "frontend/shared-components/dist/index.d.ts"
        "frontend/shared-components/dist/index.esm.js"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "必需文件不存在: $file"
            exit 1
        fi
    done
    
    print_message "构建结果验证通过"
}

# 显示构建信息
show_build_info() {
    print_step "构建信息"
    
    echo "=========================================="
    echo "企业级React组件库构建完成"
    echo "=========================================="
    echo "📦 共享组件库: frontend/shared-components"
    echo "👨‍💼 客服端应用: frontend/kefu-app"
    echo "👤 客户端应用: frontend/kehu-app"
    echo ""
    echo "🚀 启动命令:"
    echo "  客服端: cd frontend/kefu-app && npm run dev"
    echo "  客户端: cd frontend/kehu-app && npm run dev"
    echo ""
    echo "📚 文档: frontend/shared-components/README.md"
    echo "=========================================="
}

# 主函数
main() {
    echo "=========================================="
    echo "企业级React组件库构建脚本"
    echo "=========================================="
    
    # 检查环境
    check_node_version
    check_npm_version
    
    # 安装依赖
    install_shared_dependencies
    install_kefu_dependencies
    install_kehu_dependencies
    
    # 代码检查
    run_lint
    run_type_check
    
    # 构建
    build_shared_components
    
    # 创建符号链接
    create_symlinks
    
    # 验证
    verify_build
    
    # 显示信息
    show_build_info
    
    print_message "🎉 构建完成！"
}

# 错误处理
trap 'print_error "构建过程中发生错误，退出码: $?"' ERR

# 运行主函数
main "$@"