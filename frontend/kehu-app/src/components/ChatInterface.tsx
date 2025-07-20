import React, { useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader, Avatar, Button, Chip, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';
import { useChat } from '@/hooks/useChat';
import { useAppStore } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const { user, theme, toggleTheme } = useAppStore();
  const { 
    currentSession, 
    connectionStatus, 
    endCurrentSession,
    isClosingSession,
    sessionLoading 
  } = useChat();

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [currentSession?.messages, autoScroll]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setAutoScroll(isAtBottom);
  };

  if (!currentSession) {
    return (
      <div className={clsx('flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900', className)}>
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
            <Icon icon="mdi:chat-outline" className="text-4xl text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            选择一个会话开始聊天
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            从左侧选择现有会话，或创建新的会话
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'waiting': return 'warning';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'waiting': return '等待中';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // Group consecutive messages from same sender
  const groupedMessages = currentSession.messages.reduce((groups: any[], message, index) => {
    const prevMessage = currentSession.messages[index - 1];
    const isConsecutive = prevMessage && 
      prevMessage.sender.id === message.sender.id &&
      new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000; // 5 minutes

    groups.push({
      ...message,
      isConsecutive,
    });
    
    return groups;
  }, []);

  if (sessionLoading) {
    return (
      <div className={clsx('flex items-center justify-center h-full', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col h-full bg-white dark:bg-gray-800', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentSession.subject || '客服对话'}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Chip 
                color={getStatusColor(currentSession.status)} 
                variant="flat" 
                size="sm"
              >
                {getStatusText(currentSession.status)}
              </Chip>
              
              {currentSession.priority && currentSession.priority !== 'normal' && (
                <Chip 
                  color={getPriorityColor(currentSession.priority)} 
                  variant="flat" 
                  size="sm"
                >
                  {currentSession.priority}
                </Chip>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
              )}></div>
              <span className="text-xs text-gray-500">
                {connectionStatus.connected ? '已连接' : '未连接'}
              </span>
            </div>

            {/* Theme toggle */}
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={toggleTheme}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Icon icon={theme === 'dark' ? 'mdi:weather-sunny' : 'mdi:weather-night'} />
            </Button>

            {/* Close session */}
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => endCurrentSession()}
              isLoading={isClosingSession}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Icon icon="mdi:close" />
            </Button>
          </div>
        </div>

        {/* Session info */}
        <div className="px-4 pb-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              创建时间: {formatDistanceToNow(new Date(currentSession.createdAt), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </span>
            {currentSession.department && (
              <span>部门: {currentSession.department}</span>
            )}
            <span>
              消息数: {currentSession.messages.length}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {groupedMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                currentUser={user}
                isConsecutive={message.isConsecutive}
              />
            ))}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {!autoScroll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 right-8 z-10"
            >
              <Button
                isIconOnly
                color="primary"
                variant="shadow"
                size="sm"
                onPress={scrollToBottom}
                className="rounded-full"
              >
                <Icon icon="mdi:chevron-down" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Input */}
      <MessageInput 
        disabled={currentSession.status === 'closed'}
        placeholder={
          currentSession.status === 'closed' 
            ? '此会话已关闭' 
            : '输入消息...'
        }
      />
    </div>
  );
}