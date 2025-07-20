# 企业级React组件库

一个专为客服端和客户端设计的高性能、企业级React组件库，完全适配后端API。

## 🚀 特性

- **高性能**: 使用React 18、TypeScript和现代构建工具
- **企业级**: 完整的类型定义、错误处理和性能监控
- **响应式**: 支持移动端和桌面端
- **可定制**: 基于Tailwind CSS的主题系统
- **完整功能**: 支持文本、图片、文件、语音、视频等多种消息类型
- **实时通信**: WebSocket和长轮询双重保障
- **状态管理**: 内置会话管理和消息状态跟踪

## 📦 安装

```bash
npm install @enterprise/shared-components
# 或
yarn add @enterprise/shared-components
```

## 🔧 依赖要求

```json
{
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 🎯 快速开始

### 基础设置

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  apiClient, 
  ChatInterface, 
  CustomerList,
  useSession 
} from '@enterprise/shared-components';

// 创建QueryClient
const queryClient = new QueryClient();

// 配置API客户端
apiClient.configure({
  baseURL: 'http://your-api-server.com',
  timeout: 30000
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### 客服端使用

```tsx
import React, { useState } from 'react';
import { CustomerList, useSession } from '@enterprise/shared-components';

function KefuApp() {
  const { user, connect, disconnect } = useSession();
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  // 连接客服系统
  const handleConnect = async () => {
    try {
      await connect({
        user_id: 'agent-001',
        user_name: '客服小王',
        user_type: 'agent'
      });
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  const handleCustomerSelect = (customer) => {
    setCurrentCustomer(customer);
  };

  const handleSendMessage = (customerId) => {
    // 发送消息逻辑
  };

  const handleCall = (customerId, type) => {
    // 通话逻辑
  };

  return (
    <div className="flex h-screen">
      <CustomerList
        customers={customers}
        currentCustomerId={currentCustomer?.id}
        onCustomerSelect={handleCustomerSelect}
        onSendMessage={handleSendMessage}
        onCall={handleCall}
        className="w-80"
      />
      {/* 聊天界面 */}
    </div>
  );
}
```

### 客户端使用

```tsx
import React, { useState } from 'react';
import { ChatInterface, useSession } from '@enterprise/shared-components';

function KehuApp() {
  const { user, connect } = useSession();
  const [isMinimized, setIsMinimized] = useState(false);

  const handleConnect = async () => {
    try {
      await connect({
        user_id: 'customer-001',
        user_name: '张三',
        user_type: 'customer'
      });
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96">
      <ChatInterface
        agentId="agent-001"
        agentInfo={{
          id: 'agent-001',
          name: '客服小王',
          status: 'online'
        }}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(true)}
        onMaximize={() => setIsMinimized(false)}
        onClose={() => console.log('关闭聊天')}
      />
    </div>
  );
}
```

## 🧩 组件API

### Button 按钮组件

```tsx
import { Button } from '@enterprise/shared-components';

<Button
  variant="primary" // primary | secondary | danger | ghost | outline
  size="md" // sm | md | lg
  disabled={false}
  loading={false}
  onClick={() => console.log('clicked')}
>
  点击我
</Button>
```

### Input 输入框组件

```tsx
import { Input } from '@enterprise/shared-components';

<Input
  type="text" // text | email | password | number | tel | url
  placeholder="请输入..."
  value={value}
  onChange={setValue}
  error="错误信息"
  required
/>
```

### ChatMessage 聊天消息组件

```tsx
import { ChatMessage } from '@enterprise/shared-components';

<ChatMessage
  message={messageData}
  isOwn={true}
  showAvatar={true}
  showTimestamp={true}
  onRetry={(messageId) => console.log('重试消息:', messageId)}
  onDelete={(messageId) => console.log('删除消息:', messageId)}
/>
```

### CustomerList 客户列表组件

```tsx
import { CustomerList } from '@enterprise/shared-components';

<CustomerList
  customers={customers}
  currentCustomerId="customer-001"
  onCustomerSelect={(customer) => console.log('选择客户:', customer)}
  onSendMessage={(customerId) => console.log('发送消息给:', customerId)}
  onCall={(customerId, type) => console.log('呼叫客户:', customerId, type)}
  loading={false}
/>
```

### ChatInterface 聊天界面组件

```tsx
import { ChatInterface } from '@enterprise/shared-components';

<ChatInterface
  agentId="agent-001"
  agentInfo={agentInfo}
  isMinimized={false}
  onMinimize={() => setIsMinimized(true)}
  onMaximize={() => setIsMinimized(false)}
  onClose={() => console.log('关闭聊天')}
/>
```

## 🎣 Hooks API

### useSession 会话管理

```tsx
import { useSession } from '@enterprise/shared-components';

const { 
  isConnected, 
  user, 
  connectionId, 
  connect, 
  disconnect 
} = useSession();
```

### useMessages 消息管理

```tsx
import { useMessages } from '@enterprise/shared-components';

const { 
  messages, 
  isLoading, 
  hasMore, 
  sendMessage, 
  addMessage, 
  updateMessageStatus, 
  loadMore 
} = useMessages(recipientId);
```

### useWebSocket WebSocket连接

```tsx
import { useWebSocket } from '@enterprise/shared-components';

const { 
  isConnected, 
  error, 
  connect, 
  disconnect, 
  reconnect 
} = useWebSocket(websocketUrl);
```

### useSystemStatus 系统状态

```tsx
import { useSystemStatus } from '@enterprise/shared-components';

const { 
  systemStatus, 
  isLoading, 
  error, 
  refetch 
} = useSystemStatus();
```

## 🛠️ 工具函数

### 日期格式化

```tsx
import { formatDate, formatRelativeTime } from '@enterprise/shared-components';

formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'); // 2024-01-01 12:00:00
formatRelativeTime(new Date()); // 刚刚
```

### 文件处理

```tsx
import { 
  formatFileSize, 
  isImageFile, 
  isVideoFile, 
  isAudioFile 
} from '@enterprise/shared-components';

formatFileSize(1024); // 1 KB
isImageFile('image.jpg'); // true
```

### 防抖和节流

```tsx
import { debounce, throttle } from '@enterprise/shared-components';

const debouncedFn = debounce(() => console.log('debounced'), 300);
const throttledFn = throttle(() => console.log('throttled'), 100);
```

## 🎨 主题定制

```tsx
import { theme } from '@enterprise/shared-components';

// 自定义主题
const customTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary: '#your-primary-color',
    secondary: '#your-secondary-color'
  }
};
```

## 📱 响应式设计

组件库内置响应式设计，支持以下断点：

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🔒 安全性

- 所有API请求都包含认证token
- 支持HTTPS和WSS协议
- 输入验证和XSS防护
- 敏感数据加密存储

## 📊 性能优化

- 组件懒加载
- 虚拟滚动支持
- 消息分页加载
- 图片懒加载
- 防抖和节流优化

## 🐛 错误处理

```tsx
import { handleError } from '@enterprise/shared-components';

try {
  // 你的代码
} catch (error) {
  handleError(error, '操作失败');
}
```

## 📈 性能监控

```tsx
import { usePerformanceMonitor } from '@enterprise/shared-components';

function MyComponent() {
  const { renderCount, mountTime } = usePerformanceMonitor('MyComponent');
  
  return <div>组件渲染次数: {renderCount}</div>;
}
```

## 🔧 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请联系开发团队或查看文档。