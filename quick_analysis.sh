#!/bin/bash

# Rust后端代码质量快速分析脚本
# 一键运行代码质量分析并生成报告

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
Rust后端代码质量快速分析工具

用法: $0 [选项]

选项:
    -h, --help      显示此帮助信息
    -a, --analyze   运行代码质量分析
    -c, --cleanup   运行代码清理
    -f, --full      运行完整分析（分析+清理）
    -r, --report    只生成报告（不运行分析）

示例:
    $0 -a              # 只运行分析
    $0 -c              # 只运行清理
    $0 -f              # 运行完整分析
    $0 -r              # 只生成报告

EOF
}

# 检查依赖
check_dependencies() {
    log "检查依赖..."
    
    if ! command -v cargo &> /dev/null; then
        error "Cargo未安装，请先安装Rust工具链"
        exit 1
    fi
    
    if ! command -v rustc &> /dev/null; then
        error "Rustc未安装，请先安装Rust工具链"
        exit 1
    fi
    
    if [ ! -f "scripts/code_quality_analyzer.sh" ]; then
        error "代码质量分析工具未找到"
        exit 1
    fi
    
    if [ ! -f "scripts/code_cleanup_tool.sh" ]; then
        error "代码清理工具未找到"
        exit 1
    fi
    
    success "依赖检查通过"
}

# 运行代码质量分析
run_analysis() {
    log "运行代码质量分析..."
    
    if ./scripts/code_quality_analyzer.sh; then
        success "代码质量分析完成"
    else
        error "代码质量分析失败"
        return 1
    fi
}

# 运行代码清理
run_cleanup() {
    log "运行代码清理..."
    
    if ./scripts/code_cleanup_tool.sh; then
        success "代码清理完成"
    else
        error "代码清理失败"
        return 1
    fi
}

# 显示分析结果
show_results() {
    log "显示分析结果..."
    
    if [ -f "reports/code_quality_summary.md" ]; then
        echo ""
        echo "📊 代码质量分析结果:"
        echo "===================="
        cat reports/code_quality_summary.md
        echo ""
    fi
    
    if [ -f "code_cleanup_report.md" ]; then
        echo "🧹 代码清理结果:"
        echo "==============="
        cat code_cleanup_report.md
        echo ""
    fi
    
    # 显示关键统计信息
    if [ -f "reports/statistics_report.txt" ]; then
        echo "📈 关键统计信息:"
        echo "================"
        cat reports/statistics_report.txt
        echo ""
    fi
}

# 显示下一步建议
show_next_steps() {
    echo ""
    echo "🎯 下一步建议:"
    echo "=============="
    echo "1. 查看详细报告:"
    echo "   - 代码质量报告: reports/code_quality_summary.md"
    echo "   - 清理报告: code_cleanup_report.md"
    echo ""
    echo "2. 优先处理的问题:"
    echo "   - 解决编译错误"
    echo "   - 启用被禁用的企业级模块"
    echo "   - 实现核心TODO功能"
    echo ""
    echo "3. 运行测试:"
    echo "   cargo check"
    echo "   cargo test"
    echo ""
    echo "4. 查看完整指南:"
    echo "   cat CODE_QUALITY_GUIDE.md"
    echo ""
}

# 主函数
main() {
    local action=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -a|--analyze)
                action="analyze"
                shift
                ;;
            -c|--cleanup)
                action="cleanup"
                shift
                ;;
            -f|--full)
                action="full"
                shift
                ;;
            -r|--report)
                action="report"
                shift
                ;;
            *)
                error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有指定动作，默认运行分析
    if [ -z "$action" ]; then
        action="analyze"
    fi
    
    log "开始Rust后端代码质量分析..."
    log "项目根目录: $PROJECT_ROOT"
    log "执行动作: $action"
    
    # 检查依赖
    check_dependencies
    
    # 根据动作执行相应操作
    case $action in
        analyze)
            run_analysis
            show_results
            ;;
        cleanup)
            run_cleanup
            show_results
            ;;
        full)
            run_analysis
            run_cleanup
            show_results
            ;;
        report)
            show_results
            ;;
    esac
    
    # 显示下一步建议
    show_next_steps
    
    success "分析完成！"
}

# 运行主函数
main "$@"