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
  EnterpriseWebSocketClient,
  useEnterpriseWebSocket,
  ConnectionStatus
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
  const [currentUser, setCurrentUser] = useState(null);
  const { unreadCount, addNotification } = useNotifications();

  // WebSocket配置
  const wsUrl = config.wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:6006/ws';
  const wsOptions = {
    reconnectInterval: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageQueueSize: 1000,
    userId: currentUser?.id,
    ...config.wsOptions
  };

  // WebSocket连接
  const {
    status: wsStatus,
    lastMessage,
    error: wsError,
    stats: wsStats,
    connect,
    disconnect,
    send,
    sendBatch,
    on: wsOn,
    off: wsOff
  } = useEnterpriseWebSocket(wsUrl, wsOptions);

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

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = () => {
      let savedUser = localStorage.getItem('kefu_user');
      let savedToken = localStorage.getItem('kefu_session_token');
      
      if (!savedUser || !savedToken) {
        savedUser = sessionStorage.getItem('kefu_user');
        savedToken = sessionStorage.getItem('kefu_session_token');
      }
      
      if (savedUser && savedToken) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          
          // 设置通知管理器的用户ID
          notificationManager.setWebSocketClient(null, user.id);
          
          // 添加欢迎通知
          addNotification({
            type: NotificationType.INFO,
            priority: NotificationPriority.NORMAL,
            title: '系统启动',
            message: `欢迎 ${user.name}！企业级客服系统已就绪`,
            autoDismiss: true,
            dismissDelay: 3000
          });
        } catch (error) {
          console.error('解析用户信息失败:', error);
          clearStoredAuth();
        }
      }
    };

    checkLoginStatus();
  }, [addNotification]);

  // 清除存储的认证信息
  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem('kefu_user');
    localStorage.removeItem('kefu_session_token');
    sessionStorage.removeItem('kefu_user');
    sessionStorage.removeItem('kefu_session_token');
  }, []);

  // WebSocket事件处理
  useEffect(() => {
    if (!currentUser) return;

    // 设置WebSocket事件监听
    const handleConnected = () => {
      console.log('WebSocket连接成功');
      addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '连接成功',
        message: 'WebSocket连接已建立',
        autoDismiss: true,
        dismissDelay: 3000
      });
    };

    const handleDisconnected = () => {
      console.log('WebSocket连接断开');
      addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: '连接断开',
        message: 'WebSocket连接已断开，正在尝试重连...',
        autoDismiss: false,
        actions: [
          {
            label: '手动重连',
            type: 'primary',
            handler: () => connect()
          }
        ]
      });
    };

    const handleReconnected = () => {
      addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '重连成功',
        message: 'WebSocket连接已恢复',
        autoDismiss: true,
        dismissDelay: 3000
      });
    };

    const handleError = (error) => {
      console.error('WebSocket错误:', error);
      addNotification({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '连接错误',
        message: error.message || 'WebSocket连接发生错误',
        autoDismiss: false,
        actions: [
          {
            label: '查看详情',
            type: 'secondary',
            handler: () => {
              console.log('WebSocket错误详情:', error);
            }
          },
          {
            label: '忽略',
            type: 'secondary',
            dismiss: true
          }
        ]
      });
    };

    const handleChat = (message) => {
      // 聊天消息通知已在通知管理器中处理
      console.log('收到聊天消息:', message);
    };

    const handleSystem = (message) => {
      // 系统消息通知已在通知管理器中处理
      console.log('收到系统消息:', message);
    };

    const handleUserJoined = (message) => {
      // 用户加入通知已在通知管理器中处理
      console.log('用户加入:', message);
    };

    const handleUserLeft = (message) => {
      // 用户离开通知已在通知管理器中处理
      console.log('用户离开:', message);
    };

    const handleWelcome = (message) => {
      // 欢迎消息通知已在通知管理器中处理
      console.log('欢迎消息:', message);
    };

    const handleOnlineUsers = (message) => {
      // 在线用户更新
      console.log('在线用户更新:', message.users?.length || 0, '个用户');
    };

    // 注册事件监听器
    wsOn('connected', handleConnected);
    wsOn('disconnected', handleDisconnected);
    wsOn('reconnected', handleReconnected);
    wsOn('error', handleError);
    wsOn('chat', handleChat);
    wsOn('system', handleSystem);
    wsOn('userJoined', handleUserJoined);
    wsOn('userLeft', handleUserLeft);
    wsOn('welcome', handleWelcome);
    wsOn('onlineUsers', handleOnlineUsers);

    return () => {
      // 清理事件监听器
      wsOff('connected', handleConnected);
      wsOff('disconnected', handleDisconnected);
      wsOff('reconnected', handleReconnected);
      wsOff('error', handleError);
      wsOff('chat', handleChat);
      wsOff('system', handleSystem);
      wsOff('userJoined', handleUserJoined);
      wsOff('userLeft', handleUserLeft);
      wsOff('welcome', handleWelcome);
      wsOff('onlineUsers', handleOnlineUsers);
    };
  }, [currentUser, wsOn, wsOff, connect, addNotification]);

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
        // 新消息通知已在通知管理器中处理
        break;
        
      case 'connection_lost':
        // 连接丢失通知已在WebSocket事件处理中处理
        break;
        
      case 'connection_restored':
        // 连接恢复通知已在WebSocket事件处理中处理
        break;
        
      case 'error':
        // 错误通知已在WebSocket事件处理中处理
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

  // 渲染登录页面
  if (!currentUser) {
    return (
      <div className="enterprise-login-container">
        <div className="login-card">
          <h1>企业级客服系统</h1>
          <p>请先登录以使用通知功能</p>
          {/* 这里可以添加登录表单组件 */}
        </div>
      </div>
    );
  }

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

        {/* 连接状态指示器 */}
        <div className="connection-status-indicator">
          <div className={`status-dot ${wsStatus}`}>
            {wsStatus === ConnectionStatus.CONNECTED ? '●' : '○'}
          </div>
          <span className="status-text">{wsStatus}</span>
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