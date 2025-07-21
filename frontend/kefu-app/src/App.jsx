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
import EnhancedPromptInput from "./enhanced-prompt-input";
import { getWebSocketClient } from "./websocket-client";
import LoginPage from "./components/LoginPage";
import { initializeMonitoring, monitorWebSocket } from "./utils/monitoring";
import { validateMessageContent, validateCustomerData, escapeHtml } from "./utils/validation";
// import ReactCardRenderer from "./components/ReactCardRenderer";  // 暂时禁用
// import AdaptiveConfigPanel from "./components/AdaptiveConfigPanel";  // 暂时禁用
// import AIComponentGenerator from "./components/AIComponentGenerator";  // 暂时禁用
import adaptiveConfigManager from "./utils/adaptiveConfig";

// 主应用组件 - 客服聊天界面
export default function Component() {
  const [messages, setMessages] = React.useState([]);
  const [currentCustomer, setCurrentCustomer] = React.useState(null);
  const [customerMessages, setCustomerMessages] = React.useState({});
  const [wsClient, setWsClient] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isAdaptiveConfigOpen, setIsAdaptiveConfigOpen] = React.useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [customers, setCustomers] = React.useState([]);
  const [settings, setSettings] = React.useState({
    soundNotifications: true,
    autoReply: false,
    showTypingIndicator: true,
    onlineStatus: true,
    welcomeMessage: '您好！欢迎咨询，我是专业客服，很高兴为您服务。请问有什么可以帮助您的吗？',
    quickReplies: [
      '您好！欢迎咨询，我是专业客服。',
      '请问有什么可以帮助您的吗？',
      '请稍候，我正在为您查询...',
      '谢谢您的耐心等待，我会尽快处理。',
      '如果您还有其他问题，随时可以咨询我。'
    ]
  });

  // 初始化监控系统
  React.useEffect(() => {
    initializeMonitoring();
  }, []);

  // 检查登录状态
  React.useEffect(() => {
    // 优先检查localStorage（记住我）
    let savedUser = localStorage.getItem('kefu_user');
    let savedToken = localStorage.getItem('kefu_session_token');
    
    // 如果localStorage没有，检查sessionStorage
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
        localStorage.removeItem('kefu_user');
        localStorage.removeItem('kefu_session_token');
        sessionStorage.removeItem('kefu_user');
        sessionStorage.removeItem('kefu_session_token');
      }
    }
  }, []);

  // 检测移动端
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化WebSocket连接
  React.useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    let mounted = true; // 避免竞态条件
    let client = null;

    const initWebSocket = async () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:6006/ws';
        client = getWebSocketClient(wsUrl, {
          userId: currentUser?.id,
          userType: currentUser?.type,
          sessionToken: currentUser?.sessionToken,
        });

        // 设置事件监听
        client.on('connected', () => {
          if (!mounted) return;
          setConnectionStatus('connected');
          console.log('WebSocket连接成功');
          
          // 连接成功后，请求在线用户列表
          setTimeout(() => {
            if (!mounted) return;
            console.log('请求在线用户列表...');
            client?.send({
              type: 'GetOnlineUsers',
              user_id: currentUser?.id,
              timestamp: new Date().toISOString()
            });
          }, 500);
        });

        client.on('disconnected', () => {
          if (!mounted) return;
          setConnectionStatus('disconnected');
          console.log('WebSocket连接断开');
        });

        client.on('error', (error) => {
          if (!mounted) return;
          console.error('WebSocket错误:', error);
          setConnectionStatus('disconnected');
        });

        client.on('Chat', (data) => {
          if (!mounted) return;
          handleReceiveMessage(data);
        });

        client.on('message', (data) => {
          if (!mounted) return;
          handleReceiveMessage(data);
        });
        
        // 监听在线用户列表更新
        client.on('OnlineUsers', (data) => {
          if (!mounted) return;
          console.log('收到在线用户列表:', data);
          if (data?.users) {
            // 过滤出客户列表（客服只需要看到客户）
            const onlineCustomers = data.users.filter(user => user?.user_type === 'Kehu');
            updateOnlineCustomers(onlineCustomers);
          }
        });
        
        // 监听用户加入
        client.on('UserJoined', (data) => {
          if (!mounted) return;
          console.log('用户加入:', data);
          if (data?.user_type === 'Kehu') {
            // 如果是客户加入，添加到客户列表
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
        });
        
        // 监听用户离开
        client.on('UserLeft', (data) => {
          if (!mounted) return;
          console.log('用户离开:', data);
          if (data?.user_type === 'Kehu') {
            // 如果是客户离开，更新客户状态
            updateCustomerStatus(data.user_id, 'offline');
          }
        });
        
        // 监听状态更新
        client.on('Status', (data) => {
          if (!mounted) return;
          console.log('用户状态更新:', data);
          updateCustomerStatus(data.user_id, data.status);
        });

        // 添加调试监听器
        client.on('message', (data) => {
          if (!mounted) return;
          console.log('收到WebSocket消息:', {
            type: data.type,
            data: data
          });
        });

        setWsClient(client);
        
        // 监控WebSocket连接
        monitorWebSocket(client);
      } catch (error) {
        if (mounted) {
          console.error('WebSocket初始化失败:', error);
          setConnectionStatus('error');
        }
      }
    };

    initWebSocket();

    // 清理函数
    return () => {
      mounted = false;
      if (client) {
        try {
          client.disconnect();
        } catch (error) {
          console.error('WebSocket断开连接失败:', error);
        }
      }
    };
  }, [isLoggedIn, currentUser]);

  // 处理接收到的消息
  const handleReceiveMessage = (data) => {
    try {
      // 输入验证
      if (!data) {
        console.warn('收到空消息数据');
        return;
      }

      // 验证消息内容
      const validatedContent = data?.content ? 
        validateMessageContent(data.content, data.messageType || 'text') : '';

      // 使用可选链操作符防止空指针访问
      const newMessage = {
        id: data?.id || Date.now().toString(),
        type: data?.messageType || MessageType.TEXT,
        content: escapeHtml(validatedContent), // 防XSS
        senderId: data?.senderId || '',
        senderName: escapeHtml(data?.senderName || '未知用户'), // 防XSS
        senderAvatar: data?.senderAvatar || '',
        timestamp: new Date(data?.timestamp || Date.now()),
        imageUrl: data?.imageUrl || null,
        fileName: data?.fileName || null,
        fileSize: data?.fileSize || null,
        fileUrl: data?.fileUrl || null,
        voiceDuration: data?.voiceDuration || null,
        voiceUrl: data?.voiceUrl || null,
        status: 'delivered',
        // 新增：React组件数据
        reactComponentData: data?.reactComponentData || null,
        adaptiveStyles: data?.adaptiveStyles || null
      };

      // 处理特殊消息类型
      if (data?.messageType === 'html_template' && data?.reactComponentData) {
        newMessage.type = 'react_component';
      }

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('消息处理失败:', error);
    }
  };
  
  // 更新在线客户列表
  const updateOnlineCustomers = (onlineCustomers) => {
    // 数组访问安全检查
    if (!Array.isArray(onlineCustomers)) {
      console.warn('onlineCustomers 不是数组:', onlineCustomers);
      return;
    }

    setCustomers(prevCustomers => {
      // 创建一个新的客户列表
      const updatedCustomers = [...prevCustomers];
      
      // 标记所有客户为离线
      updatedCustomers.forEach(customer => {
        if (customer) {
          customer.status = 'offline';
        }
      });
      
      // 更新在线客户的状态
      onlineCustomers.forEach(onlineCustomer => {
        // 使用可选链操作符防止空指针访问
        const customerId = onlineCustomer?.user_id;
        const customerName = onlineCustomer?.user_name;
        
        if (!customerId || !customerName) {
          console.warn('客户数据不完整:', onlineCustomer);
          return;
        }

        const existingCustomer = updatedCustomers.find(c => c?.id === customerId);
        if (existingCustomer) {
          existingCustomer.status = 'online';
          existingCustomer.name = customerName;
        } else {
          // 如果是新客户，添加到列表
          const newCustomer = {
            id: customerId,
            name: customerName,
            status: 'online',
            avatar: onlineCustomer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random`,
            lastMessage: '新客户',
            timestamp: new Date(onlineCustomer?.last_seen || Date.now()),
            unreadCount: 0,
            messages: []
          };
          updatedCustomers.push(newCustomer);
        }
      });
      
      // 按状态和时间排序：在线的在前，然后按最后活动时间降序
      return updatedCustomers.sort((a, b) => {
        if (!a || !b) return 0;
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    });
  };
  
  // 生成默认头像URL
  const generateAvatarUrl = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  };

  // 添加新客户
  const addNewCustomer = (newCustomer) => {
    try {
      // 输入验证
      if (!newCustomer?.id || !newCustomer?.name) {
        console.warn('客户数据不完整:', newCustomer);
        return;
      }

      // 验证客户数据
      const validatedCustomer = validateCustomerData(newCustomer);

      setCustomers(prevCustomers => {
        // 检查客户是否已存在
        const exists = prevCustomers.some(c => c?.id === validatedCustomer.id);
        if (exists) {
          // 如果已存在，只更新状态
          return prevCustomers.map(c => 
            c?.id === validatedCustomer.id 
              ? { ...c, status: 'online', timestamp: validatedCustomer.timestamp }
              : c
          );
        }
        
        // 添加新客户
        const customer = {
          ...validatedCustomer,
          avatar: validatedCustomer.avatar || generateAvatarUrl(validatedCustomer.name),
        };
        
        return [customer, ...prevCustomers];
      });
    } catch (error) {
      console.error('添加客户失败:', error);
    }
  };
  
  // 更新客户状态
  const updateCustomerStatus = (customerId, status) => {
    setCustomers(prevCustomers => 
      prevCustomers.map(customer => 
        customer.id === customerId 
          ? { ...customer, status: status === 'Online' ? 'online' : 'offline' }
          : customer
      )
    );
  };

  // 发送消息
  const handleSendMessage = async (messageData) => {
    // 输入验证
    if (!currentCustomer) {
      console.warn('没有选择客户');
      return;
    }

    if (!messageData?.content && !messageData?.imageUrl && !messageData?.fileUrl && !messageData?.voiceUrl) {
      console.warn('消息内容不能为空');
      return;
    }

    const message = {
      id: Date.now().toString(),
      type: messageData.type === 'text' ? MessageType.TEXT : 
            messageData.type === 'image' ? MessageType.IMAGE :
            messageData.type === 'file' ? MessageType.FILE :
            messageData.type === 'voice' ? MessageType.VOICE : MessageType.TEXT,
      content: messageData.content || '',
      senderId: currentUser?.id || '',
      senderName: currentUser?.name || '客服',
      senderAvatar: currentUser?.avatar || '',
      timestamp: new Date(),
      customerId: currentCustomer.id,
      status: 'sending',
      imageUrl: messageData.imageUrl || null,
      fileName: messageData.fileName || null,
      fileSize: messageData.fileSize || null,
      fileUrl: messageData.fileUrl || null,
      voiceDuration: messageData.voiceDuration || null,
      voiceUrl: messageData.voiceUrl || null,
    };

    // 添加消息到当前客户的消息历史
    setCustomerMessages(prev => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), message]
    }));

    try {
      if (wsClient) {
        const sentMessage = await wsClient.sendMessage({
          messageType: messageData.type,
          content: messageData.content,
          receiverId: currentCustomer.id,
          ...messageData,
        });

        // 更新消息状态
        setCustomerMessages(prev => ({
          ...prev,
          [currentCustomer.id]: (prev[currentCustomer.id] || []).map(msg => 
            msg.id === message.id ? {...msg, status: 'sent'} : msg
          )
        }));
      } else {
        // 模拟发送成功
        setTimeout(() => {
          setCustomerMessages(prev => ({
            ...prev,
            [currentCustomer.id]: (prev[currentCustomer.id] || []).map(msg => 
              msg.id === message.id ? {...msg, status: 'sent'} : msg
            )
          }));
        }, 1000);
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      // 更新消息状态为失败
      setCustomerMessages(prev => ({
        ...prev,
        [currentCustomer.id]: (prev[currentCustomer.id] || []).map(msg => 
          msg.id === message.id ? {...msg, status: 'failed'} : msg
        )
      }));
    }
  };

  // 处理正在输入
  const handleTyping = () => {
    if (wsClient) {
      wsClient.sendTyping();
    }
  };

  // 选择客户
  const handleCustomerSelect = (customer) => {
    setCurrentCustomer(customer);
    
    // 如果是首次选择该客户，初始化消息历史
    if (!customerMessages[customer.id]) {
      const initialMessages = [
        {
          id: `system_${customer.id}_${Date.now()}`,
          type: MessageType.SYSTEM,
          content: `开始与 ${customer.name} 的对话`,
          senderId: 'system',
          timestamp: new Date(),
          customerId: customer.id
        }
      ];

      // 添加客户的历史消息
      if (customer.messages) {
        customer.messages.forEach((msg, index) => {
          initialMessages.push({
            id: `history_${customer.id}_${index}_${Date.now()}`,
            type: MessageType.TEXT,
            content: msg,
            senderId: customer.id,
            senderName: customer.name,
            senderAvatar: customer.avatar,
            timestamp: new Date(Date.now() - (customer.messages.length - index) * 3 * 60 * 1000), // 每条消息间隔3分钟
            customerId: customer.id
          });
        });
      }

      setCustomerMessages(prev => ({
        ...prev,
        [customer.id]: initialMessages
      }));
      
      // 自动发送欢迎消息
      if (settings.welcomeMessage && settings.autoReply) {
        setTimeout(() => {
          const welcomeMessage = {
            id: `welcome_${customer.id}_${Date.now()}`,
            type: MessageType.TEXT,
            content: settings.welcomeMessage,
            senderId: currentUser?.id,
            senderName: currentUser?.name,
            senderAvatar: currentUser?.avatar,
            timestamp: new Date(),
            customerId: customer.id,
            status: 'sent'
          };
          
          setCustomerMessages(prev => ({
            ...prev,
            [customer.id]: [...(prev[customer.id] || []), welcomeMessage]
          }));
          
          // 通过WebSocket发送欢迎消息
          if (wsClient) {
            wsClient.sendMessage({
              messageType: 'text',
              content: settings.welcomeMessage,
              receiverId: customer.id,
            });
          }
        }, 500);
      }
    }
    
    // 移动端选择客户后自动关闭侧边栏
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // 打开设置
  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  // 关闭设置
  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  // 更新设置
  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 处理React组件事件
  const handleReactComponentEvent = (eventData) => {
    console.log('React组件事件:', eventData);
    
    try {
      // 根据事件类型处理
      switch (eventData.type) {
        case 'click':
          // 处理点击事件
          if (eventData.data?.action) {
            handleComponentAction(eventData.data.action, eventData.data);
          }
          break;
        case 'change':
          // 处理值变化事件
          if (eventData.data?.value !== undefined) {
            handleComponentValueChange(eventData.componentName, eventData.data.value);
          }
          break;
        case 'submit':
          // 处理表单提交事件
          handleComponentSubmit(eventData.data);
          break;
        default:
          console.log('未处理的事件类型:', eventData.type);
      }
    } catch (error) {
      console.error('处理React组件事件失败:', error);
    }
  };

  // 处理组件动作
  const handleComponentAction = (action, data) => {
    switch (action) {
      case 'open_url':
        if (data.url) {
          window.open(data.url, '_blank');
        }
        break;
      case 'send_message':
        if (data.message) {
          handleSendMessage({ content: data.message, type: 'text' });
        }
        break;
      case 'show_modal':
        // 可以在这里处理显示模态框的逻辑
        break;
      default:
        console.log('未处理的组件动作:', action);
    }
  };

  // 处理组件值变化
  const handleComponentValueChange = (componentName, value) => {
    console.log(`组件 ${componentName} 值变化:`, value);
    // 可以在这里处理组件值变化的逻辑
  };

  // 处理组件表单提交
  const handleComponentSubmit = (formData) => {
    console.log('组件表单提交:', formData);
    // 可以在这里处理表单提交的逻辑
  };

  // 处理自适应配置变更
  const handleAdaptiveConfigChange = (newConfig) => {
    console.log('自适应配置已更新:', newConfig);
    // 可以在这里处理配置变更后的逻辑，比如重新渲染相关组件
  };

  // 处理AI生成器打开
  const handleAIGeneratorOpen = () => {
    setIsAIGeneratorOpen(true);
  };

  // 处理AI生成器关闭
  const handleAIGeneratorClose = () => {
    setIsAIGeneratorOpen(false);
  };

  // 处理AI生成的组件
  const handleComponentGenerated = (componentData) => {
    console.log('AI生成的组件:', componentData);
    
    // 将生成的组件作为消息发送给当前客户
    if (currentCustomer) {
      const messageData = {
        type: 'react_component',
        content: 'AI生成的React组件',
        reactComponentData: componentData.component_data,
        adaptiveStyles: componentData.adaptive_styles,
        customerId: currentCustomer.id,
        senderId: currentUser?.id,
        senderName: currentUser?.name || '客服',
        senderAvatar: currentUser?.avatar || generateAvatarUrl(currentUser?.name || '客服'),
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      // 添加到消息列表
      setCustomerMessages(prev => ({
        ...prev,
        [currentCustomer.id]: [
          ...(prev[currentCustomer.id] || []),
          messageData
        ]
      }));

      // 通过WebSocket发送给后端
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: 'send_message',
          data: messageData
        }));
      }
    }
  };

  // 处理登录成功
  const handleLoginSuccess = (userInfo) => {
    setCurrentUser(userInfo);
    setIsLoggedIn(true);
    // 更新欢迎消息
    setSettings(prev => ({
      ...prev,
      welcomeMessage: `您好！欢迎咨询，我是${userInfo.name}，很高兴为您服务。请问有什么可以帮助您的吗？`
    }));
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      // 调用服务端登出API
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
      await fetch(`${baseUrl}/api/kefu/logout?kefu_id=${currentUser?.id}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('登出请求失败:', error);
    }

    // 清理本地数据
    localStorage.removeItem('kefu_user');
    localStorage.removeItem('kefu_session_token');
    localStorage.removeItem('kefu_remember');
    sessionStorage.removeItem('kefu_user');
    sessionStorage.removeItem('kefu_session_token');
    
    // 断开WebSocket连接
    if (wsClient) {
      wsClient.disconnect();
      setWsClient(null);
    }
    
    // 重置状态
    setCurrentUser(null);
    setIsLoggedIn(false);
    setMessages([]);
    setCurrentCustomer(null);
    setCustomerMessages({});
    setIsSettingsOpen(false);
    setConnectionStatus('disconnected');
    
    // 强制刷新页面
    setTimeout(() => {
      window.location.href = '/kefu/';
    }, 100);
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 已登录，显示主界面
  return (
    <div className="h-dvh w-full flex relative">
      {/* 移动端遮罩 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* 左侧客户列表 */}
      <div className={`
        ${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'} 
        w-72 flex-shrink-0 border-r border-divider bg-content1 flex flex-col
        ${isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        transition-transform duration-300 ease-in-out
      `}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
              <Icon icon="solar:chat-round-line-duotone" className="text-background" width={16} />
            </div>
            <span className="text-small font-bold">客服系统</span>
          </div>
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="dot"
              color={connectionStatus === 'connected' ? 'success' : 'default'}
            >
              {connectionStatus === 'connected' ? '已连接' : '未连接'}
            </Chip>
            {isMobile && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon icon="solar:close-line-duotone" width={20} />
              </Button>
            )}
          </div>
        </div>

        {/* 当前客服信息 */}
        <div className="p-4 border-b border-divider">
          <div className="flex items-center gap-3">
            <Avatar
              size="sm"
              src={currentUser?.avatar}
              name={currentUser?.name}
            />
            <div className="flex-1 min-w-0">
              <p className="text-small font-medium truncate">{currentUser?.name}</p>
              <p className="text-tiny text-default-400">在线 · 工号: {currentUser?.id}</p>
            </div>
          </div>
        </div>

        {/* 客户列表 */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <p className="text-small font-medium">在线客户</p>
              <Badge content="0" color="primary" size="sm">
                <Icon icon="solar:users-group-two-rounded-linear" width={16} />
              </Badge>
            </div>
          </div>
          
          <ScrollShadow className="flex-1 px-4">
            <div className="space-y-2">
              {/* 暂无客户时的提示 */}
              {!currentCustomer && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icon
                    className="text-default-300 mb-4"
                    icon="solar:users-group-rounded-line-duotone"
                    width={48}
                  />
                  <p className="text-small text-default-400 mb-2">暂无在线客户</p>
                  <p className="text-tiny text-default-300">
                    等待客户接入...
                  </p>
                </div>
              )}
            </div>
          </ScrollShadow>
        </div>

        {/* 底部统计 */}
        <div className="p-4 border-t border-divider">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-large font-semibold text-primary">0</p>
              <p className="text-tiny text-default-400">今日接待</p>
            </div>
            <div className="text-center">
              <p className="text-large font-semibold text-success">-</p>
              <p className="text-tiny text-default-400">满意度</p>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="flex items-center justify-between p-4 border-b border-divider bg-content1">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Icon icon="solar:hamburger-menu-line-duotone" width={20} />
              </Button>
            )}
            <Avatar
              size="sm"
              src={currentCustomer?.avatar || "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85421.jpg"}
              name={currentCustomer?.name || "选择客户"}
            />
            <div>
              <p className="text-small font-medium">{currentCustomer?.name || "选择客户"}</p>
              <p className="text-tiny text-default-500">
                {currentCustomer ? 
                  (currentCustomer.status === 'online' ? '在线' : '离线') : 
                  '请从左侧选择客户开始对话'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              startContent={<Icon icon="solar:settings-linear" width={20} />}
              onClick={handleSettingsOpen}
            >
              设置
            </Button>
          </div>
        </div>

        {/* 聊天消息显示区域 */}
        <ScrollShadow className="flex-1 p-6 space-y-4">
          {!currentCustomer ? (
            // 未选择客户时的欢迎界面
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Icon
                className="text-default-300 mb-4"
                icon="solar:chat-round-line-duotone"
                width={80}
              />
              <h3 className="text-large font-medium mb-2">欢迎使用客服工作台</h3>
              <p className="text-default-500 mb-4">
                请从左侧客户列表中选择一个客户开始对话
              </p>
              <div className="flex gap-2">
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  startContent={<Icon icon="solar:users-group-rounded-line-duotone" width={16} />}
                >
                  0 名客户在线
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  color="success"
                  startContent={<Icon icon="solar:check-circle-line-duotone" width={16} />}
                >
                  系统正常
                </Chip>
              </div>
            </div>
          ) : (
            <>
              {/* 连接状态提示 */}
              {connectionStatus !== 'connected' && (
                <MessagingChatMessage
                  messageType={MessageType.SYSTEM}
                  message={connectionStatus === 'connecting' ? '正在连接服务器...' : '连接已断开，正在重连...'}
                />
              )}
              
              {/* 渲染当前客户的消息 */}
              {(customerMessages[currentCustomer.id] || []).map((message) => {
                // 处理React组件消息
                if (message.type === 'react_component' && message.reactComponentData) {
                  return (
                    <div key={message.id} className="mb-4">
                      <MessagingChatMessage
                        avatar={message.senderAvatar}
                        name={message.senderName}
                        time={new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        message=""
                        messageType={MessageType.TEXT}
                        isRTL={message.senderId === currentUser?.id}
                        status={message.status}
                        classNames={{
                          base: message.senderId === currentUser?.id ? "bg-primary-50" : "bg-default-50",
                        }}
                      />
                      {/* React组件渲染器 - 暂时禁用 */}
                      {/* <div className="mt-2 ml-12">
                        <ReactCardRenderer
                          componentData={message.reactComponentData}
                          adaptiveStyles={message.adaptiveStyles}
                          containerId={`react-${message.id}`}
                          onEvent={handleReactComponentEvent}
                          className="react-message-card"
                        />
                      </div> */}
                    </div>
                  );
                }

                // 处理普通消息
                return (
                  <MessagingChatMessage
                    key={message.id}
                    avatar={message.senderAvatar}
                    name={message.senderName}
                    time={new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                    message={message.content}
                    messageType={message.type}
                    isRTL={message.senderId === currentUser?.id}
                    imageUrl={message.imageUrl}
                    fileName={message.fileName}
                    fileSize={message.fileSize}
                    fileUrl={message.fileUrl}
                    voiceDuration={message.voiceDuration}
                    voiceUrl={message.voiceUrl}
                    status={message.status}
                    classNames={{
                      base: message.senderId === currentUser?.id ? "bg-primary-50" : "bg-default-50",
                    }}
                  />
                );
              })}
            </>
          )}
        </ScrollShadow>

        {/* 底部输入区域 */}
        <div className="p-4 border-t border-divider bg-content1">
          {/* 快捷回复按钮 */}
          {settings.quickReplies.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {settings.quickReplies.slice(0, 3).map((reply, index) => (
                  <Button
                    key={`quick-reply-${reply.substring(0, 10)}-${index}`}
                    size="sm"
                    variant="bordered"
                    className="text-tiny"
                    onClick={() => {
                      if (reply.trim()) {
                        handleSendMessage({
                          type: 'text',
                          content: reply
                        });
                      }
                    }}
                  >
                    {reply.length > 20 ? `${reply.substring(0, 20)}...` : reply}
                  </Button>
                ))}
                {settings.quickReplies.length > 3 && (
                  <Dropdown>
                    <DropdownTrigger>
                      <Button size="sm" variant="light">
                        <Icon icon="solar:menu-dots-line-duotone" width={16} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      {settings.quickReplies.slice(3).map((reply, index) => (
                        <DropdownItem
                          key={`settings-reply-${reply.substring(0, 10)}-${index + 3}`}
                          onClick={() => {
                            if (reply.trim()) {
                              handleSendMessage({
                                type: 'text',
                                content: reply
                              });
                            }
                          }}
                        >
                          {reply.length > 30 ? `${reply.substring(0, 30)}...` : reply}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                )}
              </div>
            </div>
          )}
          
          <EnhancedPromptInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            placeholder="输入消息..."
            classNames={{
              button: "bg-primary opacity-100 w-[30px] h-[30px] !min-w-[30px] self-center",
              buttonIcon: "text-primary-foreground",
              input: "placeholder:text-default-500",
            }}
          />
          <p className="text-center text-tiny text-default-400 mt-2">
            支持发送文字、图片、文件和语音消息
          </p>
        </div>
      </div>

      {/* 设置弹窗 */}
      <Modal isOpen={isSettingsOpen} onClose={handleSettingsClose} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Icon icon="solar:settings-line-duotone" width={20} />
              <span>客服设置</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              <div>
                <h4 className="text-small font-medium mb-3">通知设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small">声音通知</p>
                      <p className="text-tiny text-default-500">新消息时播放提示音</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={settings.soundNotifications}
                      onValueChange={(value) => handleSettingsChange('soundNotifications', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small">正在输入指示器</p>
                      <p className="text-tiny text-default-500">显示客户正在输入状态</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={settings.showTypingIndicator}
                      onValueChange={(value) => handleSettingsChange('showTypingIndicator', value)}
                    />
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="text-small font-medium mb-3">工作状态</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small">在线状态</p>
                      <p className="text-tiny text-default-500">设置为在线接收新客户</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={settings.onlineStatus}
                      onValueChange={(value) => handleSettingsChange('onlineStatus', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small">自动回复</p>
                      <p className="text-tiny text-default-500">启用预设的自动回复消息</p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={settings.autoReply}
                      onValueChange={(value) => handleSettingsChange('autoReply', value)}
                    />
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="text-small font-medium mb-3">提示语设置</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-small mb-2">欢迎消息</p>
                    <p className="text-tiny text-default-500 mb-2">新客户接入时的自动欢迎语</p>
                    <textarea
                      className="w-full p-2 text-small rounded-lg border border-divider bg-content2 resize-none"
                      rows={3}
                      value={settings.welcomeMessage}
                      onChange={(e) => handleSettingsChange('welcomeMessage', e.target.value)}
                      placeholder="输入欢迎消息..."
                    />
                  </div>
                  
                  <div>
                    <p className="text-small mb-2">快捷回复</p>
                    <p className="text-tiny text-default-500 mb-2">设置常用的回复语句</p>
                    <div className="space-y-2">
                      {settings.quickReplies.map((reply, index) => (
                        <div key={`quick-reply-${reply.substring(0, 10)}-${index}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 p-2 text-small rounded-lg border border-divider bg-content2"
                            value={reply}
                            onChange={(e) => {
                              const newReplies = [...settings.quickReplies];
                              newReplies[index] = e.target.value;
                              handleSettingsChange('quickReplies', newReplies);
                            }}
                            placeholder={`快捷回复 ${index + 1}`}
                          />
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => {
                              const newReplies = settings.quickReplies.filter((_, i) => i !== index);
                              handleSettingsChange('quickReplies', newReplies);
                            }}
                          >
                            <Icon icon="solar:trash-bin-minimalistic-line-duotone" width={16} />
                          </Button>
                        </div>
                      ))}
                      {settings.quickReplies.length < 10 && (
                        <Button
                          size="sm"
                          variant="bordered"
                          startContent={<Icon icon="solar:add-circle-line-duotone" width={16} />}
                          onClick={() => {
                            const newReplies = [...settings.quickReplies, ''];
                            handleSettingsChange('quickReplies', newReplies);
                          }}
                          className="w-full"
                        >
                          添加快捷回复
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="text-small font-medium mb-3">系统信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-small text-default-500">客服工号</span>
                    <span className="text-small">{currentUser?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-small text-default-500">连接状态</span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={connectionStatus === 'connected' ? 'success' : 'warning'}
                    >
                      {connectionStatus === 'connected' ? '已连接' : '未连接'}
                    </Chip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-small text-default-500">今日接待</span>
                    <span className="text-small">0 人</span>
                  </div>
                </div>
              </div>

              <Divider />

              {/* React卡片设置 - 暂时禁用 */}
              {/* <div>
                <h4 className="text-small font-medium mb-3">React卡片设置</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-small mb-2">自适应配置</p>
                    <p className="text-tiny text-default-500 mb-2">配置React卡片的自适应行为和显示效果</p>
                    <Button
                      size="sm"
                      variant="bordered"
                      startContent={<Icon icon="solar:settings-line-duotone" width={16} />}
                      onClick={() => setIsAdaptiveConfigOpen(true)}
                      className="w-full"
                    >
                      配置自适应设置
                    </Button>
                  </div>
                  
                  <div>
                    <p className="text-small mb-2">AI组件生成器</p>
                    <p className="text-tiny text-default-500 mb-2">使用AI智能生成React组件</p>
                    <Button
                      size="sm"
                      variant="bordered"
                      startContent={<Icon icon="solar:magic-stick-line-duotone" width={16} />}
                      onClick={handleAIGeneratorOpen}
                      className="w-full"
                    >
                      打开AI生成器
                    </Button>
                  </div>
                </div>
              </div> */}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleSettingsClose}>
              关闭
            </Button>
            <Button color="primary" onPress={handleSettingsClose}>
              保存
            </Button>
            <Button
              color="danger"
              variant="light"
              onPress={handleLogout}
              startContent={<Icon icon="solar:logout-linear" />}
            >
              退出登录
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 自适应配置面板 - 暂时禁用 */}
      {/* <AdaptiveConfigPanel
        isOpen={isAdaptiveConfigOpen}
        onClose={() => setIsAdaptiveConfigOpen(false)}
        onConfigChange={handleAdaptiveConfigChange}
      /> */}

      {/* AI组件生成器 - 暂时禁用 */}
      {/* <AIComponentGenerator
        isOpen={isAIGeneratorOpen}
        onClose={handleAIGeneratorClose}
        onComponentGenerated={handleComponentGenerated}
        currentUserId={currentUser?.id}
      /> */}
    </div>
  );
}
