import React from 'react';
import { Avatar, Badge } from './UI';
import clsx from 'clsx';

const ChatMessage = ({
  message,
  isOwn = false,
  showAvatar = true,
  showTime = true,
  isSystem = false,
  isRead = false,
  className,
  onResend,
  onQuote,
  ...props
}) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (date >= today) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'system':
        return 'bg-gray-100 text-gray-600';
      case 'error':
        return 'bg-red-50 text-red-600';
      case 'warning':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-900';
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        );
      
      case 'image':
        return (
          <div className="relative">
            <img 
              src={message.content} 
              alt="聊天图片"
              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.content, '_blank')}
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg max-w-xs">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.fileName || '未知文件'}
              </p>
              <p className="text-sm text-gray-500">
                {message.fileSize || '未知大小'}
              </p>
            </div>
          </div>
        );
      
      case 'quote':
        return (
          <div className="space-y-2">
            <div className="border-l-4 border-gray-300 pl-3 py-1 bg-gray-50 rounded text-sm text-gray-600">
              {message.quotedContent}
            </div>
            <div>{message.content}</div>
          </div>
        );
      
      default:
        return <div>{message.content}</div>;
    }
  };

  if (isSystem) {
    return (
      <div className={clsx('flex justify-center my-4', className)}>
        <div className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
          {message.content}
        </div>
        {showTime && (
          <span className="ml-2 text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        'flex gap-3 mb-4',
        isOwn ? 'justify-end' : 'justify-start',
        className
      )}
      {...props}
    >
      {/* 头像 */}
      {showAvatar && !isOwn && (
        <Avatar
          src={message.avatar}
          name={message.senderName}
          size="small"
          status={message.senderStatus}
        />
      )}

      {/* 消息内容 */}
      <div className={clsx('flex flex-col max-w-xs lg:max-w-md', isOwn && 'items-end')}>
        {/* 发送者信息 */}
        {!isOwn && message.senderName && (
          <div className="text-sm text-gray-600 mb-1">
            {message.senderName}
            {message.senderRole && (
              <Badge 
                content={message.senderRole} 
                size="small" 
                variant="flat" 
                className="ml-2"
              />
            )}
          </div>
        )}

        {/* 消息气泡 */}
        <div
          className={clsx(
            'px-4 py-2 rounded-lg shadow-sm relative',
            getMessageTypeColor(message.type),
            isOwn ? 'rounded-br-sm' : 'rounded-bl-sm',
            message.status === 'sending' && 'opacity-70',
            message.status === 'failed' && 'border border-red-200'
          )}
        >
          {renderMessageContent()}

          {/* 消息状态 */}
          {isOwn && (
            <div className="flex items-center justify-end mt-1 space-x-1">
              {message.status === 'sending' && (
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
              )}
              {message.status === 'sent' && (
                <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {message.status === 'read' && (
                <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {message.status === 'failed' && (
                <button
                  onClick={() => onResend?.(message)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                  title="重新发送"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        {showTime && (
          <div className={clsx('text-xs text-gray-400 mt-1', isOwn ? 'text-right' : 'text-left')}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>

      {/* 头像（自己的消息） */}
      {showAvatar && isOwn && (
        <Avatar
          src={message.avatar}
          name={message.senderName}
          size="small"
        />
      )}

      {/* 消息操作菜单（悬停显示） */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 -mr-8">
        <div className="flex flex-col space-y-1">
          {onQuote && (
            <button
              onClick={() => onQuote(message)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="引用"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;