import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { ErrorBoundary } from './EnterpriseCore';
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

// 企业级客服应用主组件
export const EnterpriseKefuApp = React.memo(({ 
  config = {},
  onError,
  className = ""
}) => {
  // 状态管理
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [customerMessages, setCustomerMessages] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [settings, setSettings] = useState({
    soundNotifications: true,
    autoReply: false,
    showTypingIndicator: true,
    onlineStatus: true,
    welcomeMessage: '您好！欢迎咨询，我是专业客服，很高兴为您服务。',
    quickReplies: [
      '您好！欢迎咨询，我是专业客服。',
      '请问有什么可以帮助您的吗？',
      '请稍候，我正在为您查询...',
      '谢谢您的耐心等待，我会尽快处理。',
      '如果您还有其他问题，随时可以咨询我。'
    ]
  });

  // 性能优化
  const messageQueueRef = useRef(new MessageQueueManager(1000));
  const performanceMetricsRef = useRef({
    messageCount: 0,
    responseTime: 0,
    connectionCount: 0,
    errorCount: 0
  });

  // WebSocket配置
  const wsUrl = config.wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:6006/ws';
  const wsOptions = {
    reconnectInterval: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageQueueSize: 1000,
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
          setIsLoggedIn(true);
        } catch (error) {
          console.error('解析用户信息失败:', error);
          clearStoredAuth();
        }
      }
    };

    checkLoginStatus();
  }, []);

  // 清除存储的认证信息
  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem('kefu_user');
    localStorage.removeItem('kefu_session_token');
    sessionStorage.removeItem('kefu_user');
    sessionStorage.removeItem('kefu_session_token');
  }, []);

  // 登录处理
  const handleLogin = useCallback(async (credentials) => {
    try {
      // 这里应该调用实际的登录API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setIsLoggedIn(true);
        
        // 存储认证信息
        const storage = credentials.rememberMe ? localStorage : sessionStorage;
        storage.setItem('kefu_user', JSON.stringify(userData));
        storage.setItem('kefu_session_token', userData.sessionToken);
        
        return { success: true };
      } else {
        return { success: false, error: '登录失败' };
      }
    } catch (error) {
      console.error('登录错误:', error);
      return { success: false, error: '网络错误' };
    }
  }, []);

  // 登出处理
  const handleLogout = useCallback(async () => {
    try {
      // 调用登出API
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      setCurrentUser(null);
      setIsLoggedIn(false);
      setCustomers([]);
      setCurrentCustomer(null);
      setMessages([]);
      setCustomerMessages({});
      clearStoredAuth();
      disconnect();
    }
  }, [disconnect, clearStoredAuth]);

  // WebSocket事件处理
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // 连接WebSocket
    connect();

    // 设置事件监听
    const handleConnected = () => {
      console.log('WebSocket连接成功');
      // 请求在线用户列表
      setTimeout(() => {
        send({
          type: 'GetOnlineUsers',
          user_id: currentUser.id,
          timestamp: new Date().toISOString()
        });
      }, 500);
    };

    const handleDisconnected = () => {
      console.log('WebSocket连接断开');
    };

    const handleError = (error) => {
      console.error('WebSocket错误:', error);
      onError?.(error);
    };

    const handleChatMessage = (data) => {
      handleReceiveMessage(data);
    };

    const handleOnlineUsers = (data) => {
      if (data.users) {
        const onlineCustomers = data.users.filter(user => user.user_type === 'Kehu');
        updateOnlineCustomers(onlineCustomers);
      }
    };

    const handleUserJoined = (data) => {
      if (data.user_type === 'Kehu') {
        addNewCustomer({
          id: data.user_id,
          name: data.user_name,
          status: 'online',
          lastMessage: '新客户上线',
          timestamp: new Date(data.timestamp),
          unreadCount: 0,
          messages: []
        });
      }
    };

    const handleUserLeft = (data) => {
      if (data.user_type === 'Kehu') {
        updateCustomerStatus(data.user_id, 'offline');
      }
    };

    const handleStatusUpdate = (data) => {
      updateCustomerStatus(data.user_id, data.status);
    };

    // 注册事件监听器
    wsOn('connected', handleConnected);
    wsOn('disconnected', handleDisconnected);
    wsOn('error', handleError);
    wsOn('Chat', handleChatMessage);
    wsOn('message', handleChatMessage);
    wsOn('OnlineUsers', handleOnlineUsers);
    wsOn('UserJoined', handleUserJoined);
    wsOn('UserLeft', handleUserLeft);
    wsOn('Status', handleStatusUpdate);

    return () => {
      // 清理事件监听器
      wsOff('connected', handleConnected);
      wsOff('disconnected', handleDisconnected);
      wsOff('error', handleError);
      wsOff('Chat', handleChatMessage);
      wsOff('message', handleChatMessage);
      wsOff('OnlineUsers', handleOnlineUsers);
      wsOff('UserJoined', handleUserJoined);
      wsOff('UserLeft', handleUserLeft);
      wsOff('Status', handleStatusUpdate);
    };
  }, [isLoggedIn, currentUser, connect, send, wsOn, wsOff, onError]);

  // 处理接收到的消息
  const handleReceiveMessage = useCallback((data) => {
    const message = {
      id: data.id || Date.now().toString(),
      content: data.content,
      senderId: data.sender_id,
      senderName: data.sender_name,
      timestamp: data.timestamp || new Date().toISOString(),
      type: data.type || MessageType.TEXT,
      status: 'received',
      direction: 'received'
    };

    // 更新消息列表
    setMessages(prev => [...prev, message]);
    
    // 更新客户消息
    const customerId = data.sender_id;
    setCustomerMessages(prev => ({
      ...prev,
      [customerId]: [...(prev[customerId] || []), message]
    }));

    // 更新客户最后消息
    setCustomers(prev => prev.map(customer => 
      customer.id === customerId 
        ? { ...customer, lastMessage: data.content, unreadCount: customer.unreadCount + 1 }
        : customer
    ));

    // 播放通知音
    if (settings.soundNotifications) {
      playNotificationSound();
    }

    // 更新性能指标
    performanceMetricsRef.current.messageCount++;
  }, [settings.soundNotifications]);

  // 更新在线客户列表
  const updateOnlineCustomers = useCallback((onlineCustomers) => {
    setCustomers(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newCustomers = onlineCustomers.filter(c => !existingIds.has(c.user_id));
      
      return [
        ...prev,
        ...newCustomers.map(customer => ({
          id: customer.user_id,
          name: customer.user_name,
          status: 'online',
          lastMessage: '在线',
          timestamp: new Date(),
          unreadCount: 0,
          messages: []
        }))
      ];
    });
  }, []);

  // 添加新客户
  const addNewCustomer = useCallback((newCustomer) => {
    setCustomers(prev => {
      const exists = prev.some(c => c.id === newCustomer.id);
      if (!exists) {
        return [...prev, newCustomer];
      }
      return prev;
    });
  }, []);

  // 更新客户状态
  const updateCustomerStatus = useCallback((customerId, status) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === customerId 
        ? { ...customer, status }
        : customer
    ));
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async (messageData) => {
    if (!currentCustomer) return;

    const message = {
      id: Date.now().toString(),
      content: messageData.content,
      senderId: currentUser.id,
      senderName: currentUser.name,
      timestamp: new Date().toISOString(),
      type: messageData.type || MessageType.TEXT,
      status: 'sending',
      direction: 'sent',
      attachments: messageData.attachments || []
    };

    // 立即添加到本地消息列表
    setMessages(prev => [...prev, message]);
    
    // 更新客户消息
    setCustomerMessages(prev => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), message]
    }));

    // 发送到服务器
    const success = send({
      type: 'Chat',
      content: messageData.content,
      receiver_id: currentCustomer.id,
      sender_id: currentUser.id,
      timestamp: new Date().toISOString()
    });

    if (success) {
      // 更新消息状态为已发送
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'sent' } : msg
      ));
    } else {
      // 发送失败，加入队列
      messageQueueRef.current.add({
        type: 'Chat',
        content: messageData.content,
        receiver_id: currentCustomer.id,
        sender_id: currentUser.id
      });
      
      // 更新消息状态为失败
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'failed' } : msg
      ));
    }

    // 更新客户最后消息
    setCustomers(prev => prev.map(customer => 
      customer.id === currentCustomer.id 
        ? { ...customer, lastMessage: messageData.content }
        : customer
    ));
  }, [currentCustomer, currentUser, send]);

  // 选择客户
  const handleCustomerSelect = useCallback((customer) => {
    setCurrentCustomer(customer);
    
    // 加载客户消息历史
    if (!customerMessages[customer.id]) {
      // 这里应该从服务器加载历史消息
      loadCustomerHistory(customer.id);
    }
    
    // 清除未读消息计数
    setCustomers(prev => prev.map(c => 
      c.id === customer.id ? { ...c, unreadCount: 0 } : c
    ));
  }, [customerMessages]);

  // 加载客户历史消息
  const loadCustomerHistory = useCallback(async (customerId) => {
    try {
      const response = await fetch(`/api/messages/${customerId}?limit=50`);
      if (response.ok) {
        const history = await response.json();
        setCustomerMessages(prev => ({
          ...prev,
          [customerId]: history
        }));
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
    }
  }, []);

  // 播放通知音
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(console.error);
    } catch (error) {
      console.error('播放通知音失败:', error);
    }
  }, []);

  // 处理输入状态
  const handleTyping = useCallback((isTyping) => {
    setIsTyping(isTyping);
    if (currentCustomer) {
      send({
        type: 'Typing',
        sender_id: currentUser.id,
        receiver_id: currentCustomer.id,
        is_typing: isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentCustomer, currentUser, send]);

  // 获取当前客户的消息
  const currentCustomerMessages = useMemo(() => {
    if (!currentCustomer) return [];
    return customerMessages[currentCustomer.id] || [];
  }, [currentCustomer, customerMessages]);

  // 渲染登录页面
  if (!isLoggedIn) {
    return (
      <div className="enterprise-login-container">
        <div className="login-card">
          <h1>企业级客服系统</h1>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={onError}>
      <div className={`enterprise-kefu-app ${className}`}>
        {/* 顶部导航栏 */}
        <header className="app-header">
          <div className="header-left">
            <h1>企业级客服系统</h1>
            <div className="connection-status">
              <span className={`status-indicator ${wsStatus}`}>
                {wsStatus === ConnectionStatus.CONNECTED ? '●' : '○'}
              </span>
              {wsStatus}
            </div>
          </div>
          
          <div className="header-right">
            <button 
              className="dashboard-btn"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              📊 仪表板
            </button>
            
            <div className="user-info">
              <span>{currentUser?.name}</span>
              <button onClick={handleLogout}>登出</button>
            </div>
          </div>
        </header>

        <div className="app-content">
          {showDashboard ? (
            /* 仪表板视图 */
            <EnterpriseDashboard
              metrics={[
                {
                  type: 'messages_per_second',
                  value: performanceMetricsRef.current.messageCount / 60,
                  label: '消息/秒'
                },
                {
                  type: 'response_time',
                  value: performanceMetricsRef.current.responseTime,
                  label: '响应时间(ms)'
                },
                {
                  type: 'connection_count',
                  value: customers.length,
                  label: '在线客户'
                }
              ]}
              connections={customers.map(customer => ({
                id: customer.id,
                status: customer.status,
                connectTime: customer.timestamp,
                messageCount: customerMessages[customer.id]?.length || 0
              }))}
              messages={messages}
              healthData={{
                websocket: {
                  healthy: wsStatus === ConnectionStatus.CONNECTED,
                  responseTime: wsStats.lastMessageTime ? Date.now() - wsStats.lastMessageTime : 0,
                  error: wsError?.message
                },
                database: {
                  healthy: true,
                  responseTime: 50
                }
              }}
              onRefresh={() => {
                // 刷新数据
                if (wsStatus === ConnectionStatus.CONNECTED) {
                  send({
                    type: 'GetOnlineUsers',
                    user_id: currentUser.id,
                    timestamp: new Date().toISOString()
                  });
                }
              }}
            />
          ) : (
            /* 聊天视图 */
            <div className="chat-layout">
              {/* 客户列表侧边栏 */}
              <aside className="customer-sidebar">
                <div className="sidebar-header">
                  <h3>在线客户 ({customers.length})</h3>
                </div>
                
                <div className="customer-list">
                  {customers.map(customer => (
                    <div
                      key={customer.id}
                      className={`customer-item ${currentCustomer?.id === customer.id ? 'active' : ''}`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="customer-avatar">
                        <img src={customer.avatar || '/default-avatar.png'} alt={customer.name} />
                        <span className={`status-dot ${customer.status}`}></span>
                      </div>
                      
                      <div className="customer-info">
                        <div className="customer-name">{customer.name}</div>
                        <div className="customer-last-message">{customer.lastMessage}</div>
                      </div>
                      
                      {customer.unreadCount > 0 && (
                        <div className="unread-badge">{customer.unreadCount}</div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              {/* 聊天主区域 */}
              <main className="chat-main">
                {currentCustomer ? (
                  <>
                    {/* 聊天头部 */}
                    <div className="chat-header">
                      <div className="chat-customer-info">
                        <img src={currentCustomer.avatar || '/default-avatar.png'} alt={currentCustomer.name} />
                        <div>
                          <h3>{currentCustomer.name}</h3>
                          <span className={`status ${currentCustomer.status}`}>
                            {currentCustomer.status === 'online' ? '在线' : '离线'}
                          </span>
                        </div>
                      </div>
                      
                      {isTyping && (
                        <div className="typing-indicator">
                          {currentCustomer.name} 正在输入...
                        </div>
                      )}
                    </div>

                    {/* 聊天消息区域 */}
                    <EnterpriseChatContainer
                      messages={currentCustomerMessages}
                      currentUser={currentUser}
                      onSendMessage={handleSendMessage}
                      onLoadMore={() => loadCustomerHistory(currentCustomer.id)}
                      hasMore={true}
                      maxHeight={500}
                    />

                    {/* 消息输入区域 */}
                    <EnterpriseMessageInput
                      onSend={handleSendMessage}
                      onTyping={handleTyping}
                      placeholder="输入消息..."
                      quickReplies={settings.quickReplies}
                    />
                  </>
                ) : (
                  /* 未选择客户时的提示 */
                  <div className="no-customer-selected">
                    <div className="empty-state">
                      <h2>欢迎使用企业级客服系统</h2>
                      <p>请从左侧选择一个客户开始对话</p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

// 登录表单组件
const LoginForm = React.memo(({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await onLogin(credentials);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label htmlFor="username">用户名</label>
        <input
          id="username"
          type="text"
          value={credentials.username}
          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">密码</label>
        <input
          id="password"
          type="password"
          value={credentials.password}
          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={credentials.rememberMe}
            onChange={(e) => setCredentials(prev => ({ ...prev, rememberMe: e.target.checked }))}
            disabled={isLoading}
          />
          记住我
        </label>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button type="submit" disabled={isLoading} className="login-btn">
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
});

// 导出主应用组件
export default EnterpriseKefuApp;