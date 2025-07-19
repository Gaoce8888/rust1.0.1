#!/bin/bash

echo "=== 前端构建脚本 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否安装了必要的工具
check_dependencies() {
    echo "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        echo "请先安装 Node.js: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 构建客服端
build_kefu() {
    echo -e "\n${YELLOW}构建客服端...${NC}"
    cd kefu-app
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "安装依赖..."
        npm install
    fi
    
    # 执行构建
    echo "执行构建..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 客服端构建成功${NC}"
        echo "构建输出: ../../static/kefu-build/"
    else
        echo -e "${RED}❌ 客服端构建失败${NC}"
        exit 1
    fi
    
    cd ..
}

# 构建客户端
build_kehu() {
    echo -e "\n${YELLOW}构建客户端...${NC}"
    cd kehu-app
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "安装依赖..."
        npm install
    fi
    
    # 执行构建
    echo "执行构建..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 客户端构建成功${NC}"
        echo "构建输出: ../../static/kehu-build/"
    else
        echo -e "${RED}❌ 客户端构建失败${NC}"
        exit 1
    fi
    
    cd ..
}

# 主函数
main() {
    check_dependencies
    
    # 解析参数
    case "$1" in
        kefu)
            build_kefu
            ;;
        kehu)
            build_kehu
            ;;
        all|"")
            build_kefu
            build_kehu
            ;;
        *)
            echo "用法: $0 [kefu|kehu|all]"
            echo "  kefu - 只构建客服端"
            echo "  kehu - 只构建客户端"
            echo "  all  - 构建所有（默认）"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}=== 构建完成 ===${NC}"
    echo "构建输出目录:"
    echo "  - 客服端: /static/kefu-build/"
    echo "  - 客户端: /static/kehu-build/"
    echo ""
    echo "后端会自动从这些目录提供服务"
}

# 执行主函数
main "$@"