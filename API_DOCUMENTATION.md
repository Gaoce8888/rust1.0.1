# 企业级客服系统 API 文档

## 概述

本文档描述了企业级客服系统的完整API接口，包括客服分配、会话管理、消息处理等功能。

## 基础信息

- **基础URL**: `http://localhost:8080`
- **认证方式**: 基于WebSocket连接的用户认证
- **数据格式**: JSON
- **字符编码**: UTF-8

## 响应格式

所有API响应都使用统一的格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 具体数据
  }
}
```

## 1. 会话管理 API

### 1.1 获取会话列表

**GET** `/api/sessions/list`

获取系统中的会话列表，支持分页和过滤。

**查询参数**:
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20
- `kefu_id` (可选): 指定客服ID过滤
- `status` (可选): 会话状态过滤 (active, completed, transferred)
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应示例**:
```json
{
  "success": true,
  "message": "获取会话列表成功",
  "data": {
    "sessions": [
      {
        "session_id": "kehu_001:kefu_001",
        "kefu_id": "kefu_001",
        "kefu_name": "客服小王",
        "kehu_id": "kehu_001",
        "kehu_name": "客户张三",
        "status": "active",
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:30:00Z",
        "message_count": 15,
        "last_message": "好的，我会处理这个问题"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

### 1.2 获取会话详情

**GET** `/api/sessions/{session_id}`

获取特定会话的详细信息。

**路径参数**:
- `session_id`: 会话ID (格式: kehu_id:kefu_id)

**响应示例**:
```json
{
  "success": true,
  "message": "获取会话详情成功",
  "data": {
    "session": {
      "session_id": "kehu_001:kefu_001",
      "kefu_id": "kefu_001",
      "kefu_name": "客服小王",
      "kehu_id": "kehu_001",
      "kehu_name": "客户张三",
      "status": "active",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:30:00Z",
      "message_count": 15,
      "last_message": "好的，我会处理这个问题"
    },
    "participants": {
      "kefu": {
        "id": "kefu_001",
        "name": "客服小王",
        "status": "Online",
        "avatar": null
      },
      "kehu": {
        "id": "kehu_001",
        "name": "客户张三",
        "status": "Online",
        "avatar": null
      }
    },
    "statistics": {
      "duration_seconds": 1800,
      "message_count": 15,
      "avg_response_time_seconds": 30
    }
  }
}
```

### 1.3 获取会话消息

**GET** `/api/sessions/{session_id}/messages`

获取会话的消息历史。

**查询参数**:
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认50
- `include_system` (可选): 是否包含系统消息，默认false

**响应示例**:
```json
{
  "success": true,
  "message": "获取会话消息成功",
  "data": {
    "session_id": "kehu_001:kefu_001",
    "messages": [
      {
        "id": "msg_001",
        "from": "kehu_001",
        "to": "kefu_001",
        "content": "你好，我想咨询一下产品信息",
        "content_type": "Text",
        "timestamp": "2024-01-01T10:00:00Z",
        "url": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "has_more": false
    }
  }
}
```

### 1.4 转接会话

**POST** `/api/sessions/{session_id}/transfer`

将会话转接给其他客服。

**请求体**:
```json
{
  "to_kefu_id": "kefu_002",
  "reason": "专业问题需要转接",
  "note": "客户询问技术问题"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "会话已成功转接给客服 kefu_002",
  "data": {
    "session_id": "kehu_001:kefu_001",
    "from_kefu_id": "kefu_001",
    "to_kefu_id": "kefu_002",
    "transfer_time": "2024-01-01T10:30:00Z",
    "reason": "专业问题需要转接",
    "note": "客户询问技术问题"
  }
}
```

### 1.5 结束会话

**POST** `/api/sessions/{session_id}/end`

结束指定会话。

**响应示例**:
```json
{
  "success": true,
  "message": "会话已结束",
  "data": {
    "session_id": "kehu_001:kefu_001",
    "ended_at": "2024-01-01T11:00:00Z",
    "duration_seconds": 3600,
    "message_count": 25
  }
}
```

### 1.6 获取会话统计

**GET** `/api/sessions/{session_id}/statistics`

获取会话的详细统计信息。

**响应示例**:
```json
{
  "success": true,
  "message": "获取会话统计成功",
  "data": {
    "session_id": "kehu_001:kefu_001",
    "statistics": {
      "total_messages": 25,
      "kefu_messages": 12,
      "kehu_messages": 13,
      "avg_response_time_seconds": 45,
      "first_response_time_seconds": 30,
      "duration_seconds": 3600,
      "satisfaction_score": null
    }
  }
}
```

## 2. 客服分配管理 API

### 2.1 获取客服客户列表

**GET** `/api/kefu/{kefu_id}/customers`

获取指定客服的客户列表。

**响应示例**:
```json
{
  "success": true,
  "message": "获取客服客户列表成功",
  "data": {
    "kefu_id": "kefu_001",
    "customers": [
      {
        "id": "kehu_001",
        "name": "客户张三",
        "status": "Online",
        "last_message": "好的，我会处理这个问题",
        "last_activity": "2024-01-01T10:30:00Z",
        "unread_count": 0
      }
    ],
    "total": 1
  }
}
```

### 2.2 获取客服工作负载

**GET** `/api/kefu/{kefu_id}/workload`

获取指定客服的工作负载信息。

**响应示例**:
```json
{
  "success": true,
  "message": "获取客服工作负载成功",
  "data": {
    "workload": {
      "kefu_id": "kefu_001",
      "kefu_name": "客服小王",
      "active_sessions": 3,
      "max_sessions": 5,
      "utilization_rate": 60.0,
      "status": "available",
      "avg_response_time": 30.0,
      "satisfaction_score": 5.0,
      "last_activity": "2024-01-01T10:30:00Z"
    },
    "raw_data": {
      "active_sessions": 3,
      "max_sessions": 5,
      "utilization_rate": 60.0,
      "status": "available"
    }
  }
}
```

### 2.3 客服切换客户

**POST** `/api/kefu/{kefu_id}/switch/{customer_id}`

客服主动切换到指定客户。

**响应示例**:
```json
{
  "success": true,
  "message": "客服 kefu_001 已成功切换到客户 kehu_002",
  "data": {
    "kefu_id": "kefu_001",
    "customer_id": "kehu_002",
    "switch_time": "2024-01-01T10:30:00Z",
    "status": "success"
  }
}
```

### 2.4 获取可用客服列表

**GET** `/api/kefu/available`

获取所有可用的客服列表。

**响应示例**:
```json
{
  "success": true,
  "message": "获取可用客服列表成功",
  "data": {
    "available_kefu": [
      {
        "kefu_id": "kefu_001",
        "kefu_name": "客服小王",
        "current_load": 3,
        "max_capacity": 5,
        "efficiency_score": 14.0,
        "last_activity": "2024-01-01T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### 2.5 获取等待客户列表

**GET** `/api/kefu/waiting`

获取等待分配的客户列表。

**响应示例**:
```json
{
  "success": true,
  "message": "获取等待客户列表成功",
  "data": {
    "waiting_customers": [
      {
        "customer_id": "kehu_003",
        "customer_name": "客户王五",
        "status": "Online",
        "waiting_since": 1704112200,
        "waiting_duration_seconds": 300
      }
    ],
    "total": 1
  }
}
```

### 2.6 为客户分配客服

**POST** `/api/customer/{customer_id}/assign`

为客户分配客服，支持手动指定或自动分配。

**请求体**:
```json
{
  "kefu_id": "kefu_001",  // 可选，不指定则自动分配
  "priority": "high",     // 可选: high, normal, low
  "note": "VIP客户"       // 可选
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "客户 kehu_003 已成功分配给客服 kefu_001",
  "data": {
    "customer_id": "kehu_003",
    "assigned_kefu_id": "kefu_001",
    "assignment_time": "2024-01-01T10:30:00Z",
    "priority": "high",
    "note": "VIP客户",
    "status": "assigned"
  }
}
```

## 3. 用户管理 API

### 3.1 获取用户列表

**GET** `/api/users`

获取系统中的用户列表。

**查询参数**:
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `user_type` (可选): 用户类型过滤 (kefu, kehu)
- `status` (可选): 状态过滤 (online, offline)

### 3.2 创建用户

**POST** `/api/users/create`

创建新用户。

### 3.3 获取用户详情

**GET** `/api/users/{user_id}`

获取指定用户的详细信息。

### 3.4 更新用户

**PUT** `/api/users/{user_id}`

更新用户信息。

### 3.5 删除用户

**DELETE** `/api/users/{user_id}`

删除指定用户。

### 3.6 更新用户权限

**PUT** `/api/users/{user_id}/permissions`

更新用户权限。

### 3.7 更新用户状态

**PUT** `/api/users/{user_id}/status`

更新用户状态。

## 4. 消息管理 API

### 4.1 获取消息列表

**GET** `/api/messages`

获取消息列表。

**查询参数**:
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `from_user` (可选): 发送者过滤
- `to_user` (可选): 接收者过滤
- `content_type` (可选): 消息类型过滤

### 4.2 获取消息详情

**GET** `/api/messages/{message_id}`

获取指定消息的详细信息。

### 4.3 搜索消息

**POST** `/api/messages/search`

搜索消息。

### 4.4 导出消息

**POST** `/api/messages/export`

导出消息数据。

### 4.5 删除消息

**DELETE** `/api/messages/{message_id}`

删除指定消息。

## 5. 统计分析 API

### 5.1 获取概览统计

**GET** `/api/analytics/overview`

获取系统概览统计信息。

### 5.2 获取消息统计

**GET** `/api/analytics/messages`

获取消息相关统计。

### 5.3 获取用户统计

**GET** `/api/analytics/users`

获取用户相关统计。

### 5.4 获取性能统计

**GET** `/api/analytics/performance`

获取系统性能统计。

## 6. 系统管理 API

### 6.1 获取系统日志

**GET** `/api/system/logs`

获取系统日志。

### 6.2 系统备份

**POST** `/api/system/backup`

执行系统备份。

### 6.3 系统维护

**PUT** `/api/system/maintenance`

启用/禁用系统维护模式。

### 6.4 系统健康检查

**GET** `/api/system/health`

检查系统健康状态。

## 7. Redis管理 API

### 7.1 获取Redis状态

**GET** `/api/redis/status`

获取Redis连接状态。

### 7.2 清理Redis数据

**POST** `/api/redis/flush`

清理Redis数据。

### 7.3 查询Redis键

**GET** `/api/redis/keys`

查询Redis键。

**查询参数**:
- `pattern` (可选): 键模式匹配

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error_code": 400,
  "timestamp": "2024-01-01T10:30:00Z"
}
```

### 常见错误码

- `400`: 请求参数错误
- `401`: 未授权访问
- `404`: 资源不存在
- `500`: 服务器内部错误

## 使用示例

### 1. 获取客服客户列表

```bash
curl -X GET "http://localhost:8080/api/kefu/kefu_001/customers"
```

### 2. 为客户分配客服

```bash
curl -X POST "http://localhost:8080/api/customer/kehu_003/assign" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "high",
    "note": "VIP客户"
  }'
```

### 3. 转接会话

```bash
curl -X POST "http://localhost:8080/api/sessions/kehu_001:kefu_001/transfer" \
  -H "Content-Type: application/json" \
  -d '{
    "to_kefu_id": "kefu_002",
    "reason": "专业问题需要转接"
  }'
```

## 注意事项

1. 所有时间戳使用ISO 8601格式 (UTC)
2. 会话ID格式为 `kehu_id:kefu_id`
3. 客服最大负载默认为5个会话
4. 系统支持自动负载均衡和智能分配
5. 所有API都需要有效的WebSocket连接认证

## 更新日志

- **v1.0.0**: 初始版本，包含基础会话管理和客服分配功能
- **v1.1.0**: 添加统计分析和工作负载管理
- **v1.2.0**: 优化分配算法，添加API文档