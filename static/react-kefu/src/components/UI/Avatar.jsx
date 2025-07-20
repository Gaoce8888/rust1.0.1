import React, { useState } from 'react';
import { Avatar as HeroAvatar } from '@heroui/react';
import clsx from 'clsx';

const Avatar = ({
  src,
  alt,
  name,
  size = 'medium',
  shape = 'circle',
  showBorder = false,
  borderColor = 'border-gray-300',
  showFallback = true,
  fallbackIcon,
  status,
  statusPosition = 'bottom-right',
  className,
  onClick,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    small: { avatar: 'h-8 w-8', text: 'text-xs', status: 'h-2.5 w-2.5' },
    medium: { avatar: 'h-10 w-10', text: 'text-sm', status: 'h-3 w-3' },
    large: { avatar: 'h-12 w-12', text: 'text-base', status: 'h-3.5 w-3.5' },
    xl: { avatar: 'h-16 w-16', text: 'text-lg', status: 'h-4 w-4' }
  };

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-lg',
    rounded: 'rounded-md'
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  const statusPositions = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };

  // 获取姓名缩写
  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // 生成背景颜色
  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-500';
    
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
    ];
    
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // 渲染头像内容
  const renderAvatarContent = () => {
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={alt || name}
          className={clsx(
            'object-cover w-full h-full',
            shapes[shape]
          )}
          onError={handleImageError}
        />
      );
    }

    if (showFallback) {
      if (fallbackIcon) {
        return (
          <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-600">
            {fallbackIcon}
          </div>
        );
      }

      if (name) {
        return (
          <div className={clsx(
            'flex items-center justify-center w-full h-full text-white font-medium',
            sizes[size].text,
            getBackgroundColor(name)
          )}>
            {getInitials(name)}
          </div>
        );
      }
    }

    // 默认头像图标
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-400">
        <svg
          className={clsx('w-1/2 h-1/2')}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className={clsx('relative inline-block', className)}>
      <div
        className={clsx(
          'relative overflow-hidden',
          sizes[size].avatar,
          shapes[shape],
          showBorder && `border-2 ${borderColor}`,
          onClick && 'cursor-pointer hover:opacity-80 transition-opacity duration-200'
        )}
        onClick={onClick}
        {...props}
      >
        {renderAvatarContent()}
      </div>

      {/* 状态指示器 */}
      {status && (
        <div
          className={clsx(
            'absolute border-2 border-white rounded-full',
            sizes[size].status,
            statusColors[status],
            statusPositions[statusPosition]
          )}
        />
      )}
    </div>
  );
};

// 头像组
const AvatarGroup = ({
  children,
  max = 4,
  spacing = 'normal',
  size = 'medium',
  className,
  renderMore,
  ...props
}) => {
  const spacings = {
    tight: '-space-x-2',
    normal: '-space-x-1',
    loose: 'space-x-1'
  };

  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const hiddenCount = childrenArray.length - max;

  return (
    <div className={clsx('flex items-center', spacings[spacing], className)} {...props}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative z-10" style={{ zIndex: visibleChildren.length - index }}>
          {React.cloneElement(child, { size })}
        </div>
      ))}
      
      {hiddenCount > 0 && (
        <div className="relative z-0">
          {renderMore ? (
            renderMore(hiddenCount)
          ) : (
            <Avatar
              size={size}
              name={`+${hiddenCount}`}
              className="bg-gray-200 text-gray-600 border-2 border-white"
            />
          )}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };
export default Avatar;