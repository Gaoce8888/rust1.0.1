/**
 * 增强版App组件 - 保留原有UI样式并集成企业级功能
 * 高性能渲染 + 高稳定通信 + 企业级功能
 */
"use client";

import React from "react";
import {
  ScrollShadow,
  Button,
  Chip,
  Avatar,
  Badge,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch,
  Divider,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {Icon} from "@iconify/react";

import SidebarContainer from "./sidebar-with-chat-history";
import MessagingChatMessage, { MessageType } from "./messaging-chat-message";
import messagingChatAIConversations from "./messaging-chat-ai-conversations";

import EnhancedPromptInput from "./enhanced-prompt-input";
import { getWebSocketClient } from "./websocket-client";

// 导入优化组件
import {
  OptimizedMessage,
  OptimizedUserItem,
  VirtualizedMessageList,
  OptimizedInput,
  PerformanceMonitor,
  ErrorBoundary,
  SmartCacheContainer
} from "./components/OptimizedComponents";

// 导入优化状态管理
import {
  useOptimizedUserState,
  usePerformanceMonitor,
  useSmartCache,
  useDebounce
} from "./hooks/useOptimizedState";

// 增强版主应用组件
export default function EnhancedApp() {
  // 基础状态
  const [messages, setMessages] = React.useState([]);
  const [currentCustomer, setCurrentCustomer] = React.useState(null);
  const [customerMessages, setCustomerMessages] = React.useState({});
  const [wsClient, setWsClient] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  
  // 企业级优化状态
  const [onlineUsers, setOnlineUsers] = React.useState([]);
  const [enableHighPerformance, setEnableHighPerformance] = React.useState(true);
  const [enableEnterpriseFeatures, setEnableEnterpriseFeatures] = React.useState(true);
  const [performanceMetrics, setPerformanceMetrics] = React.useState({});
  
  // 使用优化状态管理
  const userState = useOptimizedUserState(onlineUsers);
  const performance = usePerformanceMonitor();
  
  // 防抖搜索
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // 智能缓存客户消息
  const cachedMessages = useSmartCache(
    `messages-${currentCustomer?.user_id || 'default'}`,
    () => messages,
    [messages, currentCustomer],
    10000 // 10秒缓存
  );
  
  // 设置状态
  const [settings, setSettings] = React.useState({
    soundNotifications: true,
    autoReply: false,
    showTypingIndicator: true,
    onlineStatus: true,
    highPerformanceMode: enableHighPerformance,
    enterpriseFeatures: enableEnterpriseFeatures,
    welcomeMessage: '您好！欢迎咨询，我是专业客服小王，很高兴为您服务。请问有什么可以帮助您的吗？',
    quickReplies: [
      '您好！欢迎咨询，我是专业客服。',
      '请问有什么可以帮助您的吗？',
      '请稍候，我正在为您查询...',
      '感谢您的咨询，如还有其他问题请随时联系我。',
      '抱歉让您久等了，现在为您处理。'
    ]
  });

  // 当前用户信息
  const [currentUser] = React.useState({
    user_id: 'kf001',
    user_name: '客服小王',
    user_type: 'kefu',
    avatar: '/api/placeholder/32/32',
    status: 'online'
  });

  // 检测屏幕大小
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 初始化WebSocket连接
  React.useEffect(() => {
    const initWebSocket = async () => {
      try {
        const client = getWebSocketClient('ws://localhost:6006/ws', {
          userId: currentUser.user_id,
          userType: currentUser.user_type,
          enableEnterpriseFeatures: enableEnterpriseFeatures,
          reconnectInterval: 1000,
          maxReconnectAttempts: 10
        });
        
        setWsClient(client);
        
        // 设置事件监听
        client.on('connected', () => {
          console.log('✅ WebSocket连接成功');
          setConnectionStatus('connected');
          client.requestOnlineUsers();
        });
        
        client.on('disconnected', () => {
          console.log('❌ WebSocket断开');
          setConnectionStatus('disconnected');
        });
        
        client.on('error', (error) => {
          console.error('🚨 WebSocket错误:', error);
          setConnectionStatus('error');
        });
        
        // 处理消息
        client.on('message', (data) => {
          handleWebSocketMessage(data);
        });
        
        // 处理在线用户更新
        client.on('OnlineUsers', (data) => {
          if (data.users) {
            const result = userState.updateUsersOptimized(data.users);
            if (result.hasChanges) {
              console.log('📊 用户状态更新:', result.summary);
            }
          }
        });
        
        // 企业级实时状态变更
        client.on('realtime_status_change', (event) => {
          console.log('⚡ 实时状态变更:', event);
          handleRealtimeStatusChange(event);
        });
        
        // 连接WebSocket
        await client.connect();
        
      } catch (error) {
        console.error('❌ WebSocket初始化失败:', error);
        setConnectionStatus('error');
      }
    };
    
    initWebSocket();
    
    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, [currentUser, enableEnterpriseFeatures]);

  // 处理WebSocket消息
  const handleWebSocketMessage = React.useCallback((data) => {
    performance.recordUpdate();
    
    if (data.type === 'Chat') {
      const newMessage = {
        id: data.id || Date.now().toString(),
        content: data.content,
        from: data.from,
        to: data.to,
        timestamp: data.timestamp || new Date().toISOString(),
        type: MessageType.Text,
        isRead: false
      };
      
      // 更新消息列表
      setMessages(prev => [...prev, newMessage]);
      
      // 更新客户消息缓存
      setCustomerMessages(prev => ({
        ...prev,
        [data.from]: [...(prev[data.from] || []), newMessage]
      }));
      
      // 播放通知音
      if (settings.soundNotifications) {
        playNotificationSound();
      }
    }
  }, [settings.soundNotifications, performance]);

  // 处理实时状态变更
  const handleRealtimeStatusChange = React.useCallback((event) => {
    switch (event.event_type) {
      case 'user_online':
        if (event.user_data) {
          userState.updateSingleUser(event.user_data);
        }
        break;
      case 'user_offline':
        if (event.user_id) {
          userState.updateSingleUser({
            user_id: event.user_id,
            status: 'offline',
            last_seen: new Date().toISOString()
          });
        }
        break;
      case 'bulk_update':
        if (event.users_data) {
          userState.updateUsersOptimized(event.users_data);
        }
        break;
    }
  }, [userState]);

  // 发送消息
  const handleSendMessage = React.useCallback((content, messageType = 'text') => {
    if (!wsClient || !currentCustomer) return;
    
    const message = {
      content,
      receiverId: currentCustomer.user_id,
      messageType,
      timestamp: new Date().toISOString()
    };
    
    const sentMessage = wsClient.sendMessage(message);
    
    // 立即添加到界面
    const newMessage = {
      id: sentMessage.id,
      content,
      from: currentUser.user_id,
      to: currentCustomer.user_id,
      timestamp: sentMessage.timestamp,
      type: MessageType.Text,
      isRead: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 更新客户消息缓存
    setCustomerMessages(prev => ({
      ...prev,
      [currentCustomer.user_id]: [...(prev[currentCustomer.user_id] || []), newMessage]
    }));
  }, [wsClient, currentCustomer, currentUser]);

  // 播放通知音
  const playNotificationSound = React.useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(err => console.log('音频播放失败:', err));
    } catch (err) {
      console.log('音频播放失败:', err);
    }
  }, []);

  // 选择客户
  const handleSelectCustomer = React.useCallback((customer) => {
    setCurrentCustomer(customer);
    
    // 获取该客户的消息历史
    const customerMsgs = customerMessages[customer.user_id] || [];
    setMessages(customerMsgs);
    
    // 在移动端自动关闭侧边栏
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [customerMessages, isMobile]);

  // 获取连接状态颜色
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'danger';
      default:
        return 'default';
    }
  };

  // 获取连接状态文本
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return enableEnterpriseFeatures ? '企业级连接' : '已连接';
      case 'connecting':
        return '连接中...';
      case 'disconnected':
        return '未连接';
      default:
        return '未知状态';
    }
  };

  // 获取性能指标
  const getPerformanceInfo = () => {
    const baseMetrics = performance.getMetrics();
    const wsMetrics = wsClient?.getPerformanceMetrics() || {};
    
    return {
      ...baseMetrics,
      ...wsMetrics,
      onlineUsersCount: userState.users.length,
      currentMessages: messages.length
    };
  };

  // 渲染顶部工具栏
  const renderToolbar = () => (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        {/* 移动端菜单按钮 */}
        {isMobile && (
          <Button
            isIconOnly
            variant="light"
            onPress={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Icon icon="solar:hamburger-menu-linear" width={20} />
          </Button>
        )}
        
        {/* 连接状态 */}
        <Chip
          color={getConnectionStatusColor()}
          variant="flat"
          startContent={
            <Icon 
              icon={connectionStatus === 'connected' ? "solar:check-circle-bold" : "solar:close-circle-bold"} 
              width={16} 
            />
          }
        >
          {getConnectionStatusText()}
        </Chip>
        
        {/* 性能指标 */}
        {enableHighPerformance && (
          <Chip variant="flat" color="primary">
            在线: {userState.users.length}
          </Chip>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* 设置按钮 */}
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsSettingsOpen(true)}
        >
          <Icon icon="solar:settings-linear" width={20} />
        </Button>
        
        {/* 用户信息 */}
        <div className="flex items-center gap-2">
          <Avatar
            src={currentUser.avatar}
            size="sm"
            name={currentUser.user_name}
          />
          <span className="text-sm font-medium">{currentUser.user_name}</span>
        </div>
      </div>
    </div>
  );

  // 渲染聊天区域
  const renderChatArea = () => {
    if (!currentCustomer) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon icon="solar:chat-line-linear" width={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">选择一个客户开始聊天</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col">
        {/* 客户信息头部 */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Avatar
            src={currentCustomer.avatar}
            size="md"
            name={currentCustomer.user_name}
          />
          <div className="flex-1">
            <h3 className="font-semibold">{currentCustomer.user_name}</h3>
            <p className="text-sm text-gray-500">
              {currentCustomer.status === 'online' ? '在线' : '离线'}
            </p>
          </div>
          <Badge
            color={currentCustomer.status === 'online' ? 'success' : 'default'}
            variant="flat"
          >
            {currentCustomer.status === 'online' ? '在线' : '离线'}
          </Badge>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <PerformanceMonitor
              name="MessageList"
              onMetrics={(metrics) => {
                if (enableHighPerformance) {
                  setPerformanceMetrics(prev => ({
                    ...prev,
                    messageList: metrics
                  }));
                }
              }}
            >
              {enableHighPerformance && messages.length > 50 ? (
                <VirtualizedMessageList
                  messages={messages}
                  currentUserId={currentUser.user_id}
                  containerHeight={400}
                  itemHeight={80}
                />
              ) : (
                <ScrollShadow className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <SmartCacheContainer
                        key={message.id}
                        cacheKey={`message-${message.id}`}
                        cacheTime={60000}
                      >
                        <OptimizedMessage
                          message={message}
                          isOwn={message.from === currentUser.user_id}
                          showAvatar={true}
                          showTime={true}
                        />
                      </SmartCacheContainer>
                    ))}
                  </div>
                </ScrollShadow>
              )}
            </PerformanceMonitor>
          </ErrorBoundary>
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <ErrorBoundary>
            <EnhancedPromptInput
              onSendMessage={handleSendMessage}
              quickReplies={settings.quickReplies}
              disabled={connectionStatus !== 'connected'}
              enableHighPerformance={enableHighPerformance}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  };

  // 渲染设置模态框
  const renderSettingsModal = () => (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      size="lg"
    >
      <ModalContent>
        <ModalHeader>系统设置</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* 基础设置 */}
            <div>
              <h4 className="font-semibold mb-3">基础设置</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>声音通知</span>
                  <Switch
                    isSelected={settings.soundNotifications}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, soundNotifications: value }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>自动回复</span>
                  <Switch
                    isSelected={settings.autoReply}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, autoReply: value }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>显示输入状态</span>
                  <Switch
                    isSelected={settings.showTypingIndicator}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, showTypingIndicator: value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* 企业级功能 */}
            <div>
              <h4 className="font-semibold mb-3">企业级功能</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>高性能模式</span>
                  <Switch
                    isSelected={enableHighPerformance}
                    onValueChange={(value) => {
                      setEnableHighPerformance(value);
                      setSettings(prev => ({ ...prev, highPerformanceMode: value }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>企业级连接</span>
                  <Switch
                    isSelected={enableEnterpriseFeatures}
                    onValueChange={(value) => {
                      setEnableEnterpriseFeatures(value);
                      setSettings(prev => ({ ...prev, enterpriseFeatures: value }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 性能监控 */}
            {enableHighPerformance && (
              <div>
                <h4 className="font-semibold mb-3">性能监控</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">渲染次数:</span>
                    <span className="ml-2 font-mono">{getPerformanceInfo().renderCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">更新次数:</span>
                    <span className="ml-2 font-mono">{getPerformanceInfo().updateCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">消息数:</span>
                    <span className="ml-2 font-mono">{getPerformanceInfo().messagesReceived || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">在线用户:</span>
                    <span className="ml-2 font-mono">{getPerformanceInfo().onlineUsersCount || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onPress={() => setIsSettingsOpen(false)}
          >
            确定
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return (
    <ErrorBoundary>
      <PerformanceMonitor
        name="EnhancedApp"
        onMetrics={(metrics) => {
          performance.recordRender();
          if (enableHighPerformance) {
            setPerformanceMetrics(prev => ({
              ...prev,
              app: metrics
            }));
          }
        }}
      >
        <div className="flex h-screen bg-gray-50">
          {/* 侧边栏 */}
          <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'} ${
            isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
          } transition-transform duration-300 ease-in-out`}>
            <div className="w-80 bg-white border-r h-full">
              <SidebarContainer
                conversations={userState.users}
                onSelectConversation={handleSelectCustomer}
                currentConversation={currentCustomer}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                connectionStatus={connectionStatus}
                performanceMode={enableHighPerformance}
              />
            </div>
          </div>

          {/* 主聊天区域 */}
          <div className="flex-1 flex flex-col bg-white">
            {renderToolbar()}
            {renderChatArea()}
          </div>

          {/* 设置模态框 */}
          {renderSettingsModal()}

          {/* 移动端遮罩 */}
          {isMobile && isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </div>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
}