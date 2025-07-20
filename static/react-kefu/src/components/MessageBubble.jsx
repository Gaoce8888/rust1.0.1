import React from 'react';
import { Card, Avatar, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 消息气泡组件
 * 支持文本、图片、文件等多种消息类型
 */
export default function MessageBubble({ 
  message, 
  isOwn = false, 
  showAvatar = true, 
  showTime = true,
  onImageClick 
}) {
  const {
    content,
    type = 'text',
    timestamp,
    sender,
    status = 'sent'
  } = message;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sending':
        return <Icon icon="solar:clock-circle-linear" className="text-default-400" />;
      case 'sent':
        return <Icon icon="solar:check-circle-linear" className="text-success" />;
      case 'delivered':
        return <Icon icon="solar:check-circle-linear" className="text-success" />;
      case 'read':
        return <Icon icon="solar:check-circle-linear" className="text-primary" />;
      case 'failed':
        return <Icon icon="solar:close-circle-linear" className="text-danger" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {content}
          </div>
        );
      
      case 'image':
        return (
          <div className="max-w-xs">
            <img 
              src={content} 
              alt="图片消息" 
              className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(content)}
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 bg-default-50 rounded-lg">
            <Icon icon="solar:file-linear" className="text-2xl text-primary" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{content.name}</div>
              <div className="text-xs text-default-500">{content.size}</div>
            </div>
            <Icon icon="solar:download-linear" className="text-default-400" />
          </div>
        );
      
      case 'system':
        return (
          <div className="text-center text-sm text-default-500 italic">
            {content}
          </div>
        );
      
      default:
        return <div>{content}</div>;
    }
  };

  if (type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <Chip 
          size="sm" 
          variant="flat" 
          className="bg-default-100 text-default-600"
        >
          {content}
        </Chip>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && !isOwn && (
        <Avatar
          size="sm"
          src={sender?.avatar}
          name={sender?.name || sender?.username}
          className="flex-shrink-0"
        />
      )}
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {!isOwn && sender?.name && (
          <div className="text-xs text-default-500 mb-1 ml-1">
            {sender.name}
          </div>
        )}
        
        <Card 
          className={`px-3 py-2 ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-default-100'
          }`}
          shadow="none"
        >
          {renderContent()}
        </Card>
        
        <div className={`flex items-center gap-1 mt-1 ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        }`}>
          {showTime && timestamp && (
            <span className="text-xs text-default-400">
              {formatTime(timestamp)}
            </span>
          )}
          {isOwn && (
            <span className="text-xs">
              {getStatusIcon(status)}
            </span>
          )}
        </div>
      </div>
      
      {showAvatar && isOwn && (
        <Avatar
          size="sm"
          src={sender?.avatar}
          name={sender?.name || sender?.username}
          className="flex-shrink-0"
        />
      )}
    </div>
  );
}