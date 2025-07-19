"use client";

import React from "react";
import {
  ScrollShadow,
  Button,
  Chip,
  Card,
  CardBody,
  Avatar,
  Badge,
  Divider,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tabs,
  Tab,
  Spinner,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Select,
  SelectItem,
  Switch
} from "@heroui/react";
import {Icon} from "@iconify/react";
// import {useMediaQuery} from "usehooks-ts";
// import {cn} from "./utils";

import SidebarContainer from "./sidebar-with-chat-history";
import MessagingChatMessage, { MessageType } from "./messaging-chat-message";
import EnhancedPromptInput from "./enhanced-prompt-input";
import { getWebSocketClient } from "./websocket-client";

// 客户信息类型定义
const CustomerType = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

// 消息状态类型定义
const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read'
};

// 主应用组件 - 优化版客服聊天界面
export default function OptimizedApp() {
  const [messages, setMessages] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [activeCustomer, setActiveCustomer] = React.useState(null);
  const [wsClient, setWsClient] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [workstationStatus, setWorkstationStatus] = React.useState({
    isOnline: true,
    availableSlots: 5,
    maxSlots: 8,
    responseTime: 45,
    satisfaction: 4.8
  });
  
  const {isOpen: isSettingsOpen, onOpen: onSettingsOpen, onOpenChange: onSettingsChange} = useDisclosure();
  const [selectedTab, setSelectedTab] = React.useState("active");
  const [autoReply, setAutoReply] = React.useState(false);
  const [soundNotifications, setSoundNotifications] = React.useState(true);
  
  const isMobile = window.innerWidth <= 768;
  const isCompact = window.innerWidth <= 1024;

  // 当前客服信息
  const currentUser = {
    id: 'kf001',
    name: '客服小王',
    avatar: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg',
    type: 'kefu',
    department: '技术支持部',
    workingHours: '09:00-18:00'
  };

  // 初始化WebSocket连接
  React.useEffect(() => {
    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        
        const client = getWebSocketClient('ws://localhost:6006/ws', {
          userId: currentUser.id,
          userType: currentUser.type,
          autoReconnect: true,
          reconnectInterval: 3000,
          maxReconnectAttempts: 10
        });

        // 设置事件监听
        client.on('connected', () => {
          setConnectionStatus('connected');
          console.log('WebSocket连接成功');
        });

        client.on('disconnected', () => {
          setConnectionStatus('disconnected');
          console.log('WebSocket连接断开');
        });

        client.on('error', (error) => {
          console.error('WebSocket错误:', error);
          setConnectionStatus('disconnected');
        });

        client.on('message', (data) => {
          handleReceiveMessage(data);
        });

        client.on('OnlineUsers', (data) => {
          handleOnlineUsers(data);
        });

        client.on('Chat', (data) => {
          handleReceiveMessage(data);
        });

        client.on('UserJoined', (data) => {
          handleCustomerJoined(data);
        });

        client.on('UserLeft', (data) => {
          handleCustomerLeft(data);
        });

        client.on('customerJoined', (data) => {
          handleCustomerJoined(data);
        });

        client.on('customerLeft', (data) => {
          handleCustomerLeft(data);
        });

        client.on('typing', (data) => {
          handleTypingStatus(data);
        });

        // 连接
        await client.connect();
        setWsClient(client);

        // 清空初始客户数据，等待真实客户接入
        setCustomers([]);

      } catch (error) {
        console.error('WebSocket初始化失败:', error);
        setConnectionStatus('disconnected');
      }
    };

    initializeConnection();

    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, []);

  // 处理接收到的消息
  const handleReceiveMessage = (data) => {
    const newMessage = {
      id: data.id || Date.now().toString(),
      type: data.messageType || MessageType.TEXT,
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      timestamp: new Date(data.timestamp),
      customerId: data.customerId || data.senderId,
      status: MessageStatus.DELIVERED,
      imageUrl: data.imageUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileUrl: data.fileUrl,
      voiceDuration: data.voiceDuration,
      voiceUrl: data.voiceUrl,
    };

    setMessages(prev => [...prev, newMessage]);
    
    // 更新客户列表中的未读消息数
    setCustomers(prev => prev.map(customer => 
      customer.id === newMessage.customerId 
        ? { 
            ...customer, 
            unreadCount: customer.unreadCount + 1,
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.timestamp,
            isTyping: false
          }
        : customer
    ));

    // 声音通知
    if (soundNotifications) {
      playNotificationSound();
    }
  };

  // 处理在线用户列表
  const handleOnlineUsers = (data) => {
    console.log('收到在线用户列表:', data);
    if (data.users && Array.isArray(data.users)) {
      const customerList = data.users.filter(user => user.user_type === 'kehu').map(user => ({
        id: user.user_id,
        name: user.user_name || user.user_id,
        avatar: user.avatar || 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85825.jpg',
        status: CustomerType.ONLINE,
        unreadCount: 0,
        sessionId: user.session_id || `session_${user.user_id}`,
        isTyping: false,
        lastSeen: user.last_seen ? new Date(user.last_seen) : new Date()
      }));
      
      setCustomers(customerList);
      console.log('更新客户列表:', customerList);
    }
  };

  // 处理客户加入
  const handleCustomerJoined = (data) => {
    const newCustomer = {
      id: data.customerId,
      name: data.customerName,
      avatar: data.customerAvatar,
      status: CustomerType.ONLINE,
      unreadCount: 0,
      sessionId: data.sessionId,
      isTyping: false
    };

    setCustomers(prev => {
      const exists = prev.find(c => c.id === newCustomer.id);
      if (exists) {
        return prev.map(c => c.id === newCustomer.id ? {...c, status: CustomerType.ONLINE} : c);
      }
      return [...prev, newCustomer];
    });
  };

  // 处理客户离开
  const handleCustomerLeft = (data) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === data.customerId 
        ? { ...customer, status: CustomerType.OFFLINE }
        : customer
    ));
  };

  // 处理输入状态
  const handleTypingStatus = (data) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === data.customerId 
        ? { ...customer, isTyping: data.isTyping }
        : customer
    ));
  };

  // 发送消息
  const handleSendMessage = async (messageData) => {
    if (!wsClient || !activeCustomer) return;

    const message = {
      id: Date.now().toString(),
      type: messageData.type === 'text' ? MessageType.TEXT : 
            messageData.type === 'image' ? MessageType.IMAGE :
            messageData.type === 'file' ? MessageType.FILE :
            messageData.type === 'voice' ? MessageType.VOICE : MessageType.TEXT,
      content: messageData.content,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      timestamp: new Date(),
      customerId: activeCustomer.id,
      status: MessageStatus.SENDING,
      imageUrl: messageData.imageUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
      fileUrl: messageData.fileUrl,
      voiceDuration: messageData.voiceDuration,
      voiceUrl: messageData.voiceUrl,
    };

    setMessages(prev => [...prev, message]);

    try {
      const sentMessage = await wsClient.sendMessage({
        messageType: messageData.type,
        content: messageData.content,
        receiverId: activeCustomer.id,
        ...messageData,
      });

      // 更新消息状态
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? {...msg, status: MessageStatus.SENT} : msg
      ));

      // 更新客户的最后消息
      setCustomers(prev => prev.map(customer => 
        customer.id === activeCustomer.id 
          ? { 
              ...customer, 
              lastMessage: message.content,
              lastMessageTime: message.timestamp
            }
          : customer
      ));

    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? {...msg, status: MessageStatus.SENT} : msg
      ));
    }
  };

  // 处理正在输入
  const handleTyping = () => {
    if (wsClient && activeCustomer) {
      wsClient.sendTyping(activeCustomer.id);
    }
  };

  // 选择客户
  const handleSelectCustomer = (customer) => {
    setActiveCustomer(customer);
    
    // 清除未读消息数
    setCustomers(prev => prev.map(c => 
      c.id === customer.id ? {...c, unreadCount: 0} : c
    ));
    
    // 标记消息为已读
    setMessages(prev => prev.map(msg => 
      msg.customerId === customer.id && msg.senderId !== currentUser.id
        ? {...msg, status: MessageStatus.READ}
        : msg
    ));
  };

  // 播放通知音
  const playNotificationSound = () => {
    // 实现通知音播放逻辑
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('播放通知音失败:', e));
  };

  // 获取客户消息
  const getCustomerMessages = (customerId) => {
    return messages.filter(msg => msg.customerId === customerId);
  };

  // 获取活跃客户
  const getActiveCustomers = () => {
    return customers.filter(c => c.status === CustomerType.ONLINE || c.unreadCount > 0);
  };

  // 获取等待中的客户
  const getWaitingCustomers = () => {
    return customers.filter(c => c.status === CustomerType.AWAY || c.status === CustomerType.BUSY);
  };

  // 渲染客户列表项
  const renderCustomerItem = (customer) => {
    const isActive = activeCustomer?.id === customer.id;
    
    return (
      <div
        key={customer.id}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isActive ? "bg-primary-50 border-2 border-primary-200" : "hover:bg-content2"
        } ${customer.unreadCount > 0 && !isActive ? "bg-warning-50" : ""}`}
        onClick={() => handleSelectCustomer(customer)}
      >
        <Badge
          color={customer.status === CustomerType.ONLINE ? 'success' : 
                 customer.status === CustomerType.AWAY ? 'warning' : 
                 customer.status === CustomerType.BUSY ? 'danger' : 'default'}
          content=""
          size="sm"
          shape="circle"
        >
          <Avatar
            size="sm"
            src={customer.avatar}
            name={customer.name}
          />
        </Badge>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-small font-medium truncate">{customer.name}</p>
            {customer.lastMessageTime && (
              <p className="text-tiny text-default-400">
                {customer.lastMessageTime.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-tiny text-default-500 truncate">
              {customer.isTyping ? '正在输入...' : customer.lastMessage || '新客户'}
            </p>
            {customer.unreadCount > 0 && (
              <Badge color="danger" content={customer.unreadCount} size="sm" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染工作台状态
  const renderWorkstationStatus = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-small">工作状态</span>
        <Switch
          size="sm"
          isSelected={workstationStatus.isOnline}
          onValueChange={(value) => setWorkstationStatus(prev => ({...prev, isOnline: value}))}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-content2 rounded-lg">
          <p className="text-tiny text-default-500">服务中</p>
          <p className="text-small font-medium">
            {workstationStatus.maxSlots - workstationStatus.availableSlots}/{workstationStatus.maxSlots}
          </p>
        </div>
        
        <div className="p-2 bg-content2 rounded-lg">
          <p className="text-tiny text-default-500">响应时间</p>
          <p className="text-small font-medium">{workstationStatus.responseTime}s</p>
        </div>
        
        <div className="p-2 bg-content2 rounded-lg">
          <p className="text-tiny text-default-500">满意度</p>
          <p className="text-small font-medium">{workstationStatus.satisfaction}/5.0</p>
        </div>
        
        <div className="p-2 bg-content2 rounded-lg">
          <p className="text-tiny text-default-500">今日接待</p>
          <p className="text-small font-medium">0人</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-dvh w-full max-w-full">
      <SidebarContainer
        header={
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="dot"
              color={connectionStatus === 'connected' ? 'success' : 'default'}
            >
              {connectionStatus === 'connected' ? '已连接' : '未连接'}
            </Chip>
            <Button
              size="sm"
              variant="light"
              startContent={<Icon icon="solar:settings-linear" width={20} />}
              onClick={onSettingsOpen}
            >
              设置
            </Button>
          </div>
        }
        subTitle={`${getActiveCustomers().length}名客户在线`}
        title="客服工作台"
      >
        <div className="flex h-full">
          {/* 左侧客户列表 */}
          <div className={cn(
            "flex flex-col bg-content1 border-r border-divider",
            isMobile ? "w-full" : "w-80"
          )}>
            {/* 客户列表标签页 */}
            <div className="p-3 border-b border-divider">
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key)}
                size="sm"
                variant="bordered"
                classNames={{
                  tabList: "w-full",
                  tab: "flex-1"
                }}
              >
                <Tab key="active" title={`活跃 (${getActiveCustomers().length})`} />
                <Tab key="waiting" title={`等待 (${getWaitingCustomers().length})`} />
                <Tab key="all" title={`全部 (${customers.length})`} />
              </Tabs>
            </div>

            {/* 客户列表 */}
            <ScrollShadow className="flex-1 p-3 space-y-2">
              {selectedTab === 'active' && getActiveCustomers().map(renderCustomerItem)}
              {selectedTab === 'waiting' && getWaitingCustomers().map(renderCustomerItem)}
              {selectedTab === 'all' && customers.map(renderCustomerItem)}
              
              {((selectedTab === 'active' && getActiveCustomers().length === 0) ||
                (selectedTab === 'waiting' && getWaitingCustomers().length === 0) ||
                (selectedTab === 'all' && customers.length === 0)) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icon
                    className="text-default-300 mb-2"
                    icon="solar:users-group-rounded-line-duotone"
                    width={48}
                  />
                  <p className="text-small text-default-400">暂无客户</p>
                </div>
              )}
            </ScrollShadow>

            {/* 工作台状态 */}
            <div className="p-3 border-t border-divider">
              {renderWorkstationStatus()}
            </div>
          </div>

          {/* 右侧聊天区域 */}
          <div className="flex-1 flex flex-col">
            {activeCustomer ? (
              <>
                {/* 聊天标题栏 */}
                <div className="flex items-center justify-between p-4 border-b border-divider bg-content1">
                  <div className="flex items-center gap-3">
                    <Badge
                      color={activeCustomer.status === CustomerType.ONLINE ? 'success' : 'warning'}
                      content=""
                      size="sm"
                      shape="circle"
                    >
                      <Avatar
                        size="sm"
                        src={activeCustomer.avatar}
                        name={activeCustomer.name}
                      />
                    </Badge>
                    <div>
                      <p className="text-small font-medium">{activeCustomer.name}</p>
                      <p className="text-tiny text-default-500">
                        {activeCustomer.isTyping ? '正在输入...' : activeCustomer.status === CustomerType.ONLINE ? '在线' : '离线'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Tooltip content="客户信息">
                      <Button isIconOnly size="sm" variant="light">
                        <Icon icon="solar:user-circle-line-duotone" width={20} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="历史记录">
                      <Button isIconOnly size="sm" variant="light">
                        <Icon icon="solar:history-line-duotone" width={20} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="更多操作">
                      <Button isIconOnly size="sm" variant="light">
                        <Icon icon="solar:menu-dots-line-duotone" width={20} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {/* 聊天消息显示区域 */}
                <ScrollShadow className="flex-1 p-4 space-y-4">
                  {connectionStatus !== 'connected' && (
                    <div className="flex items-center justify-center p-4 bg-warning-50 rounded-lg">
                      <Icon icon="solar:wifi-router-minimalistic-broken-line-duotone" width={20} className="text-warning mr-2" />
                      <span className="text-small text-warning">连接已断开，正在重连...</span>
                    </div>
                  )}
                  
                  {getCustomerMessages(activeCustomer.id).map((message) => (
                    <MessagingChatMessage
                      key={message.id}
                      avatar={message.senderAvatar}
                      name={message.senderName}
                      time={message.timestamp.toLocaleTimeString('zh-CN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      message={message.content}
                      messageType={message.type}
                      isRTL={message.senderId === currentUser.id}
                      imageUrl={message.imageUrl}
                      fileName={message.fileName}
                      fileSize={message.fileSize}
                      fileUrl={message.fileUrl}
                      voiceDuration={message.voiceDuration}
                      voiceUrl={message.voiceUrl}
                      status={message.status}
                      classNames={{
                        base: message.senderId === currentUser.id ? "bg-primary-50" : "bg-content2",
                      }}
                    />
                  ))}
                </ScrollShadow>

                {/* 底部输入区域 */}
                <div className="p-4 border-t border-divider bg-content1">
                  <EnhancedPromptInput
                    onSendMessage={handleSendMessage}
                    onTyping={handleTyping}
                    placeholder="输入消息..."
                    disabled={connectionStatus !== 'connected'}
                    classNames={{
                      button: "bg-primary opacity-100 w-[30px] h-[30px] !min-w-[30px] self-center",
                      buttonIcon: "text-primary-foreground",
                      input: "placeholder:text-default-500",
                    }}
                  />
                  <p className="px-2 text-center text-tiny text-default-400 mt-2">
                    支持发送文字、图片、文件和语音消息
                  </p>
                </div>
              </>
            ) : (
              // 未选择客户时的欢迎界面
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Icon
                  className="text-default-300 mb-4"
                  icon="solar:chat-round-line-duotone"
                  width={80}
                />
                <h3 className="text-large font-medium mb-2">欢迎使用客服工作台</h3>
                <p className="text-default-500 mb-4">
                  选择左侧客户开始对话，或等待新客户接入
                </p>
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<Icon icon="solar:users-group-rounded-line-duotone" width={20} />}
                  >
                    查看客户列表
                  </Button>
                  <Button
                    variant="bordered"
                    startContent={<Icon icon="solar:settings-line-duotone" width={20} />}
                    onClick={onSettingsOpen}
                  >
                    设置
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarContainer>

      {/* 设置弹窗 */}
      <Modal isOpen={isSettingsOpen} onOpenChange={onSettingsChange} size="md">
        <ModalContent>
          <ModalHeader>客服设置</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-small">自动回复</span>
                <Switch
                  size="sm"
                  isSelected={autoReply}
                  onValueChange={setAutoReply}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-small">声音通知</span>
                <Switch
                  size="sm"
                  isSelected={soundNotifications}
                  onValueChange={setSoundNotifications}
                />
              </div>
              
              <div className="space-y-2">
                <span className="text-small">最大接待客户数</span>
                <Select
                  size="sm"
                  selectedKeys={[workstationStatus.maxSlots.toString()]}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    setWorkstationStatus(prev => ({...prev, maxSlots: parseInt(value)}));
                  }}
                >
                  <SelectItem key="5" value="5">5人</SelectItem>
                  <SelectItem key="8" value="8">8人</SelectItem>
                  <SelectItem key="10" value="10">10人</SelectItem>
                  <SelectItem key="15" value="15">15人</SelectItem>
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onSettingsChange}>
              取消
            </Button>
            <Button color="primary" onPress={onSettingsChange}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}