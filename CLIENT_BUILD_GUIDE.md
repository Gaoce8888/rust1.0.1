# 客服系统客户端构建指南

本指南将帮助您构建和运行客服系统的前端客户端。

## 📋 项目概述

客服系统包含两个前端客户端：

- **客服端** (`static/react-kefu`) - 客服人员使用的界面
- **客户端** (`static/react-kehu`) - 客户使用的界面

## 🚀 快速开始

### 环境要求

- **Node.js** 16.0 或更高版本
- **npm** 或 **yarn** 包管理器
- **后端服务** 运行在 `http://localhost:6006`

### 一键构建所有客户端

```bash
# 启动开发服务器
./build-all-clients.sh

# 构建生产版本
./build-all-clients.sh --build
```

### 分别构建

#### 构建客服端

```bash
cd static/react-kefu
./build-kefu.sh          # 开发模式
./build-kefu.sh --build  # 生产构建
```

#### 构建客户端

```bash
cd static/react-kehu
./build-client.sh          # 开发模式
./build-client.sh --build  # 生产构建
```

## 📱 访问地址

构建完成后，可以通过以下地址访问：

- **客服端**: http://localhost:6005
- **客户端**: http://localhost:8004

## 🏗️ 项目结构

```
static/
├── react-kefu/           # 客服端
│   ├── src/             # 源代码
│   ├── package.json     # 依赖配置
│   ├── vite.config.js   # Vite配置
│   └── build-kefu.sh    # 构建脚本
└── react-kehu/          # 客户端
    ├── src/             # 源代码
    ├── package.json     # 依赖配置
    ├── vite.config.ts   # Vite配置
    ├── tsconfig.json    # TypeScript配置
    └── build-client.sh  # 构建脚本
```

## 🎨 技术栈

### 客服端 (React + JavaScript)
- **框架**: React 18
- **构建工具**: Vite
- **UI组件**: NextUI (HeroUI)
- **样式**: Tailwind CSS
- **图标**: Iconify

### 客户端 (React + TypeScript)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: NextUI (HeroUI)
- **样式**: Tailwind CSS
- **图标**: Iconify
- **状态管理**: React Hooks

## 🔧 配置说明

### 后端连接配置

两个客户端都需要配置后端服务地址：

```typescript
const CONFIG = {
  apiUrl: 'http://localhost:6006',    // 后端API地址
  wsUrl: 'ws://localhost:6006/ws',    // WebSocket地址
  debug: true,                        // 调试模式
  autoReconnect: true,                // 自动重连
  reconnectInterval: 5000             // 重连间隔(ms)
};
```

### 环境变量

可以创建 `.env` 文件来配置环境变量：

```env
VITE_API_URL=http://localhost:6006
VITE_WS_URL=ws://localhost:6006/ws
VITE_DEBUG=true
```

## 🎯 功能特性

### 通用功能
- ✅ 用户认证和登录
- ✅ 实时WebSocket通信
- ✅ 消息发送和接收
- ✅ 消息状态跟踪
- ✅ 文件上传支持
- ✅ 响应式设计
- ✅ 连接状态指示
- ✅ 自动重连机制

### 客服端特有功能
- 📊 客户列表管理
- 🔄 会话切换
- 📈 工作统计
- ⚙️ 客服设置

### 客户端特有功能
- 💬 与客服实时对话
- 📎 文件附件
- 😊 表情支持
- 🔒 端到端加密提示

## 🛠️ 开发指南

### 添加新功能

1. **创建组件**: 在 `src/` 目录下创建新组件
2. **添加服务**: 在 `services/` 目录下添加相关服务
3. **更新类型**: 如果是TypeScript项目，更新类型定义
4. **测试功能**: 确保功能正常工作

### 样式定制

- 修改 `src/index.css` 中的CSS变量
- 使用Tailwind CSS类名
- 支持深色模式切换

### 构建优化

```bash
# 分析构建大小
npm run build -- --analyze

# 预览构建结果
npm run preview
```

## 🔍 调试指南

### 开发工具

1. **浏览器开发者工具**
   - Console: 查看日志和错误
   - Network: 检查API请求
   - Elements: 调试DOM结构

2. **React DevTools**
   - 组件状态检查
   - Props传递调试
   - 性能分析

### 常见问题

#### 连接问题
```bash
# 检查后端服务状态
curl http://localhost:6006/health

# 检查WebSocket连接
wscat -c ws://localhost:6006/ws
```

#### 构建问题
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查依赖冲突
npm ls
```

#### 端口占用
```bash
# 查看端口占用
lsof -i :6005
lsof -i :8004

# 杀死进程
kill -9 <PID>
```

## 📦 部署指南

### 生产构建

```bash
# 构建所有客户端
./build-all-clients.sh --build
```

### 静态文件部署

构建完成后，`dist/` 目录包含所有静态文件：

```bash
# 使用nginx部署
sudo cp -r static/react-kefu/dist/* /var/www/kefu/
sudo cp -r static/react-kehu/dist/* /var/www/kehu/

# 配置nginx
sudo nano /etc/nginx/sites-available/kefu-system
```

### Docker部署

```dockerfile
# Dockerfile示例
FROM nginx:alpine
COPY static/react-kefu/dist /usr/share/nginx/html/kefu
COPY static/react-kehu/dist /usr/share/nginx/html/kehu
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 测试指南

### 单元测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

### 集成测试

```bash
# 启动测试环境
npm run test:integration

# 端到端测试
npm run test:e2e
```

### 性能测试

```bash
# 构建性能分析
npm run build -- --analyze

# 运行时性能
npm run dev -- --profile
```

## 📚 相关文档

- [客服端文档](./static/react-kefu/README.md)
- [客户端文档](./static/react-kehu/README.md)
- [API文档](./API_DOCUMENTATION.md)
- [部署指南](./DEPLOYMENT_PACKAGE_GUIDE.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 发起 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题，请：

1. 查看 [常见问题](./FAQ.md)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)
4. 联系项目维护者

---

**注意**: 确保后端服务正在运行，否则客户端将无法正常工作。