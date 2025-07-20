import React from 'react';
import { Card, Avatar, Badge, StatusBadge } from './UI';
import clsx from 'clsx';

const CustomerCard = ({
  customer,
  isSelected = false,
  showDetails = true,
  onClick,
  onMessage,
  onCall,
  className,
  ...props
}) => {
  const formatLastSeenTime = (timestamp) => {
    if (!timestamp) return '从未';
    
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return lastSeen.toLocaleDateString('zh-CN');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '普通';
    }
  };

  return (
    <Card
      className={clsx(
        'transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50',
        'hover:shadow-md',
        className
      )}
      onClick={onClick}
      clickable
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* 头像和状态 */}
        <div className="relative">
          <Avatar
            src={customer.avatar}
            name={customer.name}
            size="medium"
            status={customer.status}
          />
          {customer.unreadCount > 0 && (
            <Badge
              content={customer.unreadCount}
              color="danger"
              size="small"
              position="top-right"
            />
          )}
        </div>

        {/* 客户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {customer.name || '未知客户'}
            </h3>
            <div className="flex items-center space-x-1">
              {/* 优先级标签 */}
              {customer.priority && customer.priority !== 'normal' && (
                <Badge
                  content={getPriorityText(customer.priority)}
                  color={getPriorityColor(customer.priority)}
                  size="small"
                  variant="flat"
                />
              )}
              {/* VIP标识 */}
              {customer.isVip && (
                <Badge
                  content="VIP"
                  color="warning"
                  size="small"
                  variant="solid"
                />
              )}
            </div>
          </div>

          {/* 最新消息 */}
          {customer.lastMessage && (
            <p className="text-sm text-gray-600 truncate mb-1">
              {customer.lastMessage.type === 'image' && '[图片]'}
              {customer.lastMessage.type === 'file' && '[文件]'}
              {customer.lastMessage.type === 'text' && customer.lastMessage.content}
            </p>
          )}

          {/* 客户详情（可选显示） */}
          {showDetails && (
            <div className="space-y-1">
              {customer.email && (
                <p className="text-xs text-gray-500 truncate">
                  📧 {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="text-xs text-gray-500">
                  📱 {customer.phone}
                </p>
              )}
              {customer.location && (
                <p className="text-xs text-gray-500 truncate">
                  📍 {customer.location}
                </p>
              )}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {customer.tags.slice(0, 3).map((tag, index) => (
                    <Badge
                      key={index}
                      content={tag}
                      size="small"
                      variant="light"
                      className="text-xs"
                    />
                  ))}
                  {customer.tags.length > 3 && (
                    <Badge
                      content={`+${customer.tags.length - 3}`}
                      size="small"
                      variant="light"
                      color="secondary"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 底部信息栏 */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <StatusBadge
                status={customer.status}
                showDot
                size="small"
                className="text-xs"
              />
              <span className="text-xs text-gray-400">
                {formatLastSeenTime(customer.lastSeenAt)}
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-1">
              {onMessage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage(customer);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                  title="发送消息"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </button>
              )}
              
              {onCall && customer.phone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(customer);
                  }}
                  className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                  title="拨打电话"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 客户列表组件
const CustomerList = ({
  customers = [],
  selectedCustomerId,
  onCustomerSelect,
  onCustomerMessage,
  onCustomerCall,
  loading = false,
  emptyText = '暂无客户',
  className,
  ...props
}) => {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 30a9.971 9.971 0 019.287 6.286" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-2">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-2', className)} {...props}>
      {customers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          isSelected={selectedCustomerId === customer.id}
          onClick={() => onCustomerSelect?.(customer)}
          onMessage={onCustomerMessage}
          onCall={onCustomerCall}
        />
      ))}
    </div>
  );
};

export { CustomerCard, CustomerList };
export default CustomerCard;