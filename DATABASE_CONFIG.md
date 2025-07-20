# 数据库配置文档

## 📋 概述

本系统使用**双数据库架构**：
- **Redis**: 用于缓存、会话管理、消息队列和实时数据
- **Sled (本地存储)**: 用于持久化消息、会话和用户数据

## 🔧 Redis 配置

### 1. 基础配置文件

**文件位置**: `config/redis_pool.toml`

```toml
[redis_pool]
# Redis服务器连接URL
url = "redis://127.0.0.1:6379"

# 连接池配置
max_size = 32          # 最大连接数
min_idle = 8           # 最小空闲连接数
max_lifetime = 3600    # 连接最大生存时间(秒)
idle_timeout = 600     # 空闲连接超时时间(秒)
connection_timeout = 5 # 连接获取超时时间(秒)
recycle_timeout = 2    # 连接回收超时时间(秒)

[monitoring]
enable_detailed_metrics = true
health_check_interval = 30
pool_utilization_warning_threshold = 80.0
acquire_time_warning_threshold = 100.0

[performance]
enable_connection_warmup = true
enable_adaptive_sizing = true
enable_batch_operations = true
```

### 2. 应用配置中的Redis设置

**文件位置**: `config/app-config.json`

```json
{
  "redis": {
    "host": "127.0.0.1",
    "port": 6379,
    "password": "",
    "database": 0,
    "pool": {
      "maxSize": 20,
      "minIdle": 5,
      "maxLifetime": 3600,
      "idleTimeout": 300
    }
  }
}
```

### 3. 环境变量配置

**文件位置**: `config/environment.example`

```bash
# Redis配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. Redis 数据存储结构

#### 会话管理
```
session:{session_id} -> Session JSON
user_sessions:{user_id} -> [session_ids]
active_sessions -> Set of active session IDs
```

#### 消息队列
```
message_queue:{session_id} -> List of message IDs
message:{message_id} -> Message JSON
user_messages:{user1}:{user2} -> [message_ids]
```

#### 客服分配
```
kefu_workload:{kefu_id} -> Workload JSON
waiting_customers -> Set of waiting customer IDs
kefu_customers:{kefu_id} -> Set of assigned customer IDs
```

#### 缓存
```
user_cache:{user_id} -> User JSON
session_cache:{session_id} -> Session JSON
message_cache:{message_id} -> Message JSON
```

## 💾 本地存储配置 (Sled)

### 1. 存储路径配置

**文件位置**: `config/app-config.json`

```json
{
  "storage": {
    "dataDir": "./data",
    "blobsDir": "./data/blobs",
    "snapshotInterval": 300,
    "maxSnapshotSize": 104857600
  }
}
```

### 2. 数据库结构

#### 目录结构
```
./data/
├── sled_db/           # Sled数据库文件
│   ├── messages/      # 消息存储
│   ├── sessions/      # 会话存储
│   ├── user_messages/ # 用户消息索引
│   └── general/       # 通用键值存储
└── blobs/             # 二进制文件存储
    ├── images/        # 图片文件
    └── documents/     # 文档文件
```

#### 数据表结构

**messages 表**
- Key: `message_id`
- Value: `ChatMessage JSON`

**sessions 表**
- Key: `session_id`
- Value: `Session JSON`

**user_messages 表**
- Key: `{user1}:{user2}`
- Value: `[message_ids]`

**general 表**
- Key: `任意字符串`
- Value: `任意字符串`

## 🚀 部署配置

### 1. 开发环境

```bash
# 启动Redis服务器
redis-server

# 设置环境变量
cp config/environment.example config/environment
# 编辑 config/environment 文件

# 启动应用
cargo run
```

### 2. 生产环境

#### Redis 生产配置

**redis.conf**
```conf
# 网络配置
bind 127.0.0.1
port 6379
timeout 300

# 内存配置
maxmemory 2gb
maxmemory-policy allkeys-lru

# 持久化配置
save 900 1
save 300 10
save 60 10000

# 安全配置
requirepass your-strong-password
```

#### 应用生产配置

**config/app-config.production.json**
```json
{
  "redis": {
    "host": "127.0.0.1",
    "port": 6379,
    "password": "your-strong-password",
    "database": 0,
    "pool": {
      "maxSize": 50,
      "minIdle": 10,
      "maxLifetime": 3600,
      "idleTimeout": 300
    }
  },
  "storage": {
    "dataDir": "/var/lib/customer-service/data",
    "blobsDir": "/var/lib/customer-service/data/blobs",
    "snapshotInterval": 300,
    "maxSnapshotSize": 104857600
  }
}
```

## 🔍 监控和维护

### 1. Redis 监控

```bash
# 连接Redis CLI
redis-cli

# 查看内存使用
INFO memory

# 查看连接数
INFO clients

# 查看键数量
DBSIZE

# 查看慢查询
SLOWLOG GET 10
```

### 2. 本地存储监控

```rust
// 获取存储统计信息
let stats = storage.get_stats()?;
println!("消息数量: {}", stats.message_count);
println!("会话数量: {}", stats.session_count);
println!("数据库大小: {} bytes", stats.db_size_bytes);

// 优化数据库
let result = storage.optimize_database()?;
println!("清理孤立消息: {}", result.orphaned_messages_deleted);
println!("清理过期会话: {}", result.expired_sessions_deleted);
println!("节省空间: {} bytes", result.space_saved_bytes);
```

### 3. 性能优化建议

#### Redis 优化
- 根据并发用户数调整连接池大小
- 启用Redis持久化避免数据丢失
- 设置合理的内存限制和淘汰策略
- 定期清理过期数据

#### 本地存储优化
- 定期运行数据库优化
- 监控磁盘空间使用
- 设置合理的快照间隔
- 清理孤立消息和过期会话

## 🔧 故障排除

### 1. Redis 连接问题

```bash
# 检查Redis服务状态
systemctl status redis

# 检查端口监听
netstat -tlnp | grep 6379

# 测试连接
redis-cli ping
```

### 2. 存储空间问题

```bash
# 检查磁盘空间
df -h

# 检查数据目录大小
du -sh ./data

# 清理日志文件
find ./logs -name "*.log" -mtime +7 -delete
```

### 3. 性能问题

```bash
# 检查Redis性能
redis-cli --latency

# 检查系统资源
top
htop

# 检查网络连接
netstat -an | grep 6006
```

## 📊 配置参数说明

### Redis 连接池参数

| 参数 | 默认值 | 说明 | 建议值 |
|------|--------|------|--------|
| max_size | 32 | 最大连接数 | 50-200 (生产) |
| min_idle | 8 | 最小空闲连接数 | max_size的25%-50% |
| max_lifetime | 3600 | 连接最大生存时间(秒) | 3600 |
| idle_timeout | 600 | 空闲连接超时时间(秒) | 600 |
| connection_timeout | 5 | 连接获取超时时间(秒) | 5-10 |

### 存储参数

| 参数 | 默认值 | 说明 | 建议值 |
|------|--------|------|--------|
| snapshotInterval | 300 | 快照间隔(秒) | 300-600 |
| maxSnapshotSize | 104857600 | 最大快照大小(字节) | 100MB-1GB |
| maxFileSize | 10485760 | 最大文件大小(字节) | 10MB-50MB |

## 🔐 安全配置

### 1. Redis 安全

```conf
# 设置强密码
requirepass your-very-strong-password

# 禁用危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# 限制网络访问
bind 127.0.0.1
```

### 2. 应用安全

```json
{
  "security": {
    "jwtSecret": "your-very-strong-jwt-secret",
    "jwtExpiry": 86400,
    "bcryptRounds": 12,
    "rateLimiting": {
      "enabled": true,
      "windowMs": 60000,
      "maxRequests": 100
    }
  }
}
```

## 📝 配置检查清单

### 部署前检查
- [ ] Redis 服务已启动并可访问
- [ ] Redis 密码已设置（生产环境）
- [ ] 数据目录已创建并有写权限
- [ ] 环境变量已正确配置
- [ ] 配置文件已根据环境调整
- [ ] 防火墙规则已配置
- [ ] 监控工具已部署

### 运行时检查
- [ ] Redis 连接池状态正常
- [ ] 本地存储空间充足
- [ ] 日志文件正常写入
- [ ] 性能指标在正常范围
- [ ] 备份策略已实施
- [ ] 错误率在可接受范围

---

**注意**: 生产环境部署前，请务必修改所有默认密码和安全配置！