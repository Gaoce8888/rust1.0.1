# 企业级AI客服系统 - 客户端UI文档

## 目录
1. [概述](#概述)
2. [技术架构](#技术架构)
3. [UI 组件结构](#ui-组件结构)
4. [响应式设计](#响应式设计)
5. [交互流程](#交互流程)
6. [企业级集成](#企业级集成)
7. [后端对接](#后端对接)
8. [最佳实践](#最佳实践)

## 概述

本系统是一个企业级的AI客服即时通讯解决方案，提供客户端和客服端的完整UI实现。系统基于React和NextUI构建，具备实时消息、文件传输、语音消息等功能。

### 核心特性
- 🚀 **企业级架构** - 模块化设计，易于扩展和维护
- 💬 **实时通讯** - WebSocket双向通信，消息即时送达
- 📁 **文件传输** - 支持图片、文档、音频等多种文件类型
- 🎙️ **语音消息** - 录制和播放语音消息
- 🌐 **多语言支持** - 中文界面，可扩展国际化
- 📱 **响应式设计** - 完美适配移动端、平板和桌面

### 技术栈
- **React 18** - 前端框架
- **NextUI** - 现代化UI组件库
- **TypeScript** - 类型安全
- **TailwindCSS** - 原子化CSS框架
- **Vite** - 高性能构建工具
- **WebSocket** - 实时通信协议

## 技术架构

### 前端架构
```
客户端UI/
├── components/          # UI组件
│   ├── App.tsx         # 标准版应用入口
│   ├── AppMinimal.tsx  # 精简版应用
│   └── EnterpriseApp.tsx # 企业版应用
├── services/           # 服务层
│   ├── api-client.ts   # HTTP客户端
│   ├── websocket-manager.ts # WebSocket管理
│   ├── message-store.ts # 消息存储
│   └── auth-service.ts # 认证服务
├── types/              # 类型定义
└── utils/              # 工具函数
```

### 后端接口
- **基础URL**: `http://localhost:6006`
- **WebSocket**: `ws://localhost:6006/ws`
- **认证方式**: Session-based (session_id)

## UI 组件结构

### 1. 整体布局
```tsx
<div className="flex h-screen w-full">
  {/* 侧边栏 - 会话列表 */}
  <Sidebar className="w-[280px]" />
  
  {/* 主聊天区域 */}
  <div className="flex-1 flex flex-col">
    <ChatHeader />    // 聊天头部
    <MessageList />   // 消息列表
    <ChatInput />     // 输入区域
  </div>
  
  {/* 右侧信息栏 - 可选 */}
  <ProfileSidebar className="w-[320px]" />
</div>
```

### 2. 核心组件说明

#### Sidebar - 会话列表
- **宽度**: 280px（可折叠）
- **功能**: 显示所有会话，支持搜索和筛选
- **交互**: 点击切换会话，显示未读消息数

#### ChatHeader - 聊天头部
- **高度**: 64px
- **内容**: 对方头像、名称、在线状态、操作按钮
- **功能**: 视频通话、语音通话、更多选项

#### MessageList - 消息列表
- **布局**: 垂直滚动，自动加载历史消息
- **消息类型**: 文本、图片、文件、语音、系统提示
- **特性**: 虚拟滚动优化、消息状态显示

#### ChatInput - 输入区域
- **功能**: 文本输入、表情选择、文件上传、语音录制
- **快捷键**: Enter发送、Ctrl+Enter换行

## 响应式设计

### 断点设置
```css
/* 移动端 */
@media (max-width: 640px) {
  .sidebar { display: none; }
  .chat-container { width: 100%; }
  .profile-sidebar { display: none; }
}

/* 平板 */
@media (min-width: 641px) and (max-width: 1024px) {
  .sidebar { width: 200px; }
  .profile-sidebar { display: none; }
}

/* 桌面端 */
@media (min-width: 1025px) {
  .sidebar { width: 280px; }
  .profile-sidebar { width: 320px; }
}
```

### 适配方案

#### 移动端适配
1. **底部导航**: 移动端使用底部标签栏
   ```tsx
   const MobileNav = () => (
     <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
       <div className="flex justify-around py-2">
         <Button isIconOnly>消息</Button>
         <Button isIconOnly>联系人</Button>
         <Button isIconOnly>我的</Button>
       </div>
     </div>
   );
   ```

2. **手势操作**: 
   - 左滑返回
   - 下拉刷新
   - 长按消息弹出菜单

3. **输入框优化**: 
   ```tsx
   // 移动端键盘弹出时调整布局
   const adjustForKeyboard = () => {
     const visualViewport = window.visualViewport;
     if (visualViewport) {
       const offsetHeight = window.innerHeight - visualViewport.height;
       document.body.style.transform = `translateY(-${offsetHeight}px)`;
     }
   };
   ```

#### 平板适配
- 侧边栏可折叠
- 支持分屏模式
- 横竖屏自适应

#### 桌面端适配
- 完整三栏布局
- 支持多窗口
- 键盘快捷键支持

## 交互流程

### 1. 登录流程
```typescript
// 1. 用户登录
const login = async (username: string, password: string) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const { session_id, user_type } = await response.json();
  
  // 2. 建立WebSocket连接
  const ws = new WebSocket(`ws://localhost:6006/ws?session_id=${session_id}`);
  
  // 3. 跳转到主界面
  if (user_type === 'Kehu') {
    window.location.href = '/customer';
  } else {
    window.location.href = '/service';
  }
};
```

### 2. 消息发送流程
```typescript
const sendMessage = async (text: string, attachments?: File[]) => {
  // 1. 创建消息对象
  const message = {
    id: generateId(),
    text,
    sender: currentUser.type,
    timestamp: Date.now(),
    status: 'sending'
  };
  
  // 2. 添加到本地消息列表
  addMessage(message);
  
  // 3. 通过WebSocket发送
  ws.send(JSON.stringify({
    type: 'message',
    data: message
  }));
  
  // 4. 处理附件
  if (attachments?.length) {
    await uploadFiles(attachments, message.id);
  }
};
```

### 3. 实时消息接收
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'message':
      // 新消息
      addMessage(data.content);
      playNotificationSound();
      break;
      
    case 'typing':
      // 正在输入
      showTypingIndicator(data.user);
      break;
      
    case 'online_status':
      // 在线状态更新
      updateUserStatus(data.user_id, data.status);
      break;
  }
};

## 样式定制

### 1. NextUI 主题配置
```typescript
// tailwind.config.js
const { nextui } = require("@nextui-org/react");

module.exports = {
  content: [
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: "#0070F3",
            secondary: "#7928CA",
            success: "#17C964",
            warning: "#F5A524",
            danger: "#F31260",
          },
        },
        dark: {
          colors: {
            primary: "#0070F3",
            secondary: "#9750DD",
            success: "#17C964",
            warning: "#F5A524",
            danger: "#F31260",
          },
        },
      },
    }),
  ],
};
```

### 2. 自定义组件样式

#### 消息气泡样式
```tsx
import { Card } from "@nextui-org/react";

const MessageBubble = ({ message, isUser }) => (
  <Card
    className={cn(
      "max-w-[70%] px-4 py-2",
      isUser ? "bg-primary text-white ml-auto" : "bg-default-100"
    )}
    shadow="sm"
  >
    <p className="text-sm">{message.text}</p>
    <span className="text-xs opacity-70">
      {formatTime(message.timestamp)}
    </span>
  </Card>
);
```

#### 输入框样式
```tsx
import { Input, Button } from "@nextui-org/react";

const ChatInput = () => (
  <div className="flex gap-2 p-4 border-t">
    <Input
      placeholder="输入消息..."
      variant="bordered"
      className="flex-1"
      endContent={
        <Button isIconOnly size="sm" variant="light">
          <AttachIcon />
        </Button>
      }
    />
    <Button color="primary" isIconOnly>
      <SendIcon />
    </Button>
  </div>
);
```

## 企业级集成

### 1. 企业级架构集成
```typescript
// 使用企业级适配器
import { EnterpriseAdapter } from './services/enterprise-adapter';
import { EnterpriseApp } from './EnterpriseApp';

// 初始化适配器
const adapter = new EnterpriseAdapter({
  baseURL: 'http://localhost:6006',
  wsURL: 'ws://localhost:6006/ws'
});

// 在React应用中使用
function App() {
  return (
    <AdapterProvider adapter={adapter}>
      <EnterpriseApp />
    </AdapterProvider>
  );
}
```

### 2. 服务层架构
```typescript
// services/
├── api-client.ts      // HTTP请求封装
├── websocket-manager.ts // WebSocket管理
├── message-store.ts   // 消息存储
├── auth-service.ts    // 认证服务
└── file-service.ts    // 文件服务

// 使用示例
import { apiClient } from './services/api-client';
import { wsManager } from './services/websocket-manager';

// 登录
const { session_id } = await apiClient.login(username, password);

// 连接WebSocket
await wsManager.connect(session_id);

// 发送消息
wsManager.sendMessage({
  type: 'text',
  content: 'Hello',
  receiver_id: 'user123'
});
```

### 3. 配置管理
```typescript
// config/app.config.ts
export const appConfig = {
  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:6006',
    timeout: 30000,
  },
  websocket: {
    url: process.env.REACT_APP_WS_URL || 'ws://localhost:6006/ws',
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
  },
  features: {
    voiceMessage: true,
    fileTransfer: true,
    aiAssistant: true,
    htmlTemplates: true,
  }
};
```

## 后端对接

### 1. WebSocket 连接
```typescript
const ws = new WebSocket(`ws://localhost:6006/ws?session_id=${sessionId}`);

ws.onopen = () => {
  console.log('WebSocket connected');
  // 发送认证信息
  ws.send(JSON.stringify({ type: 'auth', session_id: sessionId }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'message') {
    onMessage(message.data); // 调用前端回调
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### 2. 消息格式
```typescript
interface Message {
  id: string;
  sender: 'user' | 'support';
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'failed';
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size: number;
}
```

## 最佳实践

### 1. 性能优化

#### 消息列表虚拟化
```tsx
import { Virtuoso } from 'react-virtuoso';

const VirtualMessageList = ({ messages }) => {
  return (
    <Virtuoso
      data={messages}
      itemContent={(index, message) => (
        <MessageItem key={message.id} message={message} />
      )}
      followOutput="smooth"
      initialTopMostItemIndex={messages.length - 1}
    />
  );
};
```

#### 图片懒加载
```tsx
import { Image } from "@nextui-org/react";

const LazyImage = ({ src, alt }) => (
  <Image
    src={src}
    alt={alt}
    loading="lazy"
    className="max-w-full rounded-lg"
    fallbackSrc="/placeholder.jpg"
  />
);
```

#### 消息分页加载
```tsx
const useMessagePagination = (conversationId: string) => {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const oldestMessage = messages[0];
    const newMessages = await apiClient.getMessages({
      conversation_id: conversationId,
      before: oldestMessage?.id,
      limit: 50
    });
    
    setMessages([...newMessages, ...messages]);
    setHasMore(newMessages.length === 50);
    setLoading(false);
  };
  
  return { messages, loadMore, hasMore, loading };
};
```

### 2. 状态管理

#### 使用Zustand进行状态管理
```typescript
import { create } from 'zustand';

interface ChatStore {
  messages: Message[];
  conversations: Conversation[];
  activeConversation: string | null;
  
  addMessage: (message: Message) => void;
  setActiveConversation: (id: string) => void;
  updateMessageStatus: (id: string, status: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  conversations: [],
  activeConversation: null,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setActiveConversation: (id) => set({ activeConversation: id }),
  
  updateMessageStatus: (id, status) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === id ? { ...msg, status } : msg
    )
  }))
}));
```

### 3. 错误边界
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Chat error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">出错了</h2>
          <p className="text-gray-600 mb-4">聊天系统遇到了问题</p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </Card>
      );
    }
    
    return this.props.children;
  }
}
```

### 4. 安全性考虑
```typescript
// XSS防护
import DOMPurify from 'dompurify';

const sanitizeMessage = (text: string) => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};

// 文件上传验证
const validateFile = (file: File) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (file.size > maxSize) {
    throw new Error('文件大小不能超过10MB');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件类型');
  }
  
  return true;
};
```

## 附录

### 完整的类型定义
```typescript
// 消息类型
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'Kefu' | 'Kehu';
  content: string;
  content_type: 'Text' | 'Image' | 'File' | 'Voice' | 'Video';
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    file_url?: string;
    file_name?: string;
    file_size?: number;
    duration?: number; // 语音/视频时长
    thumbnail?: string; // 视频缩略图
  };
}

// 会话类型
interface Conversation {
  id: string;
  customer_id: string;
  service_id: string;
  last_message?: Message;
  unread_count: number;
  created_at: number;
  updated_at: number;
  status: 'active' | 'closed' | 'pending';
}

// 用户类型
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  user_type: 'Kefu' | 'Kehu';
  online_status: 'Online' | 'Away' | 'Busy' | 'Offline';
  last_seen?: number;
}

// WebSocket消息类型
interface WSMessage {
  type: 'message' | 'typing' | 'online_status' | 'read_receipt';
  data: any;
  timestamp: number;
}
```

### API响应格式
```typescript
// 统一响应格式
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 分页响应
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
```

### 常用工具函数
```typescript
// 生成唯一ID
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 格式化时间
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // 今天的消息只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 其他日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
```

---

## 更新日志

### v2.0.0 (2024-01-20)
- 🎉 全新企业级架构
- 🔄 NextUI组件库迁移
- 🚀 WebSocket实时通信
- 📁 文件传输功能
- 🎙️ 语音消息支持
- 🌐 完整的后端集成

### v1.0.0 (2024-01-15)
- 初始版本发布
- 基础聊天功能
- 响应式设计
- 深色模式支持
