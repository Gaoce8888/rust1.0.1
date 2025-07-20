import React from 'react';
import { Avatar, Tooltip } from "@heroui/react";

/**
 * 用户头像组件
 * 支持在线状态显示、大小调整和点击事件
 */
export default function UserAvatar({ 
  user, 
  size = "md", 
  showStatus = true, 
  showTooltip = true,
  onClick,
  className = ""
}) {
  const {
    id,
    name,
    username,
    avatar,
    status = 'offline',
    isOnline = false
  } = user || {};

  // 获取状态颜色
  const getStatusColor = () => {
    if (isOnline || status === 'online') return 'success';
    if (status === 'away') return 'warning';
    if (status === 'busy') return 'danger';
    return 'default';
  };

  // 获取状态文本
  const getStatusText = () => {
    if (isOnline || status === 'online') return '在线';
    if (status === 'away') return '离开';
    if (status === 'busy') return '忙碌';
    return '离线';
  };

  // 获取显示名称
  const getDisplayName = () => {
    return name || username || '未知用户';
  };

  const avatarElement = (
    <div className={`relative inline-block ${className}`}>
      <Avatar
        size={size}
        src={avatar}
        name={getDisplayName()}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
      />
      {showStatus && (
        <div 
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            getStatusColor() === 'success' ? 'bg-success' :
            getStatusColor() === 'warning' ? 'bg-warning' :
            getStatusColor() === 'danger' ? 'bg-danger' :
            'bg-default-300'
          }`}
        />
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip 
        content={
          <div className="text-center">
            <div className="font-medium">{getDisplayName()}</div>
            <div className="text-xs text-default-400">{getStatusText()}</div>
          </div>
        }
        placement="top"
      >
        {avatarElement}
      </Tooltip>
    );
  }

  return avatarElement;
}