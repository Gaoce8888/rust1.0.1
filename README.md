# Rust 1.0.1 - 客服系统配置

这是一个基于 Rust 的实时客服系统，版本 1.0.1。

## 项目结构

```
├── src/                    # Rust 源代码
│   ├── ai/                # AI 相关功能模块
│   ├── auth/              # 认证授权模块
│   ├── handlers/          # HTTP 请求处理器
│   ├── routes/            # 路由定义
│   ├── server/            # 服务器启动配置
│   ├── types/             # 类型定义
│   └── errors/            # 错误处理
├── static/                # 静态资源文件
│   ├── react-kefu/        # 客服前端界面
│   └── react-kehu/        # 客户前端界面
├── config/                # 配置文件
├── docs/                  # 文档
├── tests/                 # 测试文件
├── logs/                  # 日志文件
└── data/                  # 数据文件
```

## 主要功能

- **WebSocket 实时通信**: 支持客服与客户之间的实时消息传递
- **Redis 缓存**: 使用 Redis 进行会话管理和消息缓存
- **语音消息**: 支持语音消息的录制和播放
- **AI 功能**: 包括语音识别、意图识别和翻译功能
- **负载均衡**: 内置负载均衡器支持多实例部署
- **健康监控**: 系统健康状态监控
- **文件管理**: 支持文件上传和管理
- **Swagger API 文档**: 自动生成的 API 文档

## 技术栈

- **后端**: Rust + Actix-Web
- **前端**: React + TypeScript
- **数据库**: Sled DB (嵌入式) + Redis
- **通信**: WebSocket
- **构建工具**: Cargo

## 部署要求

- Rust 1.70+
- Node.js 16+
- Redis 6+

## 快速开始

1. 克隆仓库
```bash
git clone https://github.com/Gaoce8888/rust1.0.1.git
cd rust1.0.1
```

2. 安装依赖
```bash
cargo build --release
cd static/react-kefu && npm install
cd ../react-kehu && npm install
```

3. 运行服务
```bash
cargo run --release
```

## 配置说明

主要配置文件位于 `config/` 目录：
- `app-config.json` - 应用主配置
- `redis_pool.toml` - Redis 连接池配置
- `message_system.toml` - 消息系统配置

## 许可证

此项目使用 MIT 许可证。
