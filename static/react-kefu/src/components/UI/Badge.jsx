import React from 'react';
import clsx from 'clsx';

const Badge = ({
  children,
  content,
  color = 'primary',
  variant = 'solid',
  size = 'medium',
  shape = 'rounded',
  position = 'top-right',
  showZero = false,
  max = 99,
  dot = false,
  invisible = false,
  className,
  ...props
}) => {
  const colors = {
    primary: {
      solid: 'bg-blue-600 text-white',
      flat: 'bg-blue-100 text-blue-800',
      bordered: 'border-2 border-blue-600 text-blue-600 bg-white',
      light: 'bg-blue-50 text-blue-600'
    },
    secondary: {
      solid: 'bg-gray-600 text-white',
      flat: 'bg-gray-100 text-gray-800',
      bordered: 'border-2 border-gray-600 text-gray-600 bg-white',
      light: 'bg-gray-50 text-gray-600'
    },
    success: {
      solid: 'bg-green-600 text-white',
      flat: 'bg-green-100 text-green-800',
      bordered: 'border-2 border-green-600 text-green-600 bg-white',
      light: 'bg-green-50 text-green-600'
    },
    warning: {
      solid: 'bg-yellow-600 text-white',
      flat: 'bg-yellow-100 text-yellow-800',
      bordered: 'border-2 border-yellow-600 text-yellow-600 bg-white',
      light: 'bg-yellow-50 text-yellow-600'
    },
    danger: {
      solid: 'bg-red-600 text-white',
      flat: 'bg-red-100 text-red-800',
      bordered: 'border-2 border-red-600 text-red-600 bg-white',
      light: 'bg-red-50 text-red-600'
    }
  };

  const sizes = {
    small: {
      text: 'text-xs px-1.5 py-0.5 min-w-[16px] h-4',
      dot: 'h-2 w-2'
    },
    medium: {
      text: 'text-sm px-2 py-1 min-w-[20px] h-5',
      dot: 'h-2.5 w-2.5'
    },
    large: {
      text: 'text-base px-2.5 py-1.5 min-w-[24px] h-6',
      dot: 'h-3 w-3'
    }
  };

  const shapes = {
    rounded: 'rounded-full',
    square: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg'
  };

  const positions = {
    'top-right': 'top-0 right-0 transform translate-x-1/2 -translate-y-1/2',
    'top-left': 'top-0 left-0 transform -translate-x-1/2 -translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 transform translate-x-1/2 translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2'
  };

  // 处理数字内容
  const getDisplayContent = () => {
    if (dot) return null;
    
    if (typeof content === 'number') {
      if (content === 0 && !showZero) return null;
      return content > max ? `${max}+` : content.toString();
    }
    
    return content;
  };

  const displayContent = getDisplayContent();
  const shouldShow = !invisible && (displayContent !== null || dot);

  if (!children) {
    // 独立使用的徽章
    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center font-medium',
          colors[color][variant],
          sizes[size].text,
          shapes[shape],
          className
        )}
        {...props}
      >
        {displayContent}
      </span>
    );
  }

  return (
    <div className={clsx('relative inline-block', className)}>
      {children}
      
      {shouldShow && (
        <span
          className={clsx(
            'absolute z-10 inline-flex items-center justify-center font-medium',
            dot ? sizes[size].dot : sizes[size].text,
            colors[color][variant],
            shapes[shape],
            positions[position],
            dot && 'rounded-full'
          )}
          {...props}
        >
          {!dot && displayContent}
        </span>
      )}
    </div>
  );
};

// 状态徽章组件
const StatusBadge = ({
  status = 'default',
  text,
  size = 'medium',
  showDot = true,
  className,
  ...props
}) => {
  const statusConfig = {
    online: { color: 'success', text: text || '在线' },
    offline: { color: 'secondary', text: text || '离线' },
    away: { color: 'warning', text: text || '离开' },
    busy: { color: 'danger', text: text || '忙碌' },
    default: { color: 'secondary', text: text || '默认' }
  };

  const config = statusConfig[status] || statusConfig.default;

  return (
    <Badge
      color={config.color}
      variant="flat"
      size={size}
      className={clsx('gap-1', className)}
      {...props}
    >
      {showDot && (
        <span
          className={clsx(
            'inline-block rounded-full',
            size === 'small' && 'h-2 w-2',
            size === 'medium' && 'h-2.5 w-2.5',
            size === 'large' && 'h-3 w-3',
            config.color === 'success' && 'bg-green-500',
            config.color === 'warning' && 'bg-yellow-500',
            config.color === 'danger' && 'bg-red-500',
            config.color === 'secondary' && 'bg-gray-500'
          )}
        />
      )}
      {config.text}
    </Badge>
  );
};

// 数字徽章组件
const NumberBadge = ({
  count = 0,
  max = 99,
  showZero = false,
  ...props
}) => {
  return (
    <Badge
      content={count}
      max={max}
      showZero={showZero}
      {...props}
    />
  );
};

export { Badge, StatusBadge, NumberBadge };
export default Badge;