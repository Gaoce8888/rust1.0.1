import React from 'react';
import { Avatar, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { Message, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';

interface ChatMessageProps {
  message: Message;
  currentUser: User | null;
  isConsecutive?: boolean;
  showAvatar?: boolean;
}

export function ChatMessage({ 
  message, 
  currentUser, 
  isConsecutive = false,
  showAvatar = true 
}: ChatMessageProps) {
  const isOwn = message.sender.id === currentUser?.id;
  const isSystem = message.type === 'system';
  
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Icon icon="mdi:clock-outline" className="text-gray-400" />;
      case 'sent':
        return <Icon icon="mdi:check" className="text-gray-400" />;
      case 'delivered':
        return <Icon icon="mdi:check-all" className="text-gray-400" />;
      case 'read':
        return <Icon icon="mdi:check-all" className="text-blue-500" />;
      case 'failed':
        return <Icon icon="mdi:alert-circle" className="text-red-500" />;
      default:
        return null;
    }
  };

  const getMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="m-0 whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            {message.metadata?.imageUrl && (
              <img
                src={message.metadata.imageUrl}
                alt="Shared image"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.metadata?.imageUrl, '_blank')}
              />
            )}
            {message.content && (
              <p className="m-0 text-sm">{message.content}</p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Icon icon="mdi:file-document" className="text-2xl text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {message.metadata?.fileName || 'Unknown file'}
              </p>
              {message.metadata?.fileSize && (
                <p className="text-xs text-gray-500">
                  {(message.metadata.fileSize / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <button
              className="text-blue-500 hover:text-blue-600 transition-colors"
              onClick={() => window.open(message.content, '_blank')}
            >
              <Icon icon="mdi:download" className="text-lg" />
            </button>
          </div>
        );
      
      case 'voice':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Icon icon="mdi:microphone" className="text-2xl text-gray-500" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <button className="text-blue-500 hover:text-blue-600 transition-colors">
                  <Icon icon="mdi:play" className="text-lg" />
                </button>
                <div className="flex-1 h-1 bg-gray-300 rounded">
                  <div className="h-1 bg-blue-500 rounded" style={{ width: '0%' }}></div>
                </div>
                <span className="text-xs text-gray-500">
                  {message.metadata?.duration || 0}s
                </span>
              </div>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div className="text-center">
            <Chip 
              variant="flat" 
              color="default" 
              size="sm"
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {message.content}
            </Chip>
          </div>
        );
      
      default:
        return <p className="m-0">{message.content}</p>;
    }
  };

  if (isSystem) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        {getMessageContent()}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex gap-3 px-4 py-2 group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        isOwn && 'flex-row-reverse',
        isConsecutive && 'mt-1'
      )}
    >
      {/* Avatar */}
      {showAvatar && !isConsecutive && (
        <div className="flex-shrink-0">
          <Avatar
            src={message.sender.avatar}
            name={message.sender.name}
            size="sm"
            className={clsx(
              'transition-transform group-hover:scale-105',
              isOwn && 'ml-2'
            )}
          />
        </div>
      )}
      
      {/* Message content */}
      <div className={clsx(
        'flex-1 min-w-0 max-w-lg',
        isOwn && 'flex flex-col items-end',
        isConsecutive && showAvatar && 'ml-11'
      )}>
        {/* Sender name and timestamp */}
        {!isConsecutive && !isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {message.sender.name}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.timestamp), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </span>
          </div>
        )}
        
        {/* Message bubble */}
        <div className={clsx(
          'relative rounded-lg p-3 shadow-sm',
          isOwn 
            ? 'bg-blue-500 text-white chat-bubble-user' 
            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 chat-bubble-assistant'
        )}>
          {getMessageContent()}
          
          {/* Message status for own messages */}
          {isOwn && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-xs opacity-75">
                {formatDistanceToNow(new Date(message.timestamp), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </span>
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>
        
        {/* Timestamp for other messages */}
        {!isOwn && isConsecutive && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.timestamp), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}