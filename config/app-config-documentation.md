# 应用配置文件说明 (app-config.json)

此文档详细说明了 `app-config.json` 配置文件中各个配置项的含义和用途。

## 1. 应用程序基本信息配置 (app)

```json
"app": {
  "name": "企业级客服系统",      // 应用程序名称
  "version": "2.1.0",          // 应用程序版本号
  "environment": "production"  // 运行环境
}
```

**详细说明：**
- `name`: 应用程序的显示名称
- `version`: 应用程序的版本号，使用语义化版本格式
- `environment`: 运行环境，可选值：
  - `production`: 生产环境
  - `development`: 开发环境
  - `test`: 测试环境

## 2. 服务器配置 (server)

```json
"server": {
  "host": "0.0.0.0",           // 服务器监听地址
  "port": 6006,                // 服务器监听端口
  "cors": {                    // 跨域资源共享配置
    "enabled": true,           // 是否启用CORS
    "origins": [...],          // 允许的跨域源
    "methods": [...],          // 允许的HTTP方法
    "headers": [...]           // 允许的HTTP头部
  }
}
```

**详细说明：**
- `host`: 服务器监听地址，`0.0.0.0` 表示监听所有网络接口
- `port`: 服务器监听端口，默认6006
- `cors`: 跨域资源共享配置
  - `enabled`: 是否启用CORS支持
  - `origins`: 允许跨域请求的源地址列表
  - `methods`: 允许的HTTP方法列表
  - `headers`: 允许的HTTP头部列表

## 3. 前端配置 (frontend)

```json
"frontend": {
  "host": "localhost",         // 前端服务器主机地址
  "port": 6006,                // 前端服务器端口
  "apiUrl": "http://localhost:6006/api",  // API接口地址
  "wsUrl": "ws://localhost:6006/ws",      // WebSocket连接地址
  "features": {                // 前端功能开关
    "imageUpload": true,        // 图片上传功能
    "audioNotifications": true, // 音频通知功能
    "messageCompression": true, // 消息压缩功能
    "virtualScrolling": true,   // 虚拟滚动功能
    "offlineSupport": true      // 离线支持功能
  },
  "upload": {                  // 文件上传配置
    "maxFileSize": 10485760,    // 最大文件大小（字节）
    "allowedTypes": [...],      // 允许的文件类型
    "compressionEnabled": true, // 是否启用图片压缩
    "compressionQuality": 0.8,  // 压缩质量（0-1）
    "maxWidth": 1920,          // 最大宽度（像素）
    "maxHeight": 1080          // 最大高度（像素）
  }
}
```

**详细说明：**
- `host`: 前端服务器主机地址
- `port`: 前端服务器端口
- `apiUrl`: 后端API接口的完整地址
- `wsUrl`: WebSocket连接地址
- `features`: 前端功能开关，可以动态启用/禁用各种功能
- `upload`: 文件上传相关配置
  - `maxFileSize`: 最大文件大小限制（10MB = 10485760字节）
  - `allowedTypes`: 允许上传的文件MIME类型
  - `compressionEnabled`: 是否启用图片压缩
  - `compressionQuality`: 压缩质量，范围0-1，1为最高质量
  - `maxWidth`/`maxHeight`: 图片最大尺寸限制

## 4. WebSocket配置 (websocket)

```json
"websocket": {
  "heartbeatInterval": 30000,    // 心跳间隔（毫秒）
  "reconnectInterval": 5000,     // 重连间隔（毫秒）
  "maxReconnectAttempts": 5,     // 最大重连尝试次数
  "messageTimeout": 10000,       // 消息超时时间（毫秒）
  "maxMessageSize": 1048576      // 最大消息大小（字节）
}
```

**详细说明：**
- `heartbeatInterval`: 心跳包发送间隔，用于保持连接活跃
- `reconnectInterval`: 连接断开后重连的间隔时间
- `maxReconnectAttempts`: 最大重连尝试次数，超过后停止重连
- `messageTimeout`: 消息发送超时时间
- `maxMessageSize`: 单个消息最大大小限制（1MB = 1048576字节）

## 5. Redis缓存配置 (redis)

```json
"redis": {
  "host": "127.0.0.1",         // Redis服务器地址
  "port": 6379,                // Redis服务器端口
  "password": "",              // Redis密码
  "database": 0,               // Redis数据库编号
  "pool": {                    // 连接池配置
    "maxSize": 20,             // 连接池最大连接数
    "minIdle": 5,              // 连接池最小空闲连接数
    "maxLifetime": 3600,       // 连接最大生存时间（秒）
    "idleTimeout": 300         // 空闲连接超时时间（秒）
  }
}
```

**详细说明：**
- `host`: Redis服务器地址
- `port`: Redis服务器端口
- `password`: Redis密码，空字符串表示无密码
- `database`: Redis数据库编号（0-15）
- `pool`: 连接池配置，用于优化连接管理
  - `maxSize`: 连接池最大连接数
  - `minIdle`: 连接池最小空闲连接数
  - `maxLifetime`: 连接最大生存时间
  - `idleTimeout`: 空闲连接超时时间

## 6. 存储配置 (storage)

```json
"storage": {
  "dataDir": "./data",            // 数据目录路径
  "blobsDir": "./data/blobs",     // 二进制文件存储目录
  "snapshotInterval": 300,        // 快照间隔（秒）
  "maxSnapshotSize": 104857600    // 最大快照大小（字节）
}
```

**详细说明：**
- `dataDir`: 主数据目录路径
- `blobsDir`: 二进制文件（如图片、文档）存储目录
- `snapshotInterval`: 数据快照创建间隔
- `maxSnapshotSize`: 单个快照文件最大大小限制（100MB）

## 7. 安全配置 (security)

```json
"security": {
  "jwtSecret": "your-secret-key-here",  // JWT密钥
  "jwtExpiry": 86400,                   // JWT过期时间（秒）
  "bcryptRounds": 10,                   // bcrypt加密轮数
  "rateLimiting": {                     // 速率限制配置
    "enabled": true,                    // 是否启用速率限制
    "windowMs": 60000,                  // 时间窗口（毫秒）
    "maxRequests": 100                  // 最大请求数
  }
}
```

**详细说明：**
- `jwtSecret`: JWT令牌签名密钥（生产环境必须修改）
- `jwtExpiry`: JWT令牌过期时间（24小时 = 86400秒）
- `bcryptRounds`: 密码哈希加密轮数，越高越安全但越慢
- `rateLimiting`: API速率限制配置
  - `enabled`: 是否启用速率限制
  - `windowMs`: 时间窗口长度
  - `maxRequests`: 时间窗口内最大请求数

## 8. 日志配置 (logging)

```json
"logging": {
  "level": "info",              // 日志级别
  "format": "json",             // 日志格式
  "file": {                     // 文件日志配置
    "enabled": true,            // 是否启用文件日志
    "path": "./logs/app.log",   // 日志文件路径
    "maxSize": 10485760,        // 单个日志文件最大大小（字节）
    "maxFiles": 5               // 保留的日志文件数量
  }
}
```

**详细说明：**
- `level`: 日志级别，可选值：
  - `error`: 仅记录错误
  - `warn`: 记录警告和错误
  - `info`: 记录信息、警告和错误
  - `debug`: 记录所有日志
- `format`: 日志格式，可选值：
  - `json`: JSON格式
  - `text`: 纯文本格式
- `file`: 文件日志配置
  - `enabled`: 是否启用文件日志
  - `path`: 日志文件保存路径
  - `maxSize`: 单个日志文件最大大小（10MB）
  - `maxFiles`: 日志文件轮转保留数量

## 9. 性能优化配置 (performance)

```json
"performance": {
  "messageCache": {             // 消息缓存配置
    "enabled": true,            // 是否启用消息缓存
    "maxSize": 1000,            // 缓存最大条目数
    "ttl": 3600                 // 缓存生存时间（秒）
  },
  "compression": {              // 压缩配置
    "enabled": true,            // 是否启用压缩
    "threshold": 1024           // 压缩阈值（字节）
  }
}
```

**详细说明：**
- `messageCache`: 消息缓存配置，用于提高消息检索性能
  - `enabled`: 是否启用消息缓存
  - `maxSize`: 缓存最大条目数
  - `ttl`: 缓存项生存时间（1小时 = 3600秒）
- `compression`: 数据压缩配置
  - `enabled`: 是否启用数据压缩
  - `threshold`: 压缩阈值，超过此大小的数据将被压缩

## 配置文件使用说明

1. **修改配置后需要重启应用程序**才能生效
2. **生产环境部署前**，务必修改以下配置项：
   - `security.jwtSecret`: 使用强随机字符串
   - `redis.password`: 设置Redis密码
   - `server.cors.origins`: 限制为实际使用的域名
3. **性能调优建议**：
   - 根据实际负载调整Redis连接池大小
   - 根据服务器性能调整WebSocket配置
   - 根据存储空间调整日志轮转配置
4. **安全建议**：
   - 定期更新JWT密钥
   - 根据实际需求调整速率限制
   - 启用HTTPS（需要额外的反向代理配置） 