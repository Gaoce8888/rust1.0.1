import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  EnterpriseKefuApp as BaseApp,
  ErrorBoundary,
  PerformanceMonitor 
} from './EnterpriseCore';
import { 
  NotificationContainer, 
  NotificationCenter, 
  NotificationBadge,
  SmartReminder,
  useNotifications,
  notificationManager,
  NotificationType,
  NotificationPriority,
  NotificationPosition
} from './EnterpriseNotifications';
import { 
  EnterpriseChatContainer, 
  EnterpriseMessageInput, 
  MessageStatusIndicator,
  MessageType,
  MessagePriority 
} from './EnterpriseChat';
import { 
  useEnterpriseWebSocket, 
  ConnectionStatus, 
  WSMessageType,
  MessageQueueManager 
} from './EnterpriseWebSocket';
import { EnterpriseDashboard } from './EnterpriseDashboard';
import './EnterpriseStyles.css';

// 企业级客服应用（集成通知系统）
export const EnterpriseKefuAppWithNotifications = React.memo(({ 
  config = {},
  className = ""
}) => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const { unreadCount, addNotification } = useNotifications();

  // 初始化通知系统
  useEffect(() => {
    // 配置通知管理器
    notificationManager.setConfig({
      maxNotifications: config.maxNotifications || 10,
      autoDismissDelay: config.autoDismissDelay || 5000,
      soundEnabled: config.soundEnabled !== false,
      desktopNotificationsEnabled: config.desktopNotificationsEnabled || false
    });

    // 请求桌面通知权限
    if (config.desktopNotificationsEnabled && 'Notification' in window) {
      Notification.requestPermission();
    }

    // 添加欢迎通知
    addNotification({
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      title: '系统启动',
      message: '企业级客服系统已就绪',
      autoDismiss: true,
      dismissDelay: 3000
    });

    // 设置默认提醒
    const defaultReminders = [
      {
        id: 'daily-check',
        title: '每日系统检查',
        message: '请检查系统状态和连接情况',
        triggerTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后
        triggered: false
      }
    ];
    setReminders(defaultReminders);

  }, [config, addNotification]);

  // 处理提醒触发
  const handleReminderTrigger = useCallback((reminder) => {
    console.log('提醒触发:', reminder);
    
    // 可以在这里添加自定义逻辑
    if (reminder.id === 'daily-check') {
      // 设置下一个每日检查
      const nextReminder = {
        ...reminder,
        triggerTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        triggered: false
      };
      setReminders(prev => prev.map(r => r.id === reminder.id ? nextReminder : r));
    }
  }, []);

  // 处理WebSocket事件并发送通知
  const handleWebSocketEvent = useCallback((event, data) => {
    switch (event) {
      case 'message':
        // 新消息通知
        addNotification({
          type: NotificationType.CHAT,
          priority: NotificationPriority.NORMAL,
          title: '新消息',
          message: `收到来自 ${data.sender || '客户'} 的新消息`,
          autoDismiss: true,
          dismissDelay: 4000
        });
        break;
        
      case 'connection_lost':
        // 连接丢失通知
        addNotification({
          type: NotificationType.ERROR,
          priority: NotificationPriority.HIGH,
          title: '连接断开',
          message: 'WebSocket连接已断开，正在尝试重连...',
          autoDismiss: false,
          actions: [
            {
              label: '手动重连',
              type: 'primary',
              handler: () => {
                // 触发重连逻辑
                console.log('手动重连');
              }
            }
          ]
        });
        break;
        
      case 'connection_restored':
        // 连接恢复通知
        addNotification({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.NORMAL,
          title: '连接恢复',
          message: 'WebSocket连接已恢复',
          autoDismiss: true,
          dismissDelay: 3000
        });
        break;
        
      case 'error':
        // 错误通知
        addNotification({
          type: NotificationType.ERROR,
          priority: NotificationPriority.HIGH,
          title: '系统错误',
          message: data.message || '发生未知错误',
          autoDismiss: false,
          actions: [
            {
              label: '查看详情',
              type: 'secondary',
              handler: () => {
                console.log('查看错误详情:', data);
              }
            },
            {
              label: '忽略',
              type: 'secondary',
              dismiss: true
            }
          ]
        });
        break;
        
      case 'system_alert':
        // 系统告警
        addNotification({
          type: NotificationType.ALERT,
          priority: NotificationPriority.URGENT,
          title: '系统告警',
          message: data.message,
          autoDismiss: false,
          actions: data.actions || []
        });
        break;
        
      default:
        break;
    }
  }, [addNotification]);

  // 通知中心切换
  const toggleNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen(prev => !prev);
  }, []);

  // 通知位置配置
  const notificationPosition = useMemo(() => {
    return config.notificationPosition || NotificationPosition.TOP_RIGHT;
  }, [config.notificationPosition]);

  return (
    <PerformanceMonitor componentName="EnterpriseKefuAppWithNotifications">
      <div className={`enterprise-kefu-app-with-notifications ${className}`}>
        {/* 主应用 */}
        <BaseApp 
          config={config}
          onWebSocketEvent={handleWebSocketEvent}
        />
        
        {/* 通知容器 */}
        <NotificationContainer 
          position={notificationPosition}
          maxNotifications={config.maxNotifications || 5}
        />
        
        {/* 通知中心 */}
        <NotificationCenter 
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
        />
        
        {/* 智能提醒 */}
        <SmartReminder 
          reminders={reminders}
          onReminderTrigger={handleReminderTrigger}
        />
        
        {/* 通知徽章（固定在右上角） */}
        <div className="notification-badge-container">
          <NotificationBadge 
            count={unreadCount}
            onClick={toggleNotificationCenter}
          />
        </div>
      </div>
    </PerformanceMonitor>
  );
});

// 错误边界包装
export const EnterpriseKefuApp = React.memo(({ config, className }) => {
  return (
    <ErrorBoundary 
      fallback={<div>应用加载失败，请刷新页面重试</div>}
    >
      <EnterpriseKefuAppWithNotifications 
        config={config}
        className={className}
      />
    </ErrorBoundary>
  );
});

// 默认导出
export default EnterpriseKefuApp;