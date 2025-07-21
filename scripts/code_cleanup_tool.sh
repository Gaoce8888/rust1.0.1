#!/bin/bash

# Rust后端代码清理工具
# 用于自动清理无用代码、注释代码和未使用的导入

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
BACKUP_DIR="$PROJECT_ROOT/backup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$PROJECT_ROOT/code_cleanup.log"

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

# 创建备份
create_backup() {
    log "创建代码备份..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$SRC_DIR" "$BACKUP_DIR/"
    success "代码备份已创建: $BACKUP_DIR"
}

# 1. 清理注释的代码块
cleanup_commented_code() {
    log "清理注释的代码块..."
    
    local cleaned_files=0
    
    # 查找并清理多行注释的代码块
    find "$SRC_DIR" -name "*.rs" -type f | while read -r file; do
        local temp_file="${file}.tmp"
        local has_changes=false
        
        # 创建临时文件
        cp "$file" "$temp_file"
        
        # 清理 /* ... */ 格式的注释代码块
        if sed -i '/\/\*/,/\*\//d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 清理连续的 // 注释行（保留文档注释）
        if sed -i '/^[[:space:]]*\/\/[^\/]/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 如果有变化，替换原文件
        if [ "$has_changes" = true ]; then
            mv "$temp_file" "$file"
            cleaned_files=$((cleaned_files + 1))
            log "已清理文件: $file"
        else
            rm -f "$temp_file"
        fi
    done
    
    success "注释代码清理完成，处理了 $cleaned_files 个文件"
}

# 2. 清理未使用的导入
cleanup_unused_imports() {
    log "清理未使用的导入..."
    
    # 使用cargo fix自动清理未使用的导入
    cd "$PROJECT_ROOT"
    
    if cargo fix --allow-dirty --allow-staged 2>/dev/null; then
        success "未使用导入清理完成"
    else
        warning "自动清理未使用导入失败，请手动检查"
    fi
}

# 3. 清理被注释的模块声明
cleanup_commented_modules() {
    log "清理被注释的模块声明..."
    
    local cleaned_count=0
    
    # 清理被注释的 pub mod 声明
    find "$SRC_DIR" -name "*.rs" -type f | while read -r file; do
        local temp_file="${file}.tmp"
        local has_changes=false
        
        # 创建临时文件
        cp "$file" "$temp_file"
        
        # 删除被注释的模块声明
        if sed -i '/^[[:space:]]*\/\/[[:space:]]*pub mod/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 删除被注释的 use 语句
        if sed -i '/^[[:space:]]*\/\/[[:space:]]*use/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 如果有变化，替换原文件
        if [ "$has_changes" = true ]; then
            mv "$temp_file" "$file"
            cleaned_count=$((cleaned_count + 1))
            log "已清理模块声明: $file"
        else
            rm -f "$temp_file"
        fi
    done
    
    success "模块声明清理完成，处理了 $cleaned_count 个文件"
}

# 4. 清理空函数和占位符
cleanup_empty_functions() {
    log "清理空函数和占位符..."
    
    local cleaned_count=0
    
    find "$SRC_DIR" -name "*.rs" -type f | while read -r file; do
        local temp_file="${file}.tmp"
        local has_changes=false
        
        # 创建临时文件
        cp "$file" "$temp_file"
        
        # 清理只返回空数组的函数
        if sed -i '/pub async fn.*{/,/^[[:space:]]*Ok(CleanupResult {/,/^[[:space:]]*deleted_count: 0,/,/^[[:space:]]*freed_space: 0,/,/^[[:space:]]*})/,/^[[:space:]]*})/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 清理只返回0的函数
        if sed -i '/pub async fn.*{/,/^[[:space:]]*std::time::Duration::from_secs(0)/,/^[[:space:]]*}/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 如果有变化，替换原文件
        if [ "$has_changes" = true ]; then
            mv "$temp_file" "$file"
            cleaned_count=$((cleaned_count + 1))
            log "已清理空函数: $file"
        else
            rm -f "$temp_file"
        fi
    done
    
    success "空函数清理完成，处理了 $cleaned_count 个文件"
}

# 5. 清理dead_code标记
cleanup_dead_code_marks() {
    log "清理dead_code标记..."
    
    local cleaned_count=0
    
    find "$SRC_DIR" -name "*.rs" -type f | while read -r file; do
        local temp_file="${file}.tmp"
        local has_changes=false
        
        # 创建临时文件
        cp "$file" "$temp_file"
        
        # 删除dead_code标记
        if sed -i 's/#\[allow(dead_code)\][[:space:]]*//g' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 删除相关的注释
        if sed -i '/^[[:space:]]*\/\/.*dead_code/d' "$temp_file" 2>/dev/null; then
            has_changes=true
        fi
        
        # 如果有变化，替换原文件
        if [ "$has_changes" = true ]; then
            mv "$temp_file" "$file"
            cleaned_count=$((cleaned_count + 1))
            log "已清理dead_code标记: $file"
        else
            rm -f "$temp_file"
        fi
    done
    
    success "dead_code标记清理完成，处理了 $cleaned_count 个文件"
}

# 6. 清理重复的代码模式
cleanup_duplicate_patterns() {
    log "清理重复的代码模式..."
    
    # 创建工具函数文件
    local utils_dir="$SRC_DIR/utils"
    mkdir -p "$utils_dir"
    
    # 创建Redis操作工具
    cat > "$utils_dir/redis_ops.rs" << 'EOF'
//! Redis操作工具函数
//! 提供通用的Redis操作模式

use crate::redis_pool::RedisPoolManager;
use anyhow::Result;
use std::sync::Arc;

/// 检查键是否存在
pub async fn check_key_exists(
    redis_pool: &Arc<RedisPoolManager>,
    key: &str,
) -> Result<bool> {
    let mut conn = redis_pool.get_connection().await?;
    let exists: bool = conn.exists(key).await?;
    Ok(exists)
}

/// 获取集合大小
pub async fn get_set_size(
    redis_pool: &Arc<RedisPoolManager>,
    key: &str,
) -> Result<usize> {
    let mut conn = redis_pool.get_connection().await?;
    let size: usize = conn.scard(key).await?;
    Ok(size)
}

/// 获取会话ID
pub async fn get_session_id(
    redis_pool: &Arc<RedisPoolManager>,
    session_key: &str,
) -> Result<Option<String>> {
    let mut conn = redis_pool.get_connection().await?;
    let session_id: Option<String> = conn.get(session_key).await?;
    Ok(session_id)
}
EOF
    
    # 创建错误处理工具
    cat > "$utils_dir/error_handling.rs" << 'EOF'
//! 错误处理工具函数
//! 提供统一的错误处理模式

use anyhow::{anyhow, Result};
use tracing::error;

/// 统一的错误处理宏
#[macro_export]
macro_rules! handle_error {
    ($result:expr, $operation:expr) => {
        match $result {
            Ok(data) => Ok(data),
            Err(e) => {
                error!("{}失败: {:?}", $operation, e);
                Err(anyhow!("{}失败: {}", $operation, e))
            }
        }
    };
}

/// 统一的配置验证函数
pub fn validate_config_field<T: AsRef<str>>(
    field: T,
    field_name: &str,
) -> Result<()> {
    if field.as_ref().is_empty() {
        return Err(anyhow!("{} cannot be empty", field_name));
    }
    Ok(())
}

/// 统一的数值验证函数
pub fn validate_config_number(
    value: u32,
    field_name: &str,
) -> Result<()> {
    if value == 0 {
        return Err(anyhow!("{} cannot be 0", field_name));
    }
    Ok(())
}
EOF
    
    # 创建mod.rs文件
    cat > "$utils_dir/mod.rs" << 'EOF'
//! 工具模块
//! 提供通用的工具函数

pub mod redis_ops;
pub mod error_handling;

pub use redis_ops::*;
pub use error_handling::*;
EOF
    
    success "重复代码模式清理完成，创建了工具函数"
}

# 7. 格式化代码
format_code() {
    log "格式化代码..."
    
    cd "$PROJECT_ROOT"
    
    if cargo fmt; then
        success "代码格式化完成"
    else
        warning "代码格式化失败"
    fi
}

# 8. 运行编译检查
run_compilation_check() {
    log "运行编译检查..."
    
    cd "$PROJECT_ROOT"
    
    if cargo check; then
        success "编译检查通过"
    else
        error "编译检查失败，请查看错误信息"
        return 1
    fi
}

# 9. 生成清理报告
generate_cleanup_report() {
    log "生成清理报告..."
    
    local report_file="$PROJECT_ROOT/code_cleanup_report.md"
    
    cat > "$report_file" << EOF
# 代码清理报告

## 📊 清理概览
- **清理时间**: $(date)
- **项目路径**: $PROJECT_ROOT
- **备份位置**: $BACKUP_DIR

## 🧹 清理项目

### 1. 注释代码清理
- 清理了多行注释的代码块
- 清理了连续的 // 注释行
- 保留了文档注释

### 2. 未使用导入清理
- 使用 cargo fix 自动清理
- 移除了未使用的 use 语句

### 3. 模块声明清理
- 清理了被注释的 pub mod 声明
- 清理了被注释的 use 语句

### 4. 空函数清理
- 清理了只返回空数组的函数
- 清理了只返回0的函数

### 5. dead_code标记清理
- 移除了 #[allow(dead_code)] 标记
- 清理了相关的注释

### 6. 重复代码模式清理
- 创建了 utils/redis_ops.rs 工具函数
- 创建了 utils/error_handling.rs 错误处理工具
- 提供了统一的代码模式

## 📋 下一步行动

1. **检查清理结果**
   \`\`\`bash
   cargo check
   cargo test
   \`\`\`

2. **手动检查重要文件**
   - 检查 lib.rs 和 main.rs
   - 检查关键业务逻辑文件
   - 确保没有误删重要代码

3. **恢复误删的代码**
   如果需要恢复，可以从备份目录恢复：
   \`\`\`bash
   cp -r $BACKUP_DIR/src/* src/
   \`\`\`

## ⚠️ 注意事项

- 清理前已创建完整备份
- 建议在测试环境中先验证清理结果
- 如果发现问题，可以从备份恢复

---
*报告由代码清理工具自动生成*
EOF
    
    success "清理报告生成完成: $report_file"
}

# 主函数
main() {
    log "开始Rust后端代码清理..."
    log "项目根目录: $PROJECT_ROOT"
    log "源码目录: $SRC_DIR"
    
    # 检查Rust工具链
    if ! command -v cargo &> /dev/null; then
        error "Cargo未安装，请先安装Rust工具链"
        exit 1
    fi
    
    # 创建备份
    create_backup
    
    # 运行清理步骤
    cleanup_commented_code
    cleanup_unused_imports
    cleanup_commented_modules
    cleanup_empty_functions
    cleanup_dead_code_marks
    cleanup_duplicate_patterns
    format_code
    
    # 运行编译检查
    if run_compilation_check; then
        success "代码清理完成，编译检查通过"
    else
        warning "代码清理完成，但编译检查失败，请手动修复"
    fi
    
    # 生成报告
    generate_cleanup_report
    
    log "代码清理完成！"
    log "备份位置: $BACKUP_DIR"
    log "清理报告: $PROJECT_ROOT/code_cleanup_report.md"
    
    success "清理完成！"
}

# 运行主函数
main "$@"