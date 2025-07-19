# API 端点文档

## Base URL
```
http://localhost:3001
```

## WebSocket 端点
```
ws://localhost:3001/ws/{user_id}
```

## 认证相关 API

### 客服登录
```http
POST /api/auth/kefu/login
Content-Type: application/json

{
    "kefu_id": "kefu001",
    "password": "password123"
}

Response:
{
    "success": true,
    "session_id": "sess_123456",
    "kefu_info": {
        "kefu_id": "kefu001",
        "name": "客服小明",
        "status": "online"
    }
}
```

### 客服登出
```http
POST /api/auth/kefu/logout
Content-Type: application/json

{
    "kefu_id": "kefu001"
}
```

### 更新心跳
```http
POST /api/auth/kefu/heartbeat
Content-Type: application/json

{
    "kefu_id": "kefu001"
}
```

## 消息相关 API

### 发送消息
```http
POST /api/messages/send
Content-Type: application/json

{
    "to_user_id": "user123",
    "content": "您好，有什么可以帮助您的吗？",
    "msg_type": "text",
    "metadata": {
        "sender_name": "客服小明"
    }
}

Response:
{
    "message_id": "msg_789012",
    "timestamp": "2024-01-01T12:00:00Z",
    "status": "sent"
}
```

### 获取消息历史
```http
GET /api/messages/history/{user_id}?page=1&page_size=20

Response:
{
    "messages": [
        {
            "message_id": "msg_123",
            "from_user_id": "user123",
            "to_user_id": "kefu001",
            "content": "你好",
            "msg_type": "text",
            "timestamp": "2024-01-01T11:50:00Z"
        }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
}
```

### 获取最新消息
```http
GET /api/messages/latest?count=10

Response:
{
    "messages": [...]
}
```

## 用户管理 API

### 创建用户
```http
POST /api/users
Content-Type: application/json

{
    "user_id": "user456",
    "username": "张三",
    "email": "zhangsan@example.com",
    "user_type": "customer"
}
```

### 获取用户信息
```http
GET /api/users/{user_id}

Response:
{
    "user_id": "user456",
    "username": "张三",
    "email": "zhangsan@example.com",
    "user_type": "customer",
    "created_at": "2024-01-01T10:00:00Z",
    "last_active": "2024-01-01T12:00:00Z"
}
```

### 更新用户信息
```http
PUT /api/users/{user_id}
Content-Type: application/json

{
    "username": "张三更新",
    "email": "zhangsan_new@example.com"
}
```

### 获取用户列表
```http
GET /api/users?page=1&page_size=20&user_type=customer

Response:
{
    "users": [...],
    "total": 150,
    "page": 1,
    "page_size": 20
}
```

### 获取在线用户
```http
GET /api/users/online

Response:
{
    "online_users": [
        {
            "user_id": "user123",
            "username": "李四",
            "last_active": "2024-01-01T12:00:00Z"
        }
    ],
    "total": 25
}
```

## 文件管理 API

### 上传文件
```http
POST /api/files/upload
Content-Type: multipart/form-data

Form Data:
- file: [二进制文件]
- category: "image"

Response:
{
    "file_id": "file_123456",
    "url": "/api/files/file_123456",
    "filename": "example.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg"
}
```

### 下载文件
```http
GET /api/files/{file_id}

Response: 二进制文件流
```

### 获取文件信息
```http
GET /api/files/{file_id}/info

Response:
{
    "file_id": "file_123456",
    "filename": "example.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg",
    "upload_time": "2024-01-01T10:00:00Z",
    "uploader_id": "user123"
}
```

## 会话管理 API

### 创建会话
```http
POST /api/sessions
Content-Type: application/json

{
    "user_id": "user123",
    "session_type": "customer_service"
}

Response:
{
    "session_id": "sess_789012",
    "created_at": "2024-01-01T12:00:00Z",
    "status": "active"
}
```

### 获取会话详情
```http
GET /api/sessions/{session_id}

Response:
{
    "session_id": "sess_789012",
    "user_id": "user123",
    "kefu_id": "kefu001",
    "status": "active",
    "created_at": "2024-01-01T12:00:00Z",
    "messages_count": 15
}
```

### 获取用户会话列表
```http
GET /api/sessions/user/{user_id}?status=active

Response:
{
    "sessions": [...],
    "total": 5
}
```

### 获取活跃会话
```http
GET /api/sessions/active

Response:
{
    "active_sessions": [...],
    "total": 30
}
```

## 系统状态 API（部分可用）

### 系统健康检查
```http
GET /api/health

Response:
{
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "services": {
        "redis": "connected",
        "websocket": "running"
    }
}
```

### WebSocket 连接统计
```http
GET /api/stats/websocket

Response:
{
    "total_connections": 150,
    "active_connections": 120,
    "rooms": {
        "general": 50,
        "support": 70
    }
}
```

## 数据分析 API（部分可用）

### 消息统计
```http
GET /api/analytics/messages?start_date=2024-01-01&end_date=2024-01-31

Response:
{
    "total_messages": 10000,
    "daily_average": 322,
    "peak_hour": "14:00",
    "message_types": {
        "text": 8000,
        "image": 1500,
        "file": 500
    }
}
```

### 用户活跃度
```http
GET /api/analytics/users?period=7d

Response:
{
    "active_users": 500,
    "new_users": 50,
    "returning_users": 450,
    "average_session_duration": "15m"
}
```

## 错误响应格式

所有API在发生错误时返回统一的错误格式：

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "错误描述",
        "details": {
            "field": "具体错误信息"
        }
    },
    "timestamp": "2024-01-01T12:00:00Z"
}
```

### 常见错误代码
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 禁止访问
- `404` - 资源不存在
- `429` - 请求过于频繁
- `500` - 服务器内部错误

## 请求认证

需要认证的API请求应包含以下header：

```http
Authorization: Bearer {session_token}
X-User-ID: {user_id}
```

## 分页参数

支持分页的API接受以下查询参数：
- `page` - 页码，从1开始
- `page_size` - 每页数量，默认20，最大100

## WebSocket 消息格式

### 客户端发送
```json
{
    "type": "message",
    "data": {
        "to_user_id": "user123",
        "content": "Hello",
        "msg_type": "text"
    }
}
```

### 服务端推送
```json
{
    "type": "message",
    "data": {
        "message_id": "msg_123",
        "from_user_id": "kefu001",
        "content": "您好",
        "timestamp": "2024-01-01T12:00:00Z"
    }
}
```

### 系统通知
```json
{
    "type": "notification",
    "data": {
        "event": "user_online",
        "user_id": "user123",
        "timestamp": "2024-01-01T12:00:00Z"
    }
}
```