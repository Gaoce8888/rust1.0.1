# 未使用代码报告

## 概述
本报告记录了项目中标记为 `#[allow(dead_code)]` 的代码，这些代码当前未被使用但保留供未来功能使用。

## 统计信息
- **特殊注释标记 (TODO/FIXME等)**: 27个
- **dead_code标记**: 多处

## 未使用代码分类

### 1. WebSocket相关
- **文件**: `src/types/websocket.rs`
- **结构体**: `WebSocketConnectionInfo`
- **说明**: 预留用于WebSocket认证功能

### 2. API请求参数
- **文件**: `src/types/api.rs`
- **字段**:
  - `FileListRequest`: page, limit, category, sort_by, sort_order
  - `TemplateListRequest`: page, limit, category, search
- **说明**: 用于分页和过滤功能，将在完整API实现时使用

### 3. 工具方法
- **文件**: `src/types/api.rs`
- **方法**:
  - `ApiError::new()`: 创建API错误
  - `ApiError::with_details()`: 创建带详细信息的错误
  - `ApiResponse::success()`: 创建成功响应
  - `ApiResponse::error()`: 创建错误响应
- **说明**: API响应构建工具方法

### 4. 配置管理
- **文件**: `src/config/`
- **内容**: 
  - AddressManager中的多个字段和方法
  - 全局配置管理相关函数
- **说明**: 配置热更新和动态管理功能

### 5. 认证相关
- **位置**: 多个认证模块
- **说明**: 预留的认证扩展功能

## 建议

1. **保留原因合理的代码**：
   - WebSocket认证相关代码应保留
   - API工具方法应保留
   - 配置管理功能应保留

2. **需要评估的代码**：
   - 检查是否有长期未使用的功能模块
   - 评估预留功能的实现计划

3. **代码清理建议**：
   - 为所有 `#[allow(dead_code)]` 添加注释说明保留原因
   - 定期评审未使用代码，移除确定不需要的部分
   - 考虑使用 feature flags 管理可选功能

## 总结
项目中的未使用代码主要是预留给未来功能扩展的接口和工具方法，符合企业级项目的设计规范。建议保持这些代码，但需要添加更详细的文档说明其用途和实现计划。

---
*生成日期: 2024年*