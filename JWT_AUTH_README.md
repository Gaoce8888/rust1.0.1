# JWT认证系统使用指南

## 概述

本系统已集成JWT（JSON Web Token）认证系统，提供安全的用户认证、WebSocket连接管理、防止重复登录、实时状态更新等功能。

## 功能特性

### 🔐 核心功能
- **JWT Token认证**: 基于JWT的安全认证机制
- **防止重复登录**: 同一用户只能在一个地方登录
- **实时状态更新**: 用户在线状态实时同步
- **WebSocket连接管理**: 集成JWT的WebSocket认证
- **自动下线**: 用户下线后立即释放资源

### 🛡️ 安全特性
- **bcrypt密码加密**: 安全的密码存储
- **Token过期机制**: 24小时自动过期
- **会话管理**: 基于Redis的会话存储
- **活动检测**: 实时更新用户活动时间

## API接口

### 1. 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "user_type": "kefu"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "kefu_001",
      "username": "admin",
      "user_type": "kefu",
      "display_name": "系统管理员",
      "email": "admin@example.com"
    },
    "expires_in": 86400
  }
}
```

### 2. Token验证
```http
GET /auth/validate
Authorization: Bearer <token>
```

### 3. 用户登出
```http
POST /auth/logout
Authorization: Bearer <token>
```

### 4. 获取在线用户
```http
GET /auth/online?user_type=kefu
Authorization: Bearer <token>
```

### 5. 心跳检测
```http
POST /auth/heartbeat
Authorization: Bearer <token>
```

## WebSocket连接

### 连接参数
WebSocket连接支持JWT认证，在连接参数中添加`jwt_token`：

```
ws://localhost:6006/ws?user_id=kefu_001&user_name=admin&user_type=kefu&jwt_token=<token>
```

### 认证流程
1. 用户先通过HTTP API登录获取JWT token
2. 使用token建立WebSocket连接
3. 系统验证token有效性
4. 连接成功后实时更新用户状态

## 默认用户

系统初始化时会创建以下默认用户：

| 用户名 | 密码 | 用户类型 | 显示名称 |
|--------|------|----------|----------|
| admin | admin123 | kefu | 系统管理员 |
| kefu1 | kefu123 | kefu | 客服001 |

## 配置说明

### 环境变量
- `JWT_SECRET`: JWT签名密钥（生产环境必须设置）
- 默认密钥: `your-secret-key-change-in-production`

### Redis存储
- 用户信息存储在Redis Hash中
- 会话信息使用Redis Key-Value存储
- 在线状态实时同步到Redis

## 使用示例

### 1. 启动系统
```bash
cargo run
```

### 2. 测试认证
```bash
./test_jwt_auth.sh
```

### 3. 前端集成
```javascript
// 登录
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123',
    user_type: 'kefu'
  })
});

const { token } = await loginResponse.json();

// WebSocket连接
const ws = new WebSocket(`ws://localhost:6006/ws?user_id=kefu_001&user_name=admin&user_type=kefu&jwt_token=${token}`);

// API调用
const response = await fetch('/api/some-endpoint', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 安全建议

1. **生产环境设置**: 必须设置`JWT_SECRET`环境变量
2. **HTTPS**: 生产环境使用HTTPS传输
3. **Token过期**: 定期刷新token
4. **密码策略**: 使用强密码
5. **监控**: 监控异常登录行为

## 故障排除

### 常见问题

1. **登录失败**
   - 检查用户名密码是否正确
   - 确认用户类型匹配
   - 查看Redis连接状态

2. **Token无效**
   - 检查token是否过期
   - 确认用户是否在线
   - 验证JWT_SECRET配置

3. **WebSocket连接失败**
   - 检查token有效性
   - 确认用户信息匹配
   - 查看网络连接状态

### 日志查看
```bash
# 查看认证相关日志
grep "JWT\|auth\|login" logs/app.log
```

## 扩展功能

系统支持以下扩展：

1. **用户管理**: 添加、删除、修改用户
2. **权限控制**: 基于角色的权限管理
3. **审计日志**: 记录用户操作日志
4. **多租户**: 支持多租户隔离
5. **SSO集成**: 集成单点登录

---

如有问题，请查看系统日志或联系技术支持。