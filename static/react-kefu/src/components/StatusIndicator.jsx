import React from 'react';
import { Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 状态指示器组件
 * 用于显示各种状态信息
 */
export default function StatusIndicator({ 
  status, 
  type = 'connection',
  size = 'sm',
  showIcon = true,
  showText = true,
  className = ""
}) {
  const getStatusConfig = () => {
    switch (type) {
      case 'connection':
        return {
          connected: {
            color: 'success',
            icon: 'solar:connection-linear',
            text: '已连接'
          },
          connecting: {
            color: 'warning',
            icon: 'solar:connection-linear',
            text: '连接中...'
          },
          disconnected: {
            color: 'danger',
            icon: 'solar:connection-linear',
            text: '未连接'
          },
          error: {
            color: 'danger',
            icon: 'solar:close-circle-linear',
            text: '连接错误'
          }
        };
      
      case 'online':
        return {
          online: {
            color: 'success',
            icon: 'solar:user-check-linear',
            text: '在线'
          },
          offline: {
            color: 'default',
            icon: 'solar:user-linear',
            text: '离线'
          },
          away: {
            color: 'warning',
            icon: 'solar:user-minus-linear',
            text: '离开'
          },
          busy: {
            color: 'danger',
            icon: 'solar:user-block-linear',
            text: '忙碌'
          }
        };
      
      case 'message':
        return {
          sent: {
            color: 'success',
            icon: 'solar:check-circle-linear',
            text: '已发送'
          },
          sending: {
            color: 'warning',
            icon: 'solar:clock-circle-linear',
            text: '发送中...'
          },
          delivered: {
            color: 'success',
            icon: 'solar:check-circle-linear',
            text: '已送达'
          },
          read: {
            color: 'primary',
            icon: 'solar:check-circle-linear',
            text: '已读'
          },
          failed: {
            color: 'danger',
            icon: 'solar:close-circle-linear',
            text: '发送失败'
          }
        };
      
      default:
        return {};
    }
  };

  const config = getStatusConfig()[status] || {
    color: 'default',
    icon: 'solar:question-circle-linear',
    text: status || '未知状态'
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    
    if (status === 'connecting' || status === 'sending') {
      return <Spinner size="sm" color="current" />;
    }
    
    return <Icon icon={config.icon} className="text-current" />;
  };

  const renderText = () => {
    if (!showText) return null;
    return config.text;
  };

  return (
    <Chip
      size={size}
      color={config.color}
      variant="flat"
      startContent={renderIcon()}
      className={className}
    >
      {renderText()}
    </Chip>
  );
}

// 导出常用的状态类型
export const ConnectionStatus = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

export const OnlineStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

export const MessageStatus = {
  SENT: 'sent',
  SENDING: 'sending',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};