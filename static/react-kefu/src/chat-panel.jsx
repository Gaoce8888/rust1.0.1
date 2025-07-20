 "use client";

import React, { useState, useEffect, useRef } from "react";
import { ScrollShadow, Avatar, Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";

import MessagingChatMessage, { MessageType } from "./messaging-chat-message";
import EnhancedPromptInput from "./enhanced-prompt-input";
import { getWebSocketClient } from "./websocket-client";

// 聊天面板组件
// 整合WebSocket通信和消息显示功能
export default function ChatPanel({ 
  currentUser, // 当前用户信息
  currentCustomer, // 当前聊天的客户信息
  className = "" 
}) {
  // 状态管理
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  // Refs
  const scrollRef = useRef(null);
  const wsClientRef = useRef(null);
  const typingTimerRef = useRef(null);

  // 初始化WebSocket连接
  useEffect(() => {
    const wsClient = getWebSocketClient('ws://localhost:6006/ws', {
      userId: currentUser.id,
      userType: currentUser.type || 'kefu',
    });
    
    wsClientRef.current = wsClient;

    // 设置事件监听器
    wsClient.on('connected', () => {
      setConnectionStatus('connected');
      setIsLoading(false);
      
      // 请求历史消息
      if (currentCustomer) {
        wsClient.send({
          type: 'getHistory',
          customerId: currentCustomer.id,
          limit: 50,
        });
      }
    });

    wsClient.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    wsClient.on('message', handleReceiveMessage);
    wsClient.on('messageStatus', handleMessageStatus);
    wsClient.on('typing', handleTypingStatus);
    wsClient.on('history', handleHistoryMessages);

    // 连接WebSocket
    wsClient.connect();

    // 清理函数
    return () => {
      wsClient.off('connected');
      wsClient.off('disconnected');
      wsClient.off('message');
      wsClient.off('messageStatus');
      wsClient.off('typing');
      wsClient.off('history');
    };
  }, [currentUser, currentCustomer]);

  // 处理接收到的消息
  const handleReceiveMessage = (data) => {
    const newMessage = {
      id: data.id,
      type: data.messageType || MessageType.TEXT,
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      timestamp: new Date(data.timestamp),
      imageUrl: data.imageUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileUrl: data.fileUrl,
      voiceDuration: data.voiceDuration,
      voiceUrl: data.voiceUrl,
      status: 'delivered',
    };

    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
  };

  // 处理消息状态更新
  const handleMessageStatus = (data) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status }
          : msg
      )
    );
  };

  // 处理正在输入状态
  const handleTypingStatus = (data) => {
    const userId = data.userId;
    
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      if (data.isTyping) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });

    // 自动清除输入状态（防止卡住）
    setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, 3000);
  };

  // 处理历史消息
  const handleHistoryMessages = (data) => {
    const historyMessages = data.messages.map(msg => ({
      id: msg.id,
      type: msg.messageType || MessageType.TEXT,
      content: msg.content,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      timestamp: new Date(msg.timestamp),
      imageUrl: msg.imageUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      fileUrl: msg.fileUrl,
      voiceDuration: msg.voiceDuration,
      voiceUrl: msg.voiceUrl,
      status: 'read',
    }));

    setMessages(historyMessages);
    setIsLoading(false);
    scrollToBottom();
  };

  // 发送消息
  const handleSendMessage = async (messageData) => {
    if (!wsClientRef.current || !currentCustomer) return;

    try {
      let sentMessage;
      
      // 根据消息类型处理
      switch (messageData.type) {
        case 'text':
          sentMessage = {
            messageType: MessageType.TEXT,
            content: messageData.content,
            receiverId: currentCustomer.id,
          };
          break;
          
        case 'image':
          // 先添加预览消息
          const tempImageMessage = {
            id: `temp-${Date.now()}`,
            type: MessageType.IMAGE,
            imageUrl: messageData.imageUrl,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            timestamp: new Date(),
            status: 'sending',
          };
          setMessages(prev => [...prev, tempImageMessage]);
          
          // 上传图片
          sentMessage = await wsClientRef.current.sendFile(messageData.file, 'image');
          
          // 更新消息ID
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempImageMessage.id 
                ? { ...msg, id: sentMessage.id, status: 'sent' }
                : msg
            )
          );
          return;
          
        case 'file':
          // 先添加文件消息
          const tempFileMessage = {
            id: `temp-${Date.now()}`,
            type: MessageType.FILE,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            timestamp: new Date(),
            status: 'sending',
          };
          setMessages(prev => [...prev, tempFileMessage]);
          
          // 上传文件
          sentMessage = await wsClientRef.current.sendFile(messageData.file, 'file');
          
          // 更新消息
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempFileMessage.id 
                ? { ...msg, ...sentMessage, status: 'sent' }
                : msg
            )
          );
          return;
          
        case 'voice':
          sentMessage = {
            messageType: MessageType.VOICE,
            voiceDuration: messageData.voiceDuration,
            receiverId: currentCustomer.id,
          };
          break;
      }

      // 发送消息
      const finalMessage = wsClientRef.current.sendMessage({
        ...sentMessage,
        receiverId: currentCustomer.id,
      });

      // 添加到消息列表
      const newMessage = {
        ...finalMessage,
        type: finalMessage.messageType || MessageType.TEXT,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
      
    } catch (error) {
      console.error('发送消息失败:', error);
      // 可以在这里添加错误提示
    }
  };

  // 处理正在输入
  const handleTyping = () => {
    if (!wsClientRef.current) return;
    
    // 发送正在输入状态
    wsClientRef.current.sendTyping();
    
    // 清除之前的定时器
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // 3秒后自动停止输入状态
    typingTimerRef.current = setTimeout(() => {
      // 可以发送停止输入的消息
    }, 3000);
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // 格式化时间
  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // 如果是今天，只显示时间
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + messageDate.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // 其他情况显示完整日期
    return messageDate.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染消息分组（按时间）
  const renderMessagesWithTimeGroups = () => {
    const grouped = [];
    let lastDate = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp);
      const dateStr = messageDate.toDateString();

      // 如果日期变了，添加时间分隔
      if (lastDate !== dateStr) {
        grouped.push(
          <MessagingChatMessage
            key={`time-${index}`}
            messageType={MessageType.SYSTEM}
            message={formatDateSeparator(messageDate)}
          />
        );
        lastDate = dateStr;
      }

      // 添加消息
      grouped.push(
        <MessagingChatMessage
          key={message.id}
          avatar={message.senderAvatar}
          name={message.senderName}
          time={formatTime(message.timestamp)}
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
            base: message.senderId === currentUser.id ? "bg-primary-50" : "bg-default-50",
          }}
        />
      );
    });

    return grouped;
  };

  // 格式化日期分隔符
  const formatDateSeparator = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === now.toDateString()) {
      return '今天';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    return messageDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!currentCustomer) {
    return (
      <div className="flex h-full items-center justify-center text-default-400">
        <div className="text-center">
          <Icon icon="solar:chat-round-dots-linear" width={48} className="mx-auto mb-2" />
          <p>请选择一个客户开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-full flex-col ${className}`}>
      {/* 聊天头部 */}
      <div className="flex items-center justify-between border-b border-divider px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar src={currentCustomer.avatar} size="sm" />
          <div>
            <p className="text-small font-semibold">{currentCustomer.name}</p>
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                variant="dot"
                color={connectionStatus === 'connected' ? 'success' : 'default'}
              >
                {connectionStatus === 'connected' ? '在线' : '离线'}
              </Chip>
              {typingUsers.has(currentCustomer.id) && (
                <span className="text-tiny text-default-400">正在输入...</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button isIconOnly variant="light" size="sm">
            <Icon icon="solar:phone-linear" width={20} />
          </Button>
          <Button isIconOnly variant="light" size="sm">
            <Icon icon="solar:videocamera-linear" width={20} />
          </Button>
          <Button isIconOnly variant="light" size="sm">
            <Icon icon="solar:menu-dots-bold" width={20} />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollShadow 
        ref={scrollRef}
        className="flex h-full max-h-[calc(100vh-200px)] flex-col gap-6 overflow-y-auto p-6"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-default-400">
            <p>暂无消息，开始新的对话吧</p>
          </div>
        ) : (
          renderMessagesWithTimeGroups()
        )}
      </ScrollShadow>

      {/* 输入区域 */}
      <div className="mt-auto border-t border-divider p-4">
        <EnhancedPromptInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          placeholder={`回复 ${currentCustomer.name}...`}
          classNames={{
            button: "bg-primary opacity-100 w-[30px] h-[30px] !min-w-[30px] self-center",
            buttonIcon: "text-primary-foreground",
            input: "placeholder:text-default-500",
          }}
        />
      </div>
    </div>
  );
}