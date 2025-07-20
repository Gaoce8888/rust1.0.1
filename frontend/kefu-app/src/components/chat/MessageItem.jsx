import React, { memo, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Avatar, Badge, Tooltip, Image, Button, Space } from 'antd';
import {
  UserOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  AudioOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

// 消息类型枚举，与后端保持一致
const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  AUDIO: 'audio',
  VIDEO: 'video',
  SYSTEM: 'system',
  VOICE: 'voice'
};

// 消息状态枚举
const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// 高性能消息组件
const MessageItem = memo(({
  message,
  isOwn = false,
  showAvatar = true,
  showTime = true,
  onRetry,
  onPreview,
  onDownload,
  className = ''
}) => {
  // 格式化时间
  const formattedTime = useMemo(() => {
    if (!message.timestamp) return '';
    return format(new Date(message.timestamp), 'HH:mm', { locale: zhCN });
  }, [message.timestamp]);

  // 获取头像
  const getAvatar = useCallback(() => {
    if (!showAvatar) return null;
    
    const icon = message.userType === 'kefu' ? 
      <CustomerServiceOutlined /> : 
      <UserOutlined />;
    
    return (
      <Avatar 
        src={message.avatar} 
        icon={!message.avatar && icon}
        size={36}
        className={`flex-shrink-0 ${isOwn ? 'order-2 ml-2' : 'order-1 mr-2'}`}
      />
    );
  }, [showAvatar, message.userType, message.avatar, isOwn]);

  // 获取状态图标
  const getStatusIcon = useCallback(() => {
    switch (message.status) {
      case MessageStatus.SENDING:
        return <ClockCircleOutlined className="text-gray-400" />;
      case MessageStatus.SENT:
        return <CheckCircleOutlined className="text-gray-400" />;
      case MessageStatus.DELIVERED:
        return <CheckCircleOutlined className="text-blue-500" />;
      case MessageStatus.READ:
        return (
          <span className="text-blue-500">
            <CheckCircleOutlined />
            <CheckCircleOutlined className="-ml-1" />
          </span>
        );
      case MessageStatus.FAILED:
        return (
          <Tooltip title="发送失败，点击重试">
            <Button
              type="text"
              size="small"
              icon={<ExclamationCircleOutlined />}
              onClick={() => onRetry?.(message)}
              className="text-red-500 hover:text-red-600"
            />
          </Tooltip>
        );
      default:
        return null;
    }
  }, [message, onRetry]);

  // 渲染消息内容
  const renderContent = useCallback(() => {
    switch (message.type) {
      case MessageType.TEXT:
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        );

      case MessageType.IMAGE:
        return (
          <Image
            src={message.url}
            alt={message.filename || '图片'}
            width={200}
            preview={{
              mask: '预览图片',
              onVisibleChange: (visible) => {
                if (visible) onPreview?.(message);
              }
            }}
            className="rounded-lg cursor-pointer"
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
          />
        );

      case MessageType.FILE:
        return (
          <div className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
               onClick={() => onDownload?.(message)}>
            <PaperClipOutlined className="text-2xl text-gray-600 mr-3" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{message.filename}</div>
              <div className="text-xs text-gray-500">{formatFileSize(message.filesize)}</div>
            </div>
          </div>
        );

      case MessageType.AUDIO:
      case MessageType.VOICE:
        return (
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <AudioOutlined className="text-xl text-blue-500 mr-2" />
            <div className="flex-1">
              <audio controls className="w-full max-w-xs">
                <source src={message.url} type="audio/mpeg" />
                您的浏览器不支持音频播放
              </audio>
            </div>
            {message.duration && (
              <span className="text-xs text-gray-500 ml-2">
                {formatDuration(message.duration)}
              </span>
            )}
          </div>
        );

      case MessageType.SYSTEM:
        return (
          <div className="text-center text-xs text-gray-500 py-1">
            {message.content}
          </div>
        );

      default:
        return <div className="text-gray-500">不支持的消息类型</div>;
    }
  }, [message, onPreview, onDownload]);

  // 系统消息特殊处理
  if (message.type === MessageType.SYSTEM) {
    return (
      <div className={`flex justify-center my-2 ${className}`}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={`flex items-end mb-4 ${isOwn ? 'justify-end' : 'justify-start'} ${className}`}>
      {getAvatar()}
      
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'order-1 items-end' : 'order-2 items-start'}`}>
        {/* 用户名和时间 */}
        {(message.username || showTime) && (
          <div className={`flex items-center mb-1 text-xs text-gray-500 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {message.username && <span className="mx-1">{message.username}</span>}
            {showTime && formattedTime && <span>{formattedTime}</span>}
          </div>
        )}
        
        {/* 消息内容 */}
        <div className={`
          relative px-4 py-2 rounded-lg shadow-sm
          ${isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}
          ${message.status === MessageStatus.FAILED ? 'opacity-60' : ''}
        `}>
          {renderContent()}
        </div>
        
        {/* 消息状态 */}
        {isOwn && (
          <div className="flex items-center mt-1 text-xs">
            {getStatusIcon()}
          </div>
        )}
      </div>
    </div>
  );
});

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化音频时长
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

MessageItem.displayName = 'MessageItem';

export default MessageItem;