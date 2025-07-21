#!/bin/bash

# Rust后端代码质量分析脚本
# 用于检测无用代码、重复代码和未实现功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"
REPORT_DIR="$PROJECT_ROOT/reports"
LOG_FILE="$REPORT_DIR/code_quality_analysis.log"

# 创建报告目录
mkdir -p "$REPORT_DIR"

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# 初始化报告
init_report() {
    log "开始Rust后端代码质量分析..."
    log "项目根目录: $PROJECT_ROOT"
    log "源码目录: $SRC_DIR"
    
    # 检查Rust工具链
    if ! command -v cargo &> /dev/null; then
        error "Cargo未安装，请先安装Rust工具链"
        exit 1
    fi
    
    if ! command -v rustc &> /dev/null; then
        error "Rustc未安装，请先安装Rust工具链"
        exit 1
    fi
}

# 1. 检测未使用的代码
detect_unused_code() {
    log "检测未使用的代码..."
    
    local unused_report="$REPORT_DIR/unused_code_report.txt"
    echo "=== 未使用代码检测报告 ===" > "$unused_report"
    echo "生成时间: $(date)" >> "$unused_report"
    echo "" >> "$unused_report"
    
    # 检测未使用的导入
    log "检测未使用的导入..."
    echo "## 未使用的导入" >> "$unused_report"
    find "$SRC_DIR" -name "*.rs" -exec grep -l "use.*;" {} \; | while read -r file; do
        # 这里需要更复杂的分析，暂时使用简单检测
        echo "文件: $file" >> "$unused_report"
    done
    echo "" >> "$unused_report"
    
    # 检测被注释的模块
    log "检测被注释的模块..."
    echo "## 被注释的模块" >> "$unused_report"
    grep -r "//.*pub mod" "$SRC_DIR" | while read -r line; do
        echo "$line" >> "$unused_report"
    done
    echo "" >> "$unused_report"
    
    # 检测dead_code标记
    log "检测dead_code标记..."
    echo "## dead_code标记" >> "$unused_report"
    grep -r "#\[allow(dead_code)\]" "$SRC_DIR" | while read -r line; do
        echo "$line" >> "$unused_report"
    done
    echo "" >> "$unused_report"
    
    success "未使用代码检测完成: $unused_report"
}

# 2. 检测重复代码
detect_duplicate_code() {
    log "检测重复代码..."
    
    local duplicate_report="$REPORT_DIR/duplicate_code_report.txt"
    echo "=== 重复代码检测报告 ===" > "$duplicate_report"
    echo "生成时间: $(date)" >> "$duplicate_report"
    echo "" >> "$duplicate_report"
    
    # 检测相似的函数模式
    log "检测相似的函数模式..."
    echo "## 相似的函数模式" >> "$duplicate_report"
    
    # Redis操作模式
    echo "### Redis操作模式" >> "$duplicate_report"
    grep -r "pub async fn.*get_connection" "$SRC_DIR" | while read -r line; do
        echo "$line" >> "$duplicate_report"
    done
    echo "" >> "$duplicate_report"
    
    # 错误处理模式
    echo "### 错误处理模式" >> "$duplicate_report"
    grep -r "Err(anyhow::anyhow!" "$SRC_DIR" | head -10 | while read -r line; do
        echo "$line" >> "$duplicate_report"
    done
    echo "" >> "$duplicate_report"
    
    # 配置验证模式
    echo "### 配置验证模式" >> "$duplicate_report"
    grep -r "return Err(anyhow::anyhow!" "$SRC_DIR" | head -10 | while read -r line; do
        echo "$line" >> "$duplicate_report"
    done
    echo "" >> "$duplicate_report"
    
    success "重复代码检测完成: $duplicate_report"
}

# 3. 检测未实现功能
detect_unimplemented_features() {
    log "检测未实现功能..."
    
    local unimplemented_report="$REPORT_DIR/unimplemented_features_report.txt"
    echo "=== 未实现功能检测报告 ===" > "$unimplemented_report"
    echo "生成时间: $(date)" >> "$unimplemented_report"
    echo "" >> "$unimplemented_report"
    
    # 检测TODO标记
    log "检测TODO标记..."
    echo "## TODO标记" >> "$unimplemented_report"
    local todo_count=0
    while IFS= read -r -d '' file; do
        local file_todos=$(grep -c "TODO" "$file" 2>/dev/null || echo "0")
        if [ "$file_todos" -gt 0 ]; then
            echo "文件: $file (${file_todos}个TODO)" >> "$unimplemented_report"
            grep -n "TODO" "$file" | while read -r line; do
                echo "  $line" >> "$unimplemented_report"
            done
            todo_count=$((todo_count + file_todos))
        fi
    done < <(find "$SRC_DIR" -name "*.rs" -print0)
    echo "总计: ${todo_count}个TODO标记" >> "$unimplemented_report"
    echo "" >> "$unimplemented_report"
    
    # 检测FIXME标记
    log "检测FIXME标记..."
    echo "## FIXME标记" >> "$unimplemented_report"
    local fixme_count=0
    while IFS= read -r -d '' file; do
        local file_fixmes=$(grep -c "FIXME" "$file" 2>/dev/null || echo "0")
        if [ "$file_fixmes" -gt 0 ]; then
            echo "文件: $file (${file_fixmes}个FIXME)" >> "$unimplemented_report"
            grep -n "FIXME" "$file" | while read -r line; do
                echo "  $line" >> "$unimplemented_report"
            done
            fixme_count=$((fixme_count + file_fixmes))
        fi
    done < <(find "$SRC_DIR" -name "*.rs" -print0)
    echo "总计: ${fixme_count}个FIXME标记" >> "$unimplemented_report"
    echo "" >> "$unimplemented_report"
    
    # 检测空实现
    log "检测空实现..."
    echo "## 空实现函数" >> "$unimplemented_report"
    find "$SRC_DIR" -name "*.rs" -exec grep -l "return.*\[\]" {} \; | while read -r file; do
        echo "文件: $file" >> "$unimplemented_report"
        grep -n "return.*\[\]" "$file" | while read -r line; do
            echo "  $line" >> "$unimplemented_report"
        done
    done
    echo "" >> "$unimplemented_report"
    
    # 检测占位符返回
    log "检测占位符返回..."
    echo "## 占位符返回" >> "$unimplemented_report"
    find "$SRC_DIR" -name "*.rs" -exec grep -l "return.*0" {} \; | while read -r file; do
        echo "文件: $file" >> "$unimplemented_report"
        grep -n "return.*0" "$file" | while read -r line; do
            echo "  $line" >> "$unimplemented_report"
        done
    done
    echo "" >> "$unimplemented_report"
    
    success "未实现功能检测完成: $unimplemented_report"
}

# 4. 检测编译错误和警告
detect_compilation_issues() {
    log "检测编译错误和警告..."
    
    local compilation_report="$REPORT_DIR/compilation_report.txt"
    echo "=== 编译错误和警告报告 ===" > "$compilation_report"
    echo "生成时间: $(date)" >> "$compilation_report"
    echo "" >> "$compilation_report"
    
    # 切换到项目根目录
    cd "$PROJECT_ROOT"
    
    # 运行cargo check
    log "运行cargo check..."
    if cargo check --message-format=json 2>&1 | tee -a "$compilation_report"; then
        success "编译检查完成，无错误"
    else
        warning "发现编译错误或警告，详情请查看: $compilation_report"
    fi
    
    # 运行cargo clippy
    log "运行cargo clippy..."
    if cargo clippy --message-format=json 2>&1 | tee -a "$compilation_report"; then
        success "代码风格检查完成"
    else
        warning "发现代码风格问题，详情请查看: $compilation_report"
    fi
}

# 5. 生成统计报告
generate_statistics() {
    log "生成统计报告..."
    
    local stats_report="$REPORT_DIR/statistics_report.txt"
    echo "=== 代码质量统计报告 ===" > "$stats_report"
    echo "生成时间: $(date)" >> "$stats_report"
    echo "" >> "$stats_report"
    
    # 文件统计
    local total_files=$(find "$SRC_DIR" -name "*.rs" | wc -l)
    local total_lines=$(find "$SRC_DIR" -name "*.rs" -exec wc -l {} + | tail -1 | awk '{print $1}')
    
    echo "## 文件统计" >> "$stats_report"
    echo "总文件数: $total_files" >> "$stats_report"
    echo "总代码行数: $total_lines" >> "$stats_report"
    echo "" >> "$stats_report"
    
    # TODO统计
    local total_todos=$(grep -r "TODO" "$SRC_DIR" | wc -l)
    local total_fixmes=$(grep -r "FIXME" "$SRC_DIR" | wc -l)
    
    echo "## 未实现功能统计" >> "$stats_report"
    echo "TODO标记: $total_todos" >> "$stats_report"
    echo "FIXME标记: $total_fixmes" >> "$stats_report"
    echo "" >> "$stats_report"
    
    # 被注释模块统计
    local commented_modules=$(grep -r "//.*pub mod" "$SRC_DIR" | wc -l)
    
    echo "## 被禁用模块统计" >> "$stats_report"
    echo "被注释的模块: $commented_modules" >> "$stats_report"
    echo "" >> "$stats_report"
    
    # dead_code统计
    local dead_code_count=$(grep -r "#\[allow(dead_code)\]" "$SRC_DIR" | wc -l)
    
    echo "## 无用代码统计" >> "$stats_report"
    echo "dead_code标记: $dead_code_count" >> "$stats_report"
    echo "" >> "$stats_report"
    
    success "统计报告生成完成: $stats_report"
}

# 6. 生成改进建议
generate_improvement_suggestions() {
    log "生成改进建议..."
    
    local suggestions_report="$REPORT_DIR/improvement_suggestions.txt"
    echo "=== 代码质量改进建议 ===" > "$suggestions_report"
    echo "生成时间: $(date)" >> "$suggestions_report"
    echo "" >> "$suggestions_report"
    
    echo "## 立即处理（高优先级）" >> "$suggestions_report"
    echo "1. 解决编译错误，启用被禁用的企业级模块" >> "$suggestions_report"
    echo "2. 实现核心TODO功能，特别是用户管理和会话管理" >> "$suggestions_report"
    echo "3. 修复空实现和占位符返回" >> "$suggestions_report"
    echo "" >> "$suggestions_report"
    
    echo "## 短期改进（中优先级）" >> "$suggestions_report"
    echo "1. 抽取重复的Redis操作模式为通用工具函数" >> "$suggestions_report"
    echo "2. 统一错误处理模式" >> "$suggestions_report"
    echo "3. 清理注释的代码和未使用的导入" >> "$suggestions_report"
    echo "" >> "$suggestions_report"
    
    echo "## 长期优化（低优先级）" >> "$suggestions_report"
    echo "1. 重构模块依赖关系" >> "$suggestions_report"
    echo "2. 完善测试覆盖" >> "$suggestions_report"
    echo "3. 性能优化" >> "$suggestions_report"
    echo "" >> "$suggestions_report"
    
    success "改进建议生成完成: $suggestions_report"
}

# 7. 生成汇总报告
generate_summary_report() {
    log "生成汇总报告..."
    
    local summary_report="$REPORT_DIR/code_quality_summary.md"
    cat > "$summary_report" << EOF
# Rust后端代码质量分析汇总报告

## 📊 分析概览
- **分析时间**: $(date)
- **项目路径**: $PROJECT_ROOT
- **源码目录**: $SRC_DIR
- **报告目录**: $REPORT_DIR

## 📋 检测结果

### 1. 未使用代码
- 详细报告: [unused_code_report.txt](unused_code_report.txt)
- 主要问题: 被注释的模块、dead_code标记

### 2. 重复代码
- 详细报告: [duplicate_code_report.txt](duplicate_code_report.txt)
- 主要问题: Redis操作模式、错误处理模式

### 3. 未实现功能
- 详细报告: [unimplemented_features_report.txt](unimplemented_features_report.txt)
- 主要问题: TODO标记、空实现

### 4. 编译问题
- 详细报告: [compilation_report.txt](compilation_report.txt)

### 5. 统计信息
- 详细报告: [statistics_report.txt](statistics_report.txt)

### 6. 改进建议
- 详细报告: [improvement_suggestions.txt](improvement_suggestions.txt)

## 🎯 下一步行动

1. **立即处理**: 解决编译错误，启用被禁用模块
2. **短期改进**: 实现核心TODO功能
3. **长期优化**: 重构代码结构，提高代码质量

---
*报告由代码质量分析脚本自动生成*
EOF
    
    success "汇总报告生成完成: $summary_report"
}

# 主函数
main() {
    init_report
    
    # 运行所有检测
    detect_unused_code
    detect_duplicate_code
    detect_unimplemented_features
    detect_compilation_issues
    generate_statistics
    generate_improvement_suggestions
    generate_summary_report
    
    log "代码质量分析完成！"
    log "所有报告已保存到: $REPORT_DIR"
    log "请查看汇总报告: $REPORT_DIR/code_quality_summary.md"
    
    success "分析完成！"
}

# 运行主函数
main "$@"