import React from 'react';
import { Card, CardBody, Avatar, Badge, Chip, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

/**
 * CustomerCard - 客户卡片组件
 * @param {Object} props
 * @param {string} props.id - 客户ID
 * @param {string} props.name - 客户名称
 * @param {string} props.avatar - 头像URL
 * @param {string} props.lastMessage - 最后一条消息
 * @param {Date} props.lastMessageTime - 最后消息时间
 * @param {number} props.unreadCount - 未读消息数
 * @param {string} props.status - 客户状态 (online, offline, busy)
 * @param {boolean} props.isActive - 是否是当前激活的对话
 * @param {Function} props.onClick - 点击事件处理
 */
const CustomerCard = ({
  id,
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  status = 'offline',
  isActive = false,
  onClick,
  tags = [],
  priority = 'normal'
}) => {
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // 如果是今天，显示时间
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    // 如果是本周
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[d.getDay()];
    }
    
    // 其他情况显示日期
    return d.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  const statusColors = {
    online: 'success',
    offline: 'default',
    busy: 'warning'
  };

  const priorityColors = {
    high: 'danger',
    normal: 'default',
    low: 'success'
  };

  const priorityIcons = {
    high: 'ph:warning-circle',
    normal: null,
    low: null
  };

  return (
    <Card
      isPressable
      isHoverable
      className={clsx(
        "w-full mb-2 cursor-pointer transition-all",
        isActive && "border-2 border-primary bg-primary-50 dark:bg-primary-900/20"
      )}
      onClick={() => onClick?.(id)}
    >
      <CardBody className="p-3">
        <div className="flex items-start gap-3">
          <Badge
            content=""
            color={statusColors[status]}
            shape="circle"
            placement="bottom-right"
            size="sm"
          >
            <Avatar
              src={avatar}
              name={name}
              size="md"
              className="flex-shrink-0"
            />
          </Badge>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold truncate">{name}</h4>
                {priority !== 'normal' && (
                  <Icon 
                    icon={priorityIcons[priority]} 
                    className={clsx(
                      "w-4 h-4",
                      priority === 'high' ? "text-danger" : "text-success"
                    )}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTime(lastMessageTime)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate pr-2">
                {lastMessage || '暂无消息'}
              </p>
              {unreadCount > 0 && (
                <Badge
                  content={unreadCount > 99 ? '99+' : unreadCount}
                  color="danger"
                  size="sm"
                  className="flex-shrink-0"
                />
              )}
            </div>
            
            {tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {tags.slice(0, 3).map((tag, index) => (
                  <Chip
                    key={index}
                    size="sm"
                    variant="flat"
                    className="text-xs"
                  >
                    {tag}
                  </Chip>
                ))}
                {tags.length > 3 && (
                  <Chip
                    size="sm"
                    variant="flat"
                    className="text-xs"
                  >
                    +{tags.length - 3}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default CustomerCard;