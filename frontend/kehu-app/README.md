# 客户端应用 (kehu-app)

现代化的企业级客服系统客户端应用，基于 React + TypeScript + Vite 构建。

## 🚀 功能特性

### 核心功能
- ✅ **实时聊天** - 基于 WebSocket 的实时通信
- ✅ **文件传输** - 支持图片、文档等多种文件格式
- ✅ **消息状态** - 发送、已读、送达状态显示
- ✅ **打字指示器** - 实时显示对方输入状态
- ✅ **会话管理** - 创建、加入、关闭会话
- ✅ **历史记录** - 自动保存聊天记录

### 企业级特性
- ✅ **响应式设计** - 适配桌面和移动设备
- ✅ **深色模式** - 支持明暗主题切换
- ✅ **国际化** - 支持中文本地化
- ✅ **状态管理** - 基于 Zustand 的高效状态管理
- ✅ **错误处理** - 全局错误边界和错误处理
- ✅ **性能优化** - 代码分割、懒加载、缓存优化
- ✅ **类型安全** - 完整的 TypeScript 类型定义

### 技术特性
- ✅ **现代化 UI** - HeroUI + Tailwind CSS
- ✅ **动画效果** - Framer Motion 流畅动画
- ✅ **表单处理** - React Hook Form 表单验证
- ✅ **数据获取** - TanStack Query 数据缓存
- ✅ **实时通信** - Socket.io 客户端
- ✅ **工具函数** - 丰富的实用工具函数

## 🛠️ 技术栈

### 核心技术
- **React 18** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架

### UI 组件
- **HeroUI** - 现代化 React 组件库
- **Framer Motion** - 流畅动画库
- **Iconify** - 丰富的图标库

### 状态管理
- **Zustand** - 轻量级状态管理
- **TanStack Query** - 服务器状态管理
- **React Hook Form** - 表单状态管理

### 实用工具
- **date-fns** - 日期处理
- **clsx** - 条件类名
- **react-hot-toast** - 通知组件

## 📦 安装和运行

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖
```bash
npm install
# 或
yarn install
```

### 开发环境
```bash
npm run dev
# 或
yarn dev
```

应用将在 `http://localhost:6006` 启动

### 构建生产版本
```bash
npm run build
# 或
yarn build
```

### 预览生产版本
```bash
npm run preview
# 或
yarn preview
```

## ⚙️ 配置

### 环境变量
创建 `.env` 文件并配置以下变量：

```env
# API 配置
VITE_API_BASE_URL=http://localhost:3030
VITE_WS_URL=ws://localhost:3030

# 应用配置
VITE_APP_NAME=客户服务系统
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_NOTIFICATIONS=true

# 文件上传
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/*,application/pdf
```

### 代理配置
Vite 开发服务器已配置代理：
- `/api/*` → `http://localhost:3030`
- `/ws` → `ws://localhost:3030`

## 📁 项目结构

```
src/
├── components/          # React 组件
│   ├── ChatInterface.tsx    # 聊天界面组件
│   ├── ChatMessage.tsx      # 消息组件
│   ├── ContactForm.tsx      # 联系表单组件
│   └── MessageInput.tsx     # 消息输入组件
├── hooks/              # 自定义 Hooks
│   └── useChat.ts          # 聊天相关 Hook
├── services/           # 服务层
│   ├── api.ts              # HTTP API 客户端
│   └── websocket.ts        # WebSocket 服务
├── store/              # 状态管理
│   └── index.ts            # Zustand 状态管理
├── types/              # TypeScript 类型定义
│   └── index.ts            # 类型定义
├── utils/              # 工具函数
│   └── index.ts            # 实用函数
├── App.tsx             # 主应用组件
├── main.tsx            # 应用入口
└── index.css           # 全局样式
```

## 🔌 API 集成

### 后端接口对接
应用已配置与后端 API 的完整对接：

- **认证接口** - 用户登录、登出
- **会话管理** - 创建、更新、关闭会话
- **消息处理** - 发送、接收、状态更新
- **文件上传** - 多媒体文件处理
- **实时通信** - WebSocket 连接管理

### WebSocket 事件
- `connect` - 连接建立
- `disconnect` - 连接断开
- `new_message` - 新消息
- `message_status` - 消息状态更新
- `typing` - 输入指示器
- `user_joined` - 用户加入
- `user_left` - 用户离开

## 🎨 主题定制

### Tailwind 配置
应用使用 Tailwind CSS 构建，支持：
- 自定义颜色主题
- 响应式断点
- 深色模式切换
- 自定义动画

### 组件样式
所有组件都使用语义化的 CSS 类：
- `.chat-bubble` - 聊天气泡
- `.input-field` - 输入框
- `.btn-primary` - 主要按钮
- `.btn-secondary` - 次要按钮

## 🔧 开发工具

### 代码质量
- **ESLint** - 代码规范检查
- **TypeScript** - 类型检查
- **Prettier** - 代码格式化

### 调试工具
- **React DevTools** - React 组件调试
- **TanStack Query DevTools** - 查询状态调试
- **Zustand DevTools** - 状态管理调试

### 命令
```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📱 移动端适配

应用完全适配移动设备：
- 响应式布局
- 触摸友好的交互
- 移动端优化的组件大小
- 虚拟键盘适配

## 🚀 性能优化

### 已实现的优化
- **代码分割** - 按需加载组件
- **懒加载** - 图片和文件懒加载
- **缓存策略** - 智能数据缓存
- **虚拟滚动** - 大量消息列表优化
- **防抖节流** - 输入和滚动优化

### 构建优化
- **Tree Shaking** - 移除未使用代码
- **压缩优化** - 代码和资源压缩
- **分包策略** - 合理的代码分割

## 🔒 安全特性

- **XSS 防护** - 输入内容过滤
- **CSRF 保护** - 请求令牌验证
- **内容安全策略** - CSP 头部配置
- **文件类型验证** - 安全的文件上传

## 📝 许可证

MIT License

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 支持

如有问题或建议，请：
- 创建 Issue
- 发送邮件到 support@example.com
- 查看文档 [docs.example.com](https://docs.example.com)