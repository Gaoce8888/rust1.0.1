# 文档生成指南

本项目提供了多种文档生成工具，帮助您生成完整的项目文档。

## 可用的文档生成脚本

### 1. generate_docs.bat（简单版）
最基础的文档生成脚本，快速生成 API 文档。

**使用方法：**
```bash
generate_docs.bat
```

**功能：**
- 清理旧文档
- 生成基础 API 文档
- 生成包含依赖的完整文档
- 自动打开生成的文档

### 2. generate_full_docs.bat（完整版）
更全面的文档生成脚本，包含文档整理和索引页面。

**使用方法：**
```bash
generate_full_docs.bat
```

**功能：**
- 创建文档目录结构
- 生成 API 文档（含私有项）
- 复制文档到 docs 目录
- 生成项目结构文档
- 创建文档索引页面

### 3. generate_docs.ps1（PowerShell 高级版）
功能最全面的文档生成脚本，提供详细的项目分析。

**使用方法：**
```powershell
powershell -ExecutionPolicy Bypass -File generate_docs.ps1
```

**功能：**
- 所有基础功能
- 生成项目概览（技术栈、模块列表）
- 代码行数统计
- 测试报告生成
- 美观的 HTML 文档中心

## 手动生成文档

如果您想手动生成文档，可以使用以下 Cargo 命令：

```bash
# 生成基础文档（不包含依赖）
cargo doc --no-deps

# 生成完整文档（包含依赖）
cargo doc

# 生成文档并在浏览器中打开
cargo doc --open

# 生成包含私有项的文档
cargo doc --document-private-items

# 生成带所有特性的文档
cargo doc --all-features
```

## 文档位置

生成的文档将保存在以下位置：
- **Cargo 文档**: `target/doc/kefu_system/index.html`
- **文档中心**: `docs/index.html`（使用完整版脚本时）

## 注意事项

1. 确保已安装 Rust 和 Cargo
2. 首次运行可能需要下载依赖，请耐心等待
3. PowerShell 脚本可能需要管理员权限或修改执行策略

## 文档类型说明

- **API 文档**: 自动从代码注释生成的技术文档
- **项目概览**: 项目结构和技术栈介绍
- **代码统计**: 各模块代码行数统计
- **测试报告**: 单元测试和文档测试结果

祝您使用愉快！
