# 前端组件库

这个目录包含了为客服聊天系统创建的可复用前端组件。

## 组件列表

### 1. MessageBubble - 消息气泡组件

用于显示聊天消息的组件，支持多种消息类型。

**特性：**
- 支持文本、图片、文件、系统消息等多种类型
- 显示发送时间和消息状态
- 支持自定义样式和布局
- 响应式设计

**使用方法：**
```jsx
import { MessageBubble } from './components';

const message = {
  content: '您好！请问有什么可以帮助您的吗？',
  type: 'text',
  timestamp: new Date(),
  sender: { name: '客服小王', username: 'kefu001' },
  status: 'read'
};

<MessageBubble 
  message={message}
  isOwn={false}
  showAvatar={true}
  showTime={true}
  onImageClick={(url) => console.log('点击图片:', url)}
/>
```

**Props：**
- `message` (object): 消息对象
- `isOwn` (boolean): 是否为自己的消息
- `showAvatar` (boolean): 是否显示头像
- `showTime` (boolean): 是否显示时间
- `onImageClick` (function): 图片点击回调

### 2. UserAvatar - 用户头像组件

统一的用户头像显示组件，支持在线状态显示。

**特性：**
- 支持在线状态指示器
- 可自定义大小
- 支持工具提示
- 点击事件处理

**使用方法：**
```jsx
import { UserAvatar } from './components';

const user = {
  id: '1',
  name: '客服小王',
  username: 'kefu001',
  status: 'online',
  isOnline: true
};

<UserAvatar 
  user={user}
  size="lg"
  showStatus={true}
  showTooltip={true}
  onClick={() => console.log('点击头像')}
/>
```

**Props：**
- `user` (object): 用户对象
- `size` (string): 头像大小 ('sm', 'md', 'lg')
- `showStatus` (boolean): 是否显示状态指示器
- `showTooltip` (boolean): 是否显示工具提示
- `onClick` (function): 点击回调
- `className` (string): 自定义样式类

### 3. StatusIndicator - 状态指示器组件

用于显示各种状态信息的组件。

**特性：**
- 支持连接状态、在线状态、消息状态
- 内置图标和颜色
- 可自定义显示内容
- 支持加载动画

**使用方法：**
```jsx
import { StatusIndicator, ConnectionStatus, OnlineStatus } from './components';

// 连接状态
<StatusIndicator status={ConnectionStatus.CONNECTED} type="connection" />

// 在线状态
<StatusIndicator status={OnlineStatus.ONLINE} type="online" />

// 自定义显示
<StatusIndicator 
  status="custom"
  type="connection"
  showIcon={true}
  showText={false}
/>
```

**Props：**
- `status` (string): 状态值
- `type` (string): 状态类型 ('connection', 'online', 'message')
- `size` (string): 组件大小
- `showIcon` (boolean): 是否显示图标
- `showText` (boolean): 是否显示文本
- `className` (string): 自定义样式类

### 4. LoadingSpinner - 加载动画组件

统一的加载动画组件，支持多种动画类型。

**特性：**
- 多种加载动画类型
- 支持全屏和覆盖层模式
- 可自定义文本和样式
- 响应式设计

**使用方法：**
```jsx
import { LoadingSpinner, LoadingType } from './components';

// 基本使用
<LoadingSpinner />

// 自定义类型
<LoadingSpinner type={LoadingType.DOTS} text="加载中..." />

// 全屏加载
<LoadingSpinner fullScreen={true} />

// 覆盖层加载
<LoadingSpinner overlay={true} />
```

**Props：**
- `type` (string): 加载类型 ('spinner', 'dots', 'pulse', 'ring', 'bars', 'custom')
- `size` (string): 大小 ('sm', 'md', 'lg')
- `text` (string): 加载文本
- `showText` (boolean): 是否显示文本
- `fullScreen` (boolean): 是否全屏显示
- `overlay` (boolean): 是否显示为覆盖层
- `className` (string): 自定义样式类

### 5. Notification - 通知组件

用于显示通知消息的组件。

**特性：**
- 支持多种通知类型
- 自动消失功能
- 可自定义位置和样式
- 支持手动关闭

**使用方法：**
```jsx
import { Notification, NotificationType } from './components';

<Notification
  type={NotificationType.SUCCESS}
  title="成功"
  message="操作成功完成！"
  duration={5000}
  position="top-right"
  onClose={() => console.log('通知关闭')}
/>
```

**Props：**
- `type` (string): 通知类型 ('success', 'error', 'warning', 'info')
- `title` (string): 通知标题
- `message` (string): 通知内容
- `duration` (number): 显示时长（毫秒，0表示不自动消失）
- `showClose` (boolean): 是否显示关闭按钮
- `onClose` (function): 关闭回调
- `position` (string): 显示位置
- `className` (string): 自定义样式类

### 6. NotificationManager - 通知管理器

用于管理多个通知的组件。

**使用方法：**
```jsx
import { NotificationManager } from './components';

function App() {
  return (
    <NotificationManager>
      <div>您的应用内容</div>
    </NotificationManager>
  );
}
```

## 常量导出

组件库还导出了常用的常量：

```jsx
import {
  ConnectionStatus,
  OnlineStatus,
  MessageStatus,
  LoadingType,
  LoadingSize,
  NotificationType,
  NotificationPosition
} from './components';
```

## 样式定制

所有组件都使用 Tailwind CSS 进行样式设计，可以通过以下方式进行定制：

1. **通过 className 属性：**
```jsx
<MessageBubble className="custom-message-bubble" />
```

2. **通过 CSS 变量：**
```css
:root {
  --primary-color: #007bff;
  --success-color: #28a745;
  --danger-color: #dc3545;
}
```

3. **通过 Tailwind 配置：**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        success: '#28a745',
        danger: '#dc3545',
      }
    }
  }
}
```

## 最佳实践

1. **组件复用：** 尽量使用这些通用组件，保持界面一致性
2. **性能优化：** 对于列表渲染，使用 React.memo 优化性能
3. **错误处理：** 为所有回调函数添加错误处理
4. **可访问性：** 确保组件支持键盘导航和屏幕阅读器
5. **响应式设计：** 在不同屏幕尺寸下测试组件表现

## 示例

查看 `ComponentShowcase.jsx` 文件了解所有组件的完整使用示例。