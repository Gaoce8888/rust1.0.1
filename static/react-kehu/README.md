# 客服系统客户端

这是一个基于 React + TypeScript + NextUI 的现代化客服系统客户端，提供实时聊天功能。

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- 后端服务运行在 `http://localhost:6006`

### 安装和运行

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **访问应用**
打开浏览器访问 `http://localhost:8004`

### 使用构建脚本

```bash
# 安装依赖并启动开发服务器
./build-client.sh

# 构建生产版本
./build-client.sh --build
```

## 📁 项目结构

```
src/
├── main.tsx              # 应用入口
├── App.tsx               # 主应用组件
├── index.css             # 全局样式
└── services/
    └── enterprise-adapter.ts  # 企业级适配器
```

## 🎨 功能特性

### ✅ 已实现功能

- **用户认证**: 支持客户和客服角色登录
- **实时聊天**: WebSocket 实时消息传递
- **消息状态**: 发送、已读状态跟踪
- **响应式设计**: 支持桌面和移动端
- **现代化UI**: 基于 NextUI 的美观界面
- **连接状态**: 实时显示连接状态
- **自动重连**: 网络断开自动重连
- **文件上传**: 支持文件附件功能
- **表情支持**: 内置表情选择器

### 🔧 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: NextUI (HeroUI)
- **样式**: Tailwind CSS
- **构建工具**: Vite
- **图标**: Iconify
- **状态管理**: React Hooks
- **网络通信**: WebSocket + Fetch API

## 🔌 配置说明

### 后端连接配置

在 `src/App.tsx` 中修改配置：

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

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:6006
VITE_WS_URL=ws://localhost:6006/ws
VITE_DEBUG=true
```

## 🎯 使用指南

### 登录系统

1. 打开应用后会自动显示登录界面
2. 输入用户名和密码
3. 选择角色（客户/客服）
4. 点击登录按钮

### 开始聊天

1. 登录成功后进入聊天界面
2. 在输入框中输入消息
3. 按 Enter 发送消息
4. 支持 Shift + Enter 换行

### 功能操作

- **发送文件**: 点击回形针图标选择文件
- **表情**: 点击表情图标选择表情
- **设置**: 点击右上角设置图标
- **退出**: 点击右上角退出按钮

## 🛠️ 开发指南

### 添加新功能

1. 在 `src/` 目录下创建新组件
2. 在 `services/` 目录下添加相关服务
3. 更新类型定义
4. 测试功能

### 样式定制

- 修改 `src/index.css` 中的 CSS 变量
- 使用 Tailwind CSS 类名
- 支持深色模式

### 构建部署

```bash
# 开发构建
npm run build

# 预览构建结果
npm run preview
```

构建后的文件位于 `dist/` 目录，可直接部署到静态文件服务器。

## 🔍 调试

### 开发工具

- 打开浏览器开发者工具
- 查看 Console 日志
- 检查 Network 请求
- 使用 React DevTools

### 常见问题

1. **连接失败**: 检查后端服务是否运行
2. **消息不显示**: 检查 WebSocket 连接状态
3. **样式异常**: 清除浏览器缓存

## 📝 API 文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 消息接口

- `GET /api/messages/:targetUserId` - 获取消息历史
- `POST /api/upload` - 文件上传

### WebSocket 消息

- `message` - 发送/接收消息
- `status` - 连接状态更新
- `typing` - 输入状态

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License

## 🆘 支持

如有问题，请查看：
- [快速开始指南](./快速开始指南.md)
- [企业级适配指南](./企业级适配指南.md)
- [客户端UI文档](./客户端UI文档.md)