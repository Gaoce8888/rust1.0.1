# UI前端详细对接指南

## 目录
1. [前言](#前言)
2. [架构概览](#架构概览)
3. [环境搭建](#环境搭建)
4. [核心组件集成](#核心组件集成)
5. [具体功能实现](#具体功能实现)
6. [UI组件适配](#ui组件适配)
7. [测试与调试](#测试与调试)
8. [常见问题解决](#常见问题解决)

## 前言

本指南详细说明如何将NextUI客户端UI与Rust后端系统进行对接。我们已经创建了完整的企业级适配层，您只需要按照以下步骤进行集成即可。

## 架构概览

### 系统分层架构
```
┌────────────────────────────────────────────────┐
│                   UI层                         │
│  (NextUI组件: App.tsx, AppMinimal.tsx等)       │
├────────────────────────────────────────────────┤
│                 适配层                         │
│  (EnterpriseAdapter, Hooks, Services)         │
├────────────────────────────────────────────────┤
│                 通信层                         │
│  (WebSocketManager, ApiClient)                │
├────────────────────────────────────────────────┤
│                 后端API                        │
│  (Rust后端: REST API + WebSocket)             │
└────────────────────────────────────────────────┘
```

### 关键文件说明
```
前端/客户端UI/
├── EnterpriseApp.tsx         # 企业级应用入口
├── App.tsx                   # 完整UI界面
├── AppMinimal.tsx            # 极简UI界面
├── services/
│   ├── enterprise-adapter.ts  # 核心适配器
│   ├── api-client.ts         # HTTP客户端
│   ├── websocket-manager.ts  # WebSocket管理
│   ├── message-store.ts      # 消息存储
│   └── auth-service.ts       # 认证服务
└── enterprise.html           # 应用入口HTML
```

## 环境搭建

### 1. 安装依赖

```bash
cd 前端/客户端UI
npm install
```

### 2. 配置文件

创建 `.env` 文件（开发环境）：
```env
# 开发环境配置
VITE_API_URL=http://localhost:6006
VITE_WS_URL=ws://localhost:6006/ws
VITE_DEBUG=true
```

创建 `.env.production` 文件（生产环境）：
```env
# 生产环境配置
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com/ws
VITE_DEBUG=false
```

### 3. 启动应用

开发环境：
```bash
npm run dev
# 或启动企业级版本
npm run dev:enterprise
```

生产构建：
```bash
npm run build -- --mode production
```

## 核心组件集成

### 1. 企业级应用入口 (EnterpriseApp.tsx)

这是主要的应用入口，包含了登录、路由和状态管理：

```typescript
// EnterpriseApp.tsx
import React, { useState, useEffect } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { useEnterpriseAdapter } from "./services/enterprise-adapter";

// 配置对象
const ENTERPRISE_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:6006',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:6006/ws',
  debug: import.meta.env.VITE_DEBUG === 'true',
  autoReconnect: true,
  heartbeatInterval: 30000
};

export default function EnterpriseApp() {
  // 使用企业级适配器
  const { 
    adapter, 
    isConnected, 
    currentUser, 
    login, 
    logout 
  } = useEnterpriseAdapter(ENTERPRISE_CONFIG);

  // 登录处理
  const handleLogin = async (username: string, password: string, role: 'customer' | 'support') => {
    try {
      await login(username, password, role);
      // 登录成功后的处理
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  // 渲染UI
  return (
    <NextUIProvider>
      {currentUser ? (
        // 已登录，显示聊天界面
        <ChatInterface user={currentUser} adapter={adapter} />
      ) : (
        // 未登录，显示登录界面
        <LoginForm onLogin={handleLogin} />
      )}
    </NextUIProvider>
  );
}
```

### 2. 登录界面集成

```typescript
// components/LoginForm.tsx
import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@nextui-org/react";

interface LoginFormProps {
  onLogin: (username: string, password: string, role: 'customer' | 'support') => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'customer' as 'customer' | 'support'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onLogin(formData.username, formData.password, formData.role);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} isDismissable={false}>
      <ModalContent>
        <ModalHeader>登录系统</ModalHeader>
        <ModalBody>
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            placeholder="请输入用户名"
          />
          <Input
            label="密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="请输入密码"
          />
          <Select
            label="角色"
            selectedKeys={[formData.role]}
            onChange={(e) => setFormData({...formData, role: e.target.value as any})}
          >
            <SelectItem key="customer" value="customer">客户</SelectItem>
            <SelectItem key="support" value="support">客服</SelectItem>
          </Select>
          {error && <p className="text-danger">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isLoading={loading}
          >
            登录
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

### 3. 聊天界面集成

将现有的UI组件与适配器连接：

```typescript
// components/ChatInterface.tsx
import React, { useEffect } from "react";
import AppMinimal from "../AppMinimal";
import { useMessages } from "../services/enterprise-adapter";
import type { User, EnterpriseAdapter } from "../services/enterprise-adapter";

interface ChatInterfaceProps {
  user: User;
  adapter: EnterpriseAdapter;
}

export function ChatInterface({ user, adapter }: ChatInterfaceProps) {
  // 假设与一个固定的客服对话
  const targetUserId = user.role === 'customer' ? 'support_001' : 'customer_001';
  const { messages, loading, sendMessage } = useMessages(targetUserId);

  // 监听新消息
  useEffect(() => {
    const unsubscribe = adapter.on('message', (message) => {
      console.log('收到新消息:', message);
      // 更新UI的逻辑
    });

    return () => {
      unsubscribe();
    };
  }, [adapter]);

  // 发送消息处理
  const handleSendMessage = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (error) {
      console.error('发送失败:', error);
    }
  };

  // 传递必要的props给现有的UI组件
  return (
    <div className="h-screen">
      {/* 这里可以使用 AppMinimal 或其他UI组件 */}
      <AppMinimal 
        // 传递必要的props
        currentUser={user}
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
      />
    </div>
  );
}
``` 

## 具体功能实现

### 1. 消息发送和接收

#### 发送文本消息
```typescript
// 在组件中使用
const handleSendMessage = async (text: string) => {
  try {
    // 通过适配器发送消息
    await adapter.sendMessage(text, receiverId, 'text');
    
    // 清空输入框
    setInputText('');
    
    // 滚动到底部
    scrollToBottom();
  } catch (error) {
    console.error('发送失败:', error);
    // 显示错误提示
    showError('消息发送失败，请重试');
  }
};
```

#### 接收消息
```typescript
// 设置消息监听
useEffect(() => {
  const unsubscribe = adapter.on('message', (message) => {
    // 更新消息列表
    setMessages(prev => [...prev, message]);
    
    // 播放提示音
    playNotificationSound();
    
    // 显示桌面通知
    if (Notification.permission === 'granted') {
      new Notification(`${message.userName}`, {
        body: message.text,
        icon: message.avatar
      });
    }
  });
  
  return () => unsubscribe();
}, [adapter]);
```

### 2. 文件上传功能

#### 图片上传
```typescript
const handleImageUpload = async (file: File) => {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showError('请选择图片文件');
    return;
  }
  
  // 验证文件大小
  if (file.size > 10 * 1024 * 1024) { // 10MB
    showError('图片大小不能超过10MB');
    return;
  }
  
  try {
    // 显示上传进度
    setUploading(true);
    
    // 上传文件
    const attachment = await adapter.uploadFile(file, (progress) => {
      setUploadProgress(progress);
    });
    
    // 发送图片消息
    await adapter.sendMessage(attachment.name, receiverId, 'image');
    
    // 清理状态
    setUploading(false);
    setUploadProgress(0);
  } catch (error) {
    console.error('上传失败:', error);
    showError('图片上传失败');
    setUploading(false);
  }
};
```

#### 文件拖拽上传
```typescript
const handleDrop = useCallback((e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  const files = Array.from(e.dataTransfer?.files || []);
  
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      handleImageUpload(file);
    } else {
      handleFileUpload(file);
    }
  });
}, []);
```

### 3. 语音消息功能

```typescript
// 语音录制组件
import { useState, useRef } from 'react';

function VoiceRecorder({ onSend }: { onSend: (blob: Blob) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onSend(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // 开始计时
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      showError('请允许访问麦克风');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };
  
  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <Button
          isIconOnly
          variant="light"
          onPress={startRecording}
        >
          <Icon icon="solar:microphone-linear" />
        </Button>
      ) : (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span>{formatTime(recordingTime)}</span>
          <Button size="sm" color="danger" onPress={stopRecording}>
            停止
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 4. 实时在线状态

```typescript
// 监听在线用户变化
useEffect(() => {
  // 初始加载在线用户
  adapter.getOnlineUsers().then(users => {
    setOnlineUsers(users);
  });
  
  // 订阅在线用户更新
  const unsubscribe = adapter.subscribeToOnlineUsers((users) => {
    setOnlineUsers(users);
    
    // 更新用户状态显示
    users.forEach(user => {
      updateUserStatus(user.id, user.status);
    });
  });
  
  return () => unsubscribe();
}, [adapter]);

// 显示用户在线状态
function UserStatus({ userId }: { userId: string }) {
  const user = onlineUsers.find(u => u.id === userId);
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-2 h-2 rounded-full",
        user?.status === 'online' ? "bg-success" : "bg-default-300"
      )} />
      <span className="text-tiny text-default-500">
        {user?.status === 'online' ? '在线' : '离线'}
      </span>
    </div>
  );
}
```

### 5. 消息状态管理

```typescript
// 消息状态跟踪
interface MessageWithStatus extends Message {
  localId: string;
  status: 'sending' | 'sent' | 'failed' | 'read';
  retryCount?: number;
}

// 发送消息时的状态管理
const sendMessageWithStatus = async (text: string) => {
  const localId = generateLocalId();
  const tempMessage: MessageWithStatus = {
    id: localId,
    localId,
    text,
    sender: 'user',
    senderId: currentUser.id,
    receiverId: targetUserId,
    time: new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    userName: currentUser.name,
    type: 'text',
    status: 'sending'
  };
  
  // 立即显示消息
  setMessages(prev => [...prev, tempMessage]);
  
  try {
    // 发送消息
    const sentMessage = await adapter.sendMessage(text, targetUserId);
    
    // 更新消息状态
    updateMessageStatus(localId, 'sent', sentMessage.id);
  } catch (error) {
    // 标记失败
    updateMessageStatus(localId, 'failed');
    
    // 显示重试按钮
    showRetryOption(localId);
  }
};

// 重试发送
const retryMessage = async (localId: string) => {
  const message = messages.find(m => m.localId === localId);
  if (!message) return;
  
  updateMessageStatus(localId, 'sending');
  
  try {
    const sentMessage = await adapter.sendMessage(message.text, message.receiverId);
    updateMessageStatus(localId, 'sent', sentMessage.id);
  } catch (error) {
    updateMessageStatus(localId, 'failed');
    
    // 增加重试计数
    const retryCount = (message.retryCount || 0) + 1;
    if (retryCount >= 3) {
      showError('消息发送失败，请检查网络连接');
    }
  }
};
``` 

## UI组件适配

### 1. 修改现有组件以支持后端数据

#### 修改 AppMinimal.tsx
```typescript
// AppMinimal.tsx 的修改示例
import React, { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Avatar, Input, Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { useMessages } from "../services/enterprise-adapter";

interface AppMinimalProps {
  currentUser: User;
  targetUserId: string;
  adapter: EnterpriseAdapter;
}

export default function AppMinimal({ currentUser, targetUserId, adapter }: AppMinimalProps) {
  const [message, setMessage] = useState("");
  const { messages, sendMessage } = useMessages(targetUserId);
  
  const handleSendMessage = async () => {
    if (message.trim()) {
      try {
        await sendMessage(message);
        setMessage("");
      } catch (error) {
        console.error('发送失败:', error);
      }
    }
  };
  
  return (
    <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
      <CardHeader className="flex gap-3 px-6 py-4 border-b">
        <Avatar src={currentUser.avatar} size="md" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{currentUser.name}</p>
          <p className="text-sm text-default-500">在线</p>
        </div>
      </CardHeader>
      
      <CardBody className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 mb-4 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar src={msg.avatar} size="sm" />
            <div
              className={`max-w-[70%] rounded-large px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-content2'
              }`}
            >
              <p className="text-small">{msg.text}</p>
              <p className="text-tiny opacity-60 mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
      </CardBody>
      
      <div className="border-t px-6 py-4">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="输入消息..."
          endContent={
            <Button
              isIconOnly
              size="sm"
              color="primary"
              onPress={handleSendMessage}
            >
              <Icon icon="solar:plain-2-bold" />
            </Button>
          }
        />
      </div>
    </Card>
  );
}
```

### 2. 创建通用的聊天组件

```typescript
// components/UniversalChat.tsx
import React from 'react';
import { useEnterpriseAdapter } from '../services/enterprise-adapter';

interface UniversalChatProps {
  variant?: 'minimal' | 'full' | 'simple';
  targetUserId?: string;
}

export function UniversalChat({ variant = 'minimal', targetUserId }: UniversalChatProps) {
  const { adapter, currentUser } = useEnterpriseAdapter();
  
  if (!currentUser) {
    return <div>请先登录</div>;
  }
  
  // 根据变体选择不同的UI
  switch (variant) {
    case 'minimal':
      return <AppMinimal currentUser={currentUser} targetUserId={targetUserId} adapter={adapter} />;
    case 'full':
      return <App currentUser={currentUser} adapter={adapter} />;
    case 'simple':
      return <AppSimple currentUser={currentUser} adapter={adapter} />;
    default:
      return <AppMinimal currentUser={currentUser} targetUserId={targetUserId} adapter={adapter} />;
  }
}
```

### 3. 响应式设计适配

```typescript
// hooks/useResponsive.ts
import { useMediaQuery } from 'usehooks-ts';

export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    // 根据设备类型选择合适的UI变体
    chatVariant: isMobile ? 'minimal' : isDesktop ? 'full' : 'simple'
  };
}

// 在组件中使用
function ResponsiveChat() {
  const { chatVariant } = useResponsive();
  
  return <UniversalChat variant={chatVariant} />;
}
```

## 测试与调试

### 1. 开发环境调试工具

```typescript
// utils/debugger.ts
export class ChatDebugger {
  private adapter: EnterpriseAdapter;
  
  constructor(adapter: EnterpriseAdapter) {
    this.adapter = adapter;
    
    // 在开发环境中暴露到全局
    if (import.meta.env.DEV) {
      (window as any).chatDebugger = this;
    }
  }
  
  // 模拟接收消息
  simulateMessage(text: string, fromUserId: string = 'test_user') {
    const message: Message = {
      id: Date.now(),
      text,
      sender: 'support',
      senderId: fromUserId,
      receiverId: this.adapter.getCurrentUser()?.id || '',
      time: new Date().toLocaleTimeString('zh-CN'),
      userName: 'Test User',
      type: 'text',
      status: 'sent'
    };
    
    this.adapter.emit('message', message);
  }
  
  // 模拟连接状态变化
  simulateDisconnect() {
    this.adapter.emit('disconnected');
  }
  
  simulateReconnect() {
    this.adapter.emit('connected');
  }
  
  // 查看当前状态
  getState() {
    return {
      currentUser: this.adapter.getCurrentUser(),
      isConnected: this.adapter.isConnected,
      messageCount: this.adapter.getMessages('all').length
    };
  }
}

// 在应用中初始化
if (import.meta.env.DEV) {
  new ChatDebugger(adapter);
}
```

### 2. 浏览器控制台调试命令

```javascript
// 在浏览器控制台中可用的调试命令

// 发送测试消息
chatDebugger.simulateMessage('这是一条测试消息');

// 模拟断线
chatDebugger.simulateDisconnect();

// 查看当前状态
chatDebugger.getState();

// 手动发送消息
adapter.sendMessage('测试消息', 'support_001');

// 查看所有消息
adapter.getMessages('current_conversation');
```

### 3. 网络请求监控

```typescript
// 拦截和监控所有API请求
export function setupNetworkMonitoring() {
  // 拦截 fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.group(`🌐 API请求: ${args[0]}`);
    console.log('请求参数:', args[1]);
    console.time('请求耗时');
    
    try {
      const response = await originalFetch(...args);
      console.log('响应状态:', response.status);
      console.timeEnd('请求耗时');
      console.groupEnd();
      return response;
    } catch (error) {
      console.error('请求失败:', error);
      console.groupEnd();
      throw error;
    }
  };
  
  // 监控 WebSocket
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = class extends OriginalWebSocket {
    constructor(url: string, protocols?: string | string[]) {
      console.log('🔌 WebSocket连接:', url);
      super(url, protocols);
      
      this.addEventListener('message', (event) => {
        console.log('📨 收到消息:', JSON.parse(event.data));
      });
      
      this.addEventListener('close', (event) => {
        console.log('🔌 WebSocket断开:', event.code, event.reason);
      });
    }
  };
}
```

## 常见问题解决

### 1. 登录失败
```typescript
// 问题：登录时返回 401 错误
// 解决方案：
const handleLogin = async (username: string, password: string, role: string) => {
  try {
    // 确保用户类型正确
    const userType = role === 'customer' ? 'Kehu' : 'Kefu';
    
    // 检查后端是否运行
    const healthCheck = await fetch(`${apiUrl}/health`);
    if (!healthCheck.ok) {
      throw new Error('后端服务未响应');
    }
    
    // 执行登录
    await adapter.login(username, password, userType);
  } catch (error) {
    if (error.message.includes('401')) {
      showError('用户名或密码错误');
    } else if (error.message.includes('network')) {
      showError('网络连接失败，请检查后端服务');
    } else {
      showError(`登录失败: ${error.message}`);
    }
  }
};
```

### 2. WebSocket连接问题
```typescript
// 问题：WebSocket无法连接或频繁断开
// 解决方案：
const handleWebSocketError = () => {
  // 检查session是否过期
  if (!adapter.getSessionId()) {
    // 重新登录
    redirectToLogin();
    return;
  }
  
  // 检查网络状态
  if (!navigator.onLine) {
    showError('网络已断开，请检查网络连接');
    return;
  }
  
  // 尝试重连
  setTimeout(() => {
    adapter.reconnect();
  }, 3000);
};
```

### 3. 消息发送失败
```typescript
// 问题：消息发送后没有响应
// 解决方案：
const debugSendMessage = async (text: string) => {
  console.log('准备发送消息:', text);
  
  // 检查WebSocket状态
  if (!adapter.isConnected) {
    console.error('WebSocket未连接');
    await adapter.reconnect();
  }
  
  // 检查接收者ID
  if (!receiverId) {
    console.error('未指定接收者');
    return;
  }
  
  try {
    const result = await adapter.sendMessage(text, receiverId);
    console.log('发送成功:', result);
  } catch (error) {
    console.error('发送失败:', error);
    // 将消息加入重试队列
    retryQueue.add({ text, receiverId, retries: 0 });
  }
};
```

### 4. 性能优化建议

```typescript
// 消息列表虚拟滚动
import { VariableSizeList } from 'react-window';

function VirtualMessageList({ messages }: { messages: Message[] }) {
  const getItemSize = (index: number) => {
    // 根据消息内容计算高度
    const message = messages[index];
    const baseHeight = 60;
    const textLines = Math.ceil(message.text.length / 50);
    return baseHeight + (textLines - 1) * 20;
  };
  
  return (
    <VariableSizeList
      height={600}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageItem message={messages[index]} />
        </div>
      )}
    </VariableSizeList>
  );
}
```

## 总结

通过以上步骤，您可以成功将NextUI客户端UI与Rust后端系统对接。关键点：

1. ✅ 使用企业级适配器封装所有后端交互
2. ✅ 通过React Hooks简化状态管理
3. ✅ 保持UI组件的独立性和可复用性
4. ✅ 完善的错误处理和用户反馈
5. ✅ 充分的调试工具和日志支持

如需更多帮助，请参考相关文档或联系技术支持。 