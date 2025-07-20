# 企业级通知/提醒系统

## 概述

企业级通知/提醒系统是一个功能完整、性能优化的React组件库，专为现代Web应用设计。系统支持多种通知类型、智能提醒、优先级管理、声音提醒、桌面通知等功能。

## 核心特性

### 🚀 高性能
- 虚拟化渲染，支持大量通知
- 内存优化，防止内存泄漏
- 防抖和节流优化
- 硬件加速动画

### 🎨 现代化UI
- 响应式设计，支持移动端
- 深色模式支持
- 高对比度模式
- 减少动画模式支持

### 🔔 丰富功能
- 7种通知类型
- 4个优先级等级
- 6个显示位置
- 智能提醒系统
- 通知中心
- 声音和桌面通知

### 🛡️ 企业级稳定性
- 错误边界保护
- 自动重连机制
- 事件监听管理
- 内存泄漏防护

## 快速开始

### 安装

```bash
# 确保已安装企业级组件库
npm install @enterprise/kefu-components
```

### 基础使用

```jsx
import React from 'react';
import {
  NotificationContainer,
  NotificationCenter,
  NotificationBadge,
  useNotifications,
  NotificationType,
  NotificationPriority
} from '@enterprise/kefu-components';

function App() {
  const { addNotification } = useNotifications();

  const handleSendNotification = () => {
    addNotification({
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.NORMAL,
      title: '操作成功',
      message: '文件上传完成',
      autoDismiss: true,
      dismissDelay: 3000
    });
  };

  return (
    <div>
      <button onClick={handleSendNotification}>
        发送通知
      </button>
      
      <NotificationContainer position="top-right" />
      <NotificationCenter />
    </div>
  );
}
```

## 组件详解

### NotificationManager

通知管理器是系统的核心，负责管理所有通知的生命周期。

```jsx
import { notificationManager } from '@enterprise/kefu-components';

// 配置管理器
notificationManager.setConfig({
  maxNotifications: 10,
  autoDismissDelay: 5000,
  soundEnabled: true,
  desktopNotificationsEnabled: true
});

// 添加通知
const notificationId = notificationManager.add({
  type: 'success',
  title: '成功',
  message: '操作完成'
});

// 移除通知
notificationManager.remove(notificationId);

// 标记为已读
notificationManager.markAsRead(notificationId);

// 清空所有通知
notificationManager.clear();
```

### NotificationContainer

通知容器组件，用于显示通知。

```jsx
<NotificationContainer 
  position="top-right"           // 显示位置
  maxNotifications={5}           // 最大显示数量
  className="custom-container"   // 自定义样式
/>
```

**位置选项：**
- `top-left` - 左上角
- `top-right` - 右上角
- `top-center` - 顶部中央
- `bottom-left` - 左下角
- `bottom-right` - 右下角
- `bottom-center` - 底部中央

### NotificationCenter

通知中心组件，提供完整的通知管理界面。

```jsx
<NotificationCenter 
  isOpen={isOpen}              // 是否显示
  onClose={() => setIsOpen(false)}  // 关闭回调
  className="custom-center"    // 自定义样式
/>
```

### NotificationBadge

通知徽章组件，显示未读通知数量。

```jsx
<NotificationBadge 
  count={unreadCount}          // 未读数量
  onClick={handleClick}        // 点击回调
  className="custom-badge"     // 自定义样式
/>
```

### SmartReminder

智能提醒组件，支持定时提醒功能。

```jsx
<SmartReminder 
  reminders={reminders}        // 提醒列表
  onReminderTrigger={handleTrigger}  // 触发回调
  className="custom-reminder"  // 自定义样式
/>
```

### useNotifications Hook

React Hook，提供通知管理功能。

```jsx
const {
  notifications,      // 所有通知
  unreadCount,        // 未读数量
  addNotification,    // 添加通知
  removeNotification, // 移除通知
  markAsRead,         // 标记已读
  markAllAsRead,      // 全部已读
  clearAll           // 清空所有
} = useNotifications();
```

## 通知类型

### NotificationType

```jsx
import { NotificationType } from '@enterprise/kefu-components';

// 信息通知
NotificationType.INFO

// 成功通知
NotificationType.SUCCESS

// 警告通知
NotificationType.WARNING

// 错误通知
NotificationType.ERROR

// 聊天通知
NotificationType.CHAT

// 系统通知
NotificationType.SYSTEM

// 告警通知
NotificationType.ALERT
```

### NotificationPriority

```jsx
import { NotificationPriority } from '@enterprise/kefu-components';

// 低优先级
NotificationPriority.LOW

// 普通优先级
NotificationPriority.NORMAL

// 高优先级
NotificationPriority.HIGH

// 紧急优先级
NotificationPriority.URGENT
```

## 通知配置

### 基础配置

```jsx
const notification = {
  id: 'unique-id',                    // 唯一标识
  type: NotificationType.INFO,        // 通知类型
  priority: NotificationPriority.NORMAL, // 优先级
  title: '通知标题',                   // 标题
  message: '通知内容',                 // 内容
  details: '详细信息',                 // 详细信息
  icon: '🎉',                        // 自定义图标
  autoDismiss: true,                  // 自动关闭
  dismissDelay: 5000,                 // 关闭延迟
  dismissible: true,                  // 可手动关闭
  sound: true,                        // 播放声音
  desktop: true,                      // 桌面通知
  progress: 50,                       // 进度条(0-100)
  actions: [                          // 操作按钮
    {
      label: '确定',
      type: 'primary',
      handler: () => console.log('确定'),
      dismiss: true
    }
  ]
};
```

### 操作按钮配置

```jsx
const action = {
  label: '按钮文本',           // 按钮文本
  type: 'primary',            // 按钮类型: primary, secondary, danger
  handler: () => {},          // 点击处理函数
  dismiss: true               // 点击后是否关闭通知
};
```

## 智能提醒

### 提醒配置

```jsx
const reminder = {
  id: 'unique-reminder-id',           // 唯一标识
  title: '提醒标题',                   // 标题
  message: '提醒内容',                 // 内容
  triggerTime: new Date('2024-01-01 10:00:00'), // 触发时间
  triggered: false,                   // 是否已触发
  actions: [                          // 触发时的操作
    {
      label: '立即处理',
      type: 'primary',
      handler: () => console.log('处理提醒')
    }
  ]
};
```

### 使用示例

```jsx
import React, { useState, useEffect } from 'react';
import { SmartReminder, useNotifications } from '@enterprise/kefu-components';

function ReminderExample() {
  const [reminders, setReminders] = useState([]);
  const { addNotification } = useNotifications();

  useEffect(() => {
    // 设置提醒
    const meetingReminder = {
      id: 'meeting',
      title: '团队会议',
      message: '下午2点有重要会议',
      triggerTime: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后
      triggered: false
    };
    
    setReminders([meetingReminder]);
  }, []);

  const handleReminderTrigger = (reminder) => {
    addNotification({
      type: 'alert',
      priority: 'high',
      title: reminder.title,
      message: reminder.message,
      autoDismiss: false
    });
  };

  return (
    <SmartReminder 
      reminders={reminders}
      onReminderTrigger={handleReminderTrigger}
    />
  );
}
```

## 声音和桌面通知

### 声音通知

系统支持为不同通知类型播放不同的声音：

```jsx
// 配置声音
notificationManager.setConfig({
  soundEnabled: true
});

// 自定义声音文件路径
const soundMap = {
  info: '/sounds/notification-info.mp3',
  success: '/sounds/notification-success.mp3',
  warning: '/sounds/notification-warning.mp3',
  error: '/sounds/notification-error.mp3',
  chat: '/sounds/notification-chat.mp3',
  system: '/sounds/notification-system.mp3',
  alert: '/sounds/notification-alert.mp3'
};
```

### 桌面通知

```jsx
// 请求权限
if ('Notification' in window) {
  Notification.requestPermission();
}

// 配置桌面通知
notificationManager.setConfig({
  desktopNotificationsEnabled: true
});
```

## 事件系统

### 监听事件

```jsx
// 通知添加事件
notificationManager.on('notificationAdded', (notification) => {
  console.log('新通知:', notification);
});

// 通知移除事件
notificationManager.on('notificationRemoved', (notification) => {
  console.log('通知移除:', notification);
});

// 通知变化事件
notificationManager.on('notificationsChanged', (notifications) => {
  console.log('通知列表变化:', notifications);
});

// 通知已读事件
notificationManager.on('notificationRead', (notification) => {
  console.log('通知已读:', notification);
});

// 全部已读事件
notificationManager.on('allNotificationsRead', () => {
  console.log('全部已读');
});

// 通知清空事件
notificationManager.on('notificationsCleared', () => {
  console.log('通知已清空');
});
```

### 移除监听

```jsx
const handleNotificationAdded = (notification) => {
  console.log('新通知:', notification);
};

// 添加监听
notificationManager.on('notificationAdded', handleNotificationAdded);

// 移除监听
notificationManager.off('notificationAdded', handleNotificationAdded);
```

## 性能优化

### 虚拟化渲染

对于大量通知，系统使用虚拟化技术优化性能：

```jsx
// 限制同时显示的通知数量
<NotificationContainer maxNotifications={10} />

// 通知中心使用虚拟化列表
<NotificationCenter />
```

### 内存管理

```jsx
// 自动清理过期通知
notificationManager.setConfig({
  maxNotifications: 50,  // 限制最大通知数量
  autoDismissDelay: 5000 // 自动关闭延迟
});

// 手动清理
notificationManager.clear();
```

### 防抖和节流

```jsx
import { useDebounce, useThrottle } from '@enterprise/kefu-components';

// 防抖搜索
const debouncedSearch = useDebounce(searchTerm, 300);

// 节流通知发送
const throttledAddNotification = useThrottle(addNotification, 1000);
```

## 样式定制

### CSS变量

```css
:root {
  /* 通知容器 */
  --notification-bg: white;
  --notification-border-radius: 8px;
  --notification-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  /* 通知类型颜色 */
  --info-color: #3b82f6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --chat-color: #8b5cf6;
  --system-color: #6b7280;
  --alert-color: #dc2626;
  
  /* 优先级样式 */
  --priority-low-opacity: 0.8;
  --priority-high-border-width: 6px;
  --priority-urgent-border-width: 8px;
}
```

### 自定义样式

```jsx
// 自定义通知样式
<NotificationContainer 
  className="custom-notifications"
  style={{
    '--notification-bg': '#f8fafc',
    '--notification-border-radius': '12px'
  }}
/>

// 自定义通知中心样式
<NotificationCenter 
  className="custom-notification-center"
/>
```

## 响应式设计

### 移动端适配

```css
@media (max-width: 768px) {
  .notification-container {
    max-width: calc(100vw - 2rem);
    min-width: auto;
  }
  
  .notification-center {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
  }
}

@media (max-width: 480px) {
  .notification-container {
    left: 1rem;
    right: 1rem;
    top: 1rem;
    bottom: 1rem;
  }
}
```

### 深色模式

```css
@media (prefers-color-scheme: dark) {
  .enterprise-notification {
    background: var(--gray-800);
    color: var(--gray-100);
  }
  
  .notification-center {
    background: var(--gray-800);
    color: var(--gray-100);
  }
}
```

## 无障碍支持

### 键盘导航

- `Tab` - 在通知元素间导航
- `Enter` - 激活按钮
- `Escape` - 关闭通知或通知中心
- `Space` - 切换复选框

### 屏幕阅读器

```jsx
// 通知包含适当的ARIA标签
<div 
  role="alert"
  aria-live="polite"
  aria-label="通知"
>
  <h3>{title}</h3>
  <p>{message}</p>
</div>

// 操作按钮包含描述性文本
<button 
  aria-label="关闭通知"
  onClick={handleDismiss}
>
  ×
</button>
```

### 高对比度模式

```css
@media (prefers-contrast: high) {
  .enterprise-notification {
    border: 2px solid var(--gray-900);
  }
  
  .notification-badge .badge-count {
    border: 2px solid var(--gray-900);
  }
}
```

## 错误处理

### 错误边界

```jsx
import { ErrorBoundary } from '@enterprise/kefu-components';

<ErrorBoundary 
  fallback={<div>通知系统加载失败</div>}
>
  <NotificationContainer />
</ErrorBoundary>
```

### 异常处理

```jsx
// 通知管理器包含错误处理
notificationManager.on('error', (error) => {
  console.error('通知系统错误:', error);
  // 发送错误报告
});

// 组件错误处理
try {
  notificationManager.add(notification);
} catch (error) {
  console.error('添加通知失败:', error);
  // 降级处理
}
```

## 最佳实践

### 通知设计原则

1. **简洁明了** - 通知内容应该简洁、清晰
2. **及时性** - 重要通知应该及时显示
3. **可操作** - 提供相关的操作按钮
4. **不干扰** - 避免过多通知影响用户体验

### 性能优化

1. **限制数量** - 控制同时显示的通知数量
2. **自动清理** - 及时清理过期通知
3. **防抖节流** - 避免频繁触发通知
4. **虚拟化** - 大量通知使用虚拟化渲染

### 用户体验

1. **渐进增强** - 基础功能可用，高级功能增强
2. **可访问性** - 支持键盘导航和屏幕阅读器
3. **响应式** - 适配不同屏幕尺寸
4. **个性化** - 允许用户自定义设置

## 故障排除

### 常见问题

**Q: 通知不显示？**
A: 检查容器是否正确渲染，确认z-index设置

**Q: 声音不播放？**
A: 检查浏览器权限，确认音频文件路径正确

**Q: 桌面通知不工作？**
A: 检查浏览器支持，确认用户已授权

**Q: 性能问题？**
A: 减少同时显示的通知数量，使用虚拟化渲染

### 调试模式

```jsx
// 启用调试模式
notificationManager.setConfig({
  debug: true
});

// 查看调试信息
console.log('通知状态:', notificationManager.getAll());
console.log('未读数量:', notificationManager.getUnreadCount());
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础通知功能
- 支持智能提醒
- 支持声音和桌面通知

### v1.1.0
- 添加通知中心
- 支持通知搜索和过滤
- 优化移动端体验
- 添加深色模式支持

### v1.2.0
- 添加虚拟化渲染
- 优化性能
- 增强无障碍支持
- 添加更多自定义选项

## 许可证

MIT License - 详见 LICENSE 文件