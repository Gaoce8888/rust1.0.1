import React from 'react';
import { Avatar, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

/**
 * ChatBubble - 可复用的聊天气泡组件
 * @param {Object} props
 * @param {string} props.message - 消息内容
 * @param {string} props.sender - 发送者名称
 * @param {string} props.avatar - 头像URL
 * @param {Date} props.timestamp - 消息时间戳
 * @param {boolean} props.isOwn - 是否是自己发送的消息
 * @param {string} props.status - 消息状态 (sent, delivered, read)
 * @param {string} props.type - 消息类型 (text, image, file)
 */
const ChatBubble = ({ 
  message, 
  sender, 
  avatar, 
  timestamp, 
  isOwn = false, 
  status = 'sent',
  type = 'text' 
}) => {
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderStatus = () => {
    if (!isOwn) return null;
    
    const statusIcons = {
      sent: <Icon icon="ph:check" className="w-4 h-4 text-gray-400" />,
      delivered: <Icon icon="ph:checks" className="w-4 h-4 text-gray-400" />,
      read: <Icon icon="ph:checks" className="w-4 h-4 text-blue-500" />
    };
    
    return statusIcons[status] || null;
  };

  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <img 
            src={message} 
            alt="发送的图片" 
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        );
      case 'file':
        return (
          <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon icon="ph:file-text" className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <span className="text-sm">{message}</span>
          </div>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap">{message}</p>;
    }
  };

  return (
    <div className={clsx(
      "flex gap-3 mb-4",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {!isOwn && (
        <Avatar
          src={avatar}
          name={sender}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      
      <div className={clsx(
        "max-w-[70%] space-y-1",
        isOwn ? "items-end" : "items-start"
      )}>
        {!isOwn && (
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {sender}
          </p>
        )}
        
        <div className={clsx(
          "rounded-2xl px-4 py-2 shadow-sm",
          isOwn 
            ? "bg-blue-500 text-white rounded-br-sm" 
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
        )}>
          {renderContent()}
        </div>
        
        <div className={clsx(
          "flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400",
          isOwn ? "justify-end mr-2" : "ml-2"
        )}>
          <span>{formatTime(timestamp)}</span>
          {renderStatus()}
        </div>
      </div>
      
      {isOwn && (
        <Avatar
          src={avatar}
          name={sender}
          size="sm"
          className="flex-shrink-0"
        />
      )}
    </div>
  );
};

export default ChatBubble;