import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { 
  OptimizedPortal, 
  useOptimizedCache, 
  useDebounce, 
  useThrottle,
  PerformanceMonitor 
} from './EnterpriseCore';

// 通知类型枚举 - 与后端SystemMessageType对应
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  CHAT: 'chat',
  SYSTEM: 'system',
  ALERT: 'alert',
  USER_ACTION: 'user_action',      // 对应后端UserAction
  SERVICE_STATUS: 'service_status', // 对应后端ServiceStatus
  SECURITY: 'security',            // 对应后端Security
  PERFORMANCE: 'performance',      // 对应后端Performance
  CONFIGURATION: 'configuration',  // 对应后端Configuration
  NOTIFICATION: 'notification'     // 对应后端Notification
};

// 通知优先级 - 与后端MessagePriority对应
export const NotificationPriority = {
  LOW: 'low',        // 对应后端Low
  NORMAL: 'normal',  // 对应后端Normal
  HIGH: 'high',      // 对应后端High
  URGENT: 'urgent'   // 对应后端Critical
};

// 通知位置
export const NotificationPosition = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  TOP_CENTER: 'top-center',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_CENTER: 'bottom-center'
};

// 后端消息类型映射
const BACKEND_MESSAGE_TYPES = {
  'UserAction': NotificationType.USER_ACTION,
  'ServiceStatus': NotificationType.SERVICE_STATUS,
  'Security': NotificationType.SECURITY,
  'Performance': NotificationType.PERFORMANCE,
  'Configuration': NotificationType.CONFIGURATION,
  'Error': NotificationType.ERROR,
  'Notification': NotificationType.NOTIFICATION,
  'Chat': NotificationType.CHAT,
  'System': NotificationType.SYSTEM
};

// 后端优先级映射
const BACKEND_PRIORITY_MAP = {
  1: NotificationPriority.LOW,      // Low
  2: NotificationPriority.NORMAL,   // Normal
  3: NotificationPriority.HIGH,     // High
  4: NotificationPriority.URGENT    // Critical
};

// 通知管理器
export class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = new Map();
    this.maxNotifications = 10;
    this.autoDismissDelay = 5000;
    this.soundEnabled = true;
    this.desktopNotificationsEnabled = false;
    this.websocketClient = null;
    this.userId = null;
  }

  // 设置WebSocket客户端
  setWebSocketClient(client, userId) {
    this.websocketClient = client;
    this.userId = userId;
  }

  // 处理后端WebSocket消息
  handleBackendMessage(message) {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      // 处理不同类型的后端消息
      switch (data.type) {
        case 'Chat':
          this.handleChatMessage(data);
          break;
        case 'System':
          this.handleSystemMessage(data);
          break;
        case 'Status':
          this.handleStatusMessage(data);
          break;
        case 'UserJoined':
          this.handleUserJoinedMessage(data);
          break;
        case 'UserLeft':
          this.handleUserLeftMessage(data);
          break;
        case 'Error':
          this.handleErrorMessage(data);
          break;
        case 'Welcome':
          this.handleWelcomeMessage(data);
          break;
        case 'OnlineUsers':
          this.handleOnlineUsersMessage(data);
          break;
        default:
          // 处理其他消息类型
          this.handleGenericMessage(data);
      }
    } catch (error) {
      console.error('处理后端消息失败:', error);
    }
  }

  // 处理聊天消息
  handleChatMessage(data) {
    if (data.from && data.from !== this.userId) {
      this.add({
        type: NotificationType.CHAT,
        priority: NotificationPriority.NORMAL,
        title: '新消息',
        message: `${data.from}: ${data.content}`,
        autoDismiss: true,
        dismissDelay: 4000,
        data: {
          messageId: data.id,
          fromUser: data.from,
          toUser: data.to,
          timestamp: data.timestamp
        }
      });
    }
  }

  // 处理系统消息
  handleSystemMessage(data) {
    const systemType = data.system_type || 'System';
    const notificationType = BACKEND_MESSAGE_TYPES[systemType] || NotificationType.SYSTEM;
    const priority = BACKEND_PRIORITY_MAP[data.priority] || NotificationPriority.NORMAL;

    this.add({
      type: notificationType,
      priority: priority,
      title: '系统消息',
      message: data.content,
      autoDismiss: data.priority < 3, // 高优先级不自动关闭
      dismissDelay: data.priority >= 3 ? 8000 : 5000,
      data: {
        systemType: systemType,
        metadata: data.metadata,
        additionalData: data.data
      }
    });
  }

  // 处理状态消息
  handleStatusMessage(data) {
    const status = data.status;
    const priority = status === 'Online' ? NotificationPriority.LOW : NotificationPriority.NORMAL;

    this.add({
      type: NotificationType.SYSTEM,
      priority: priority,
      title: '状态更新',
      message: `用户 ${data.user_id} 状态变更为: ${status}`,
      autoDismiss: true,
      dismissDelay: 3000,
      data: {
        userId: data.user_id,
        status: status,
        previousStatus: data.previous_status
      }
    });
  }

  // 处理用户加入消息
  handleUserJoinedMessage(data) {
    this.add({
      type: NotificationType.USER_ACTION,
      priority: NotificationPriority.LOW,
      title: '用户上线',
      message: `${data.user_name} (${data.user_type}) 已上线`,
      autoDismiss: true,
      dismissDelay: 3000,
      data: {
        userId: data.user_id,
        userName: data.user_name,
        userType: data.user_type
      }
    });
  }

  // 处理用户离开消息
  handleUserLeftMessage(data) {
    this.add({
      type: NotificationType.USER_ACTION,
      priority: NotificationPriority.LOW,
      title: '用户离线',
      message: `${data.user_name} (${data.user_type}) 已离线`,
      autoDismiss: true,
      dismissDelay: 3000,
      data: {
        userId: data.user_id,
        userName: data.user_name,
        userType: data.user_type
      }
    });
  }

  // 处理错误消息
  handleErrorMessage(data) {
    this.add({
      type: NotificationType.ERROR,
      priority: NotificationPriority.URGENT,
      title: '系统错误',
      message: data.message || '发生未知错误',
      autoDismiss: false,
      actions: [
        {
          label: '查看详情',
          type: 'secondary',
          handler: () => {
            console.log('错误详情:', data);
          }
        },
        {
          label: '忽略',
          type: 'secondary',
          dismiss: true
        }
      ],
      data: {
        errorCode: data.code,
        errorDetails: data.details
      }
    });
  }

  // 处理欢迎消息
  handleWelcomeMessage(data) {
    this.add({
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.NORMAL,
      title: '连接成功',
      message: `欢迎 ${data.user_name}！系统连接已建立`,
      autoDismiss: true,
      dismissDelay: 3000,
      data: {
        userId: data.user_id,
        userName: data.user_name,
        userType: data.user_type
      }
    });
  }

  // 处理在线用户消息
  handleOnlineUsersMessage(data) {
    // 通常不需要显示通知，但可以记录日志
    console.log('在线用户更新:', data.users?.length || 0, '个用户');
  }

  // 处理通用消息
  handleGenericMessage(data) {
    this.add({
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      title: '系统通知',
      message: data.content || JSON.stringify(data),
      autoDismiss: true,
      dismissDelay: 5000,
      data: data
    });
  }

  // 处理Redis通知频道消息
  handleRedisNotification(channel, message) {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      // 根据频道类型处理不同的通知
      if (channel.includes(':notifications')) {
        this.handleNotificationChannel(data);
      } else if (channel.includes(':messages')) {
        this.handleMessageChannel(data);
      } else if (channel === 'system:broadcasts') {
        this.handleSystemBroadcast(data);
      } else if (channel.includes(':events')) {
        this.handleSessionEvent(data);
      }
    } catch (error) {
      console.error('处理Redis通知失败:', error);
    }
  }

  // 处理通知频道消息
  handleNotificationChannel(data) {
    const notificationType = data.notification_type || NotificationType.INFO;
    const priority = BACKEND_PRIORITY_MAP[data.priority] || NotificationPriority.NORMAL;

    this.add({
      type: notificationType,
      priority: priority,
      title: data.title || '通知',
      message: data.message || data.content,
      autoDismiss: data.auto_dismiss !== false,
      dismissDelay: data.dismiss_delay || this.autoDismissDelay,
      actions: data.actions || [],
      data: data
    });
  }

  // 处理消息频道
  handleMessageChannel(data) {
    if (data.type === 'new_message') {
      this.add({
        type: NotificationType.CHAT,
        priority: NotificationPriority.NORMAL,
        title: '新消息',
        message: `收到来自 ${data.from} 的新消息`,
        autoDismiss: true,
        dismissDelay: 4000,
        data: {
          messageId: data.message_id,
          fromUser: data.from,
          priority: data.priority
        }
      });
    }
  }

  // 处理系统广播
  handleSystemBroadcast(data) {
    this.add({
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.HIGH,
      title: '系统广播',
      message: data.message || data.content,
      autoDismiss: data.auto_dismiss !== false,
      dismissDelay: data.dismiss_delay || 6000,
      data: data
    });
  }

  // 处理会话事件
  handleSessionEvent(data) {
    const eventType = data.event_type;
    
    switch (eventType) {
      case 'session_established':
        this.add({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.NORMAL,
          title: '会话建立',
          message: `与 ${data.partner_name || data.partner_id} 的会话已建立`,
          autoDismiss: true,
          dismissDelay: 3000,
          data: data
        });
        break;
      case 'session_ended':
        this.add({
          type: NotificationType.INFO,
          priority: NotificationPriority.NORMAL,
          title: '会话结束',
          message: `与 ${data.partner_name || data.partner_id} 的会话已结束`,
          autoDismiss: true,
          dismissDelay: 3000,
          data: data
        });
        break;
      case 'customer_assigned':
        this.add({
          type: NotificationType.INFO,
          priority: NotificationPriority.HIGH,
          title: '客户分配',
          message: `新客户 ${data.customer_name || data.customer_id} 已分配给您`,
          autoDismiss: false,
          actions: [
            {
              label: '开始对话',
              type: 'primary',
              handler: () => {
                // 触发开始对话逻辑
                console.log('开始与客户对话:', data.customer_id);
              }
            }
          ],
          data: data
        });
        break;
      default:
        this.handleGenericMessage(data);
    }
  }

  // 添加通知
  add(notification) {
    const id = notification.id || `notification_${Date.now()}_${Math.random()}`;
    const fullNotification = {
      id,
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      autoDismiss: true,
      dismissible: true,
      timestamp: new Date(),
      read: false,
      ...notification
    };

    this.notifications.unshift(fullNotification);

    // 限制通知数量
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // 触发事件
    this.emit('notificationAdded', fullNotification);
    this.emit('notificationsChanged', this.notifications);

    // 播放声音
    if (this.soundEnabled && fullNotification.sound !== false) {
      this.playNotificationSound(fullNotification.type);
    }

    // 桌面通知
    if (this.desktopNotificationsEnabled && fullNotification.desktop !== false) {
      this.showDesktopNotification(fullNotification);
    }

    // 自动关闭
    if (fullNotification.autoDismiss) {
      setTimeout(() => {
        this.remove(id);
      }, fullNotification.dismissDelay || this.autoDismissDelay);
    }

    return id;
  }

  // 移除通知
  remove(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      const notification = this.notifications[index];
      this.notifications.splice(index, 1);
      this.emit('notificationRemoved', notification);
      this.emit('notificationsChanged', this.notifications);
    }
  }

  // 标记为已读
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.emit('notificationRead', notification);
      this.emit('notificationsChanged', this.notifications);
    }
  }

  // 标记所有为已读
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.emit('allNotificationsRead');
    this.emit('notificationsChanged', this.notifications);
  }

  // 清空所有通知
  clear() {
    this.notifications = [];
    this.emit('notificationsCleared');
    this.emit('notificationsChanged', this.notifications);
  }

  // 获取通知
  get(id) {
    return this.notifications.find(n => n.id === id);
  }

  // 获取所有通知
  getAll() {
    return [...this.notifications];
  }

  // 获取未读通知
  getUnread() {
    return this.notifications.filter(n => !n.read);
  }

  // 获取未读数量
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // 按类型获取通知
  getByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  // 按优先级获取通知
  getByPriority(priority) {
    return this.notifications.filter(n => n.priority === priority);
  }

  // 播放通知声音
  playNotificationSound(type) {
    const soundMap = {
      [NotificationType.INFO]: '/sounds/notification-info.mp3',
      [NotificationType.SUCCESS]: '/sounds/notification-success.mp3',
      [NotificationType.WARNING]: '/sounds/notification-warning.mp3',
      [NotificationType.ERROR]: '/sounds/notification-error.mp3',
      [NotificationType.CHAT]: '/sounds/notification-chat.mp3',
      [NotificationType.SYSTEM]: '/sounds/notification-system.mp3',
      [NotificationType.ALERT]: '/sounds/notification-alert.mp3',
      [NotificationType.USER_ACTION]: '/sounds/notification-user.mp3',
      [NotificationType.SERVICE_STATUS]: '/sounds/notification-service.mp3',
      [NotificationType.SECURITY]: '/sounds/notification-security.mp3',
      [NotificationType.PERFORMANCE]: '/sounds/notification-performance.mp3',
      [NotificationType.CONFIGURATION]: '/sounds/notification-config.mp3',
      [NotificationType.NOTIFICATION]: '/sounds/notification-general.mp3'
    };

    const soundUrl = soundMap[type] || soundMap[NotificationType.INFO];
    
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('播放通知声音失败:', error);
    }
  }

  // 显示桌面通知
  showDesktopNotification(notification) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title || '新通知', {
        body: notification.message,
        icon: notification.icon || '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === NotificationPriority.URGENT
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showDesktopNotification(notification);
        }
      });
    }
  }

  // 事件监听
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`通知事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  // 设置配置
  setConfig(config) {
    Object.assign(this, config);
  }
}

// 全局通知管理器实例
export const notificationManager = new NotificationManager();

// 通知组件
export const Notification = React.memo(({ 
  notification, 
  onDismiss, 
  onAction,
  position = NotificationPosition.TOP_RIGHT,
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    // 动画进入
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(notification.id), 300);
  }, [notification.id, onDismiss]);

  const handleAction = useCallback((action) => {
    onAction?.(notification, action);
  }, [notification, onAction]);

  const getTypeIcon = () => {
    const iconMap = {
      [NotificationType.INFO]: 'ℹ️',
      [NotificationType.SUCCESS]: '✅',
      [NotificationType.WARNING]: '⚠️',
      [NotificationType.ERROR]: '❌',
      [NotificationType.CHAT]: '💬',
      [NotificationType.SYSTEM]: '⚙️',
      [NotificationType.ALERT]: '🚨',
      [NotificationType.USER_ACTION]: '👤',
      [NotificationType.SERVICE_STATUS]: '🔧',
      [NotificationType.SECURITY]: '🔒',
      [NotificationType.PERFORMANCE]: '📊',
      [NotificationType.CONFIGURATION]: '⚙️',
      [NotificationType.NOTIFICATION]: '📢'
    };
    return iconMap[notification.type] || iconMap[NotificationType.INFO];
  };

  const getPriorityColor = () => {
    const colorMap = {
      [NotificationPriority.LOW]: 'var(--gray-500)',
      [NotificationPriority.NORMAL]: 'var(--primary-color)',
      [NotificationPriority.HIGH]: 'var(--warning-color)',
      [NotificationPriority.URGENT]: 'var(--error-color)'
    };
    return colorMap[notification.priority] || colorMap[NotificationPriority.NORMAL];
  };

  return (
    <PerformanceMonitor componentName="Notification">
      <div
        ref={notificationRef}
        className={`enterprise-notification ${notification.type} ${notification.priority} ${className}`}
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          opacity: isVisible ? 1 : 0,
          borderLeftColor: getPriorityColor()
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="notification-header">
          <div className="notification-icon">
            {notification.icon || getTypeIcon()}
          </div>
          
          <div className="notification-content">
            <div className="notification-title">
              {notification.title}
            </div>
            <div className="notification-message">
              {notification.message}
            </div>
            {notification.details && (
              <div className="notification-details">
                {notification.details}
              </div>
            )}
          </div>
          
          <div className="notification-actions">
            {notification.actions?.map((action, index) => (
              <button
                key={index}
                className={`action-btn ${action.type || 'secondary'}`}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ))}
            
            {notification.dismissible && (
              <button
                className="dismiss-btn"
                onClick={handleDismiss}
                aria-label="关闭通知"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {notification.progress !== undefined && (
          <div className="notification-progress">
            <div 
              className="progress-bar"
              style={{ width: `${notification.progress}%` }}
            />
          </div>
        )}
        
        <div className="notification-timestamp">
          {formatTimestamp(notification.timestamp)}
        </div>
      </div>
    </PerformanceMonitor>
  );
});

// 通知容器组件
export const NotificationContainer = React.memo(({ 
  position = NotificationPosition.TOP_RIGHT,
  maxNotifications = 5,
  className = ""
}) => {
  const [notifications, setNotifications] = useState([]);
  const { getCached, setCached } = useOptimizedCache(50);

  useEffect(() => {
    const handleNotificationsChanged = (newNotifications) => {
      setNotifications(newNotifications.slice(0, maxNotifications));
    };

    notificationManager.on('notificationsChanged', handleNotificationsChanged);
    
    // 初始化
    setNotifications(notificationManager.getAll().slice(0, maxNotifications));

    return () => {
      notificationManager.off('notificationsChanged', handleNotificationsChanged);
    };
  }, [maxNotifications]);

  const handleDismiss = useCallback((id) => {
    notificationManager.remove(id);
  }, []);

  const handleAction = useCallback((notification, action) => {
    if (action.handler) {
      action.handler(notification, action);
    }
    if (action.dismiss) {
      notificationManager.remove(notification.id);
    }
  }, []);

  return (
    <div className={`notification-container ${position} ${className}`}>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
          onAction={handleAction}
          position={position}
        />
      ))}
    </div>
  );
});

// 通知中心组件
export const NotificationCenter = React.memo(({ 
  isOpen, 
  onClose,
  className = ""
}) => {
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const handleNotificationsChanged = (newNotifications) => {
      setNotifications(newNotifications);
    };

    notificationManager.on('notificationsChanged', handleNotificationsChanged);
    setNotifications(notificationManager.getAll());

    return () => {
      notificationManager.off('notificationsChanged', handleNotificationsChanged);
    };
  }, []);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // 按类型过滤
    if (activeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter);
    }

    // 按搜索词过滤
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(searchLower) ||
        n.message?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [notifications, activeFilter, debouncedSearchTerm]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
  }, []);

  const handleClearAll = useCallback(() => {
    notificationManager.clear();
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
      notificationManager.markAsRead(notification.id);
    }
  }, []);

  const getTypeCount = (type) => {
    return notifications.filter(n => n.type === type).length;
  };

  if (!isOpen) return null;

  return (
    <OptimizedPortal>
      <div className="notification-center-overlay" onClick={onClose}>
        <div 
          className={`notification-center ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="notification-center-header">
            <h2>通知中心 ({unreadCount} 未读)</h2>
            <div className="header-actions">
              <button onClick={handleMarkAllAsRead}>全部已读</button>
              <button onClick={handleClearAll}>清空</button>
              <button onClick={onClose}>×</button>
            </div>
          </div>

          <div className="notification-center-filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索通知..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-tabs">
              <button
                className={activeFilter === 'all' ? 'active' : ''}
                onClick={() => setActiveFilter('all')}
              >
                全部 ({notifications.length})
              </button>
              <button
                className={activeFilter === NotificationType.CHAT ? 'active' : ''}
                onClick={() => setActiveFilter(NotificationType.CHAT)}
              >
                聊天 ({getTypeCount(NotificationType.CHAT)})
              </button>
              <button
                className={activeFilter === NotificationType.SYSTEM ? 'active' : ''}
                onClick={() => setActiveFilter(NotificationType.SYSTEM)}
              >
                系统 ({getTypeCount(NotificationType.SYSTEM)})
              </button>
              <button
                className={activeFilter === NotificationType.ALERT ? 'active' : ''}
                onClick={() => setActiveFilter(NotificationType.ALERT)}
              >
                告警 ({getTypeCount(NotificationType.ALERT)})
              </button>
            </div>
          </div>

          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <p>暂无通知</p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-icon">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="notification-item-content">
                    <div className="notification-item-title">
                      {notification.title}
                    </div>
                    <div className="notification-item-message">
                      {notification.message}
                    </div>
                    <div className="notification-item-meta">
                      <span className="timestamp">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                      {notification.priority !== NotificationPriority.NORMAL && (
                        <span className={`priority ${notification.priority}`}>
                          {notification.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="notification-item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        notificationManager.remove(notification.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </OptimizedPortal>
  );
});

// 通知徽章组件
export const NotificationBadge = React.memo(({ 
  count, 
  onClick,
  className = ""
}) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNotificationsChanged = (newNotifications) => {
      setNotifications(newNotifications);
    };

    notificationManager.on('notificationsChanged', handleNotificationsChanged);
    setNotifications(notificationManager.getAll());

    return () => {
      notificationManager.off('notificationsChanged', handleNotificationsChanged);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayCount = count !== undefined ? count : unreadCount;

  if (displayCount === 0) return null;

  return (
    <div 
      className={`notification-badge ${className}`}
      onClick={onClick}
    >
      <span className="badge-count">
        {displayCount > 99 ? '99+' : displayCount}
      </span>
    </div>
  );
});

// 智能提醒组件
export const SmartReminder = React.memo(({ 
  reminders = [],
  onReminderTrigger,
  className = ""
}) => {
  const [activeReminders, setActiveReminders] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // 检查提醒
    const checkReminders = () => {
      const now = new Date();
      const triggered = reminders.filter(reminder => {
        if (reminder.triggered) return false;
        
        const triggerTime = new Date(reminder.triggerTime);
        return now >= triggerTime;
      });

      triggered.forEach(reminder => {
        reminder.triggered = true;
        onReminderTrigger?.(reminder);
        
        // 发送通知
        notificationManager.add({
          type: NotificationType.ALERT,
          priority: NotificationPriority.HIGH,
          title: reminder.title,
          message: reminder.message,
          autoDismiss: false,
          actions: reminder.actions
        });
      });

      setActiveReminders(reminders.filter(r => !r.triggered));
    };

    // 初始化
    checkReminders();
    setActiveReminders(reminders.filter(r => !r.triggered));

    // 设置定时检查
    intervalRef.current = setInterval(checkReminders, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [reminders, onReminderTrigger]);

  return (
    <div className={`smart-reminder ${className}`}>
      {activeReminders.map(reminder => (
        <div key={reminder.id} className="reminder-item">
          <div className="reminder-time">
            {formatTimeUntil(new Date(reminder.triggerTime))}
          </div>
          <div className="reminder-content">
            <div className="reminder-title">{reminder.title}</div>
            <div className="reminder-message">{reminder.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
});

// 工具函数
const formatTimestamp = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now - time;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  
  return time.toLocaleDateString();
};

const formatTimeUntil = (targetTime) => {
  const now = new Date();
  const diff = targetTime - now;

  if (diff <= 0) return '已到期';
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

const getTypeIcon = (type) => {
  const iconMap = {
    [NotificationType.INFO]: 'ℹ️',
    [NotificationType.SUCCESS]: '✅',
    [NotificationType.WARNING]: '⚠️',
    [NotificationType.ERROR]: '❌',
    [NotificationType.CHAT]: '💬',
    [NotificationType.SYSTEM]: '⚙️',
    [NotificationType.ALERT]: '🚨',
    [NotificationType.USER_ACTION]: '👤',
    [NotificationType.SERVICE_STATUS]: '🔧',
    [NotificationType.SECURITY]: '🔒',
    [NotificationType.PERFORMANCE]: '📊',
    [NotificationType.CONFIGURATION]: '⚙️',
    [NotificationType.NOTIFICATION]: '📢'
  };
  return iconMap[type] || iconMap[NotificationType.INFO];
};

// React Hook for 通知管理
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNotificationsChanged = (newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    };

    notificationManager.on('notificationsChanged', handleNotificationsChanged);
    
    // 初始化
    const allNotifications = notificationManager.getAll();
    setNotifications(allNotifications);
    setUnreadCount(allNotifications.filter(n => !n.read).length);

    return () => {
      notificationManager.off('notificationsChanged', handleNotificationsChanged);
    };
  }, []);

  const addNotification = useCallback((notification) => {
    return notificationManager.add(notification);
  }, []);

  const removeNotification = useCallback((id) => {
    notificationManager.remove(id);
  }, []);

  const markAsRead = useCallback((id) => {
    notificationManager.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationManager.clear();
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

// 导出所有组件和工具
export default {
  Notification,
  NotificationContainer,
  NotificationCenter,
  NotificationBadge,
  SmartReminder,
  useNotifications,
  notificationManager,
  NotificationType,
  NotificationPriority,
  NotificationPosition
};