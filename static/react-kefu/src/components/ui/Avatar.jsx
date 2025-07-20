import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const Avatar = ({
  src,
  alt,
  name,
  size = 'medium',
  shape = 'circle',
  status,
  statusPosition = 'bottom-right',
  border = false,
  className,
  fallbackClassName,
  onClick,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl'
  };
  
  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-lg',
    rounded: 'rounded-2xl'
  };
  
  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    small: 'w-2 h-2',
    medium: 'w-2.5 h-2.5',
    large: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4'
  };
  
  const statusPositions = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };
  
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500'
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  const containerClasses = twMerge(
    'relative inline-flex items-center justify-center bg-gray-200 text-gray-600 font-medium',
    sizes[size],
    shapes[shape],
    border && 'ring-2 ring-white',
    onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
    className
  );
  
  const imageClasses = twMerge(
    'w-full h-full object-cover',
    shapes[shape]
  );
  
  const statusClasses = clsx(
    'absolute rounded-full border-2 border-white',
    statusSizes[size],
    statusPositions[statusPosition],
    statusColors[status]
  );
  
  const fallbackClasses = twMerge(
    'flex items-center justify-center w-full h-full',
    shapes[shape],
    'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
    fallbackClassName
  );
  
  const renderContent = () => {
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={imageClasses}
          onError={() => setImageError(true)}
        />
      );
    }
    
    return (
      <div className={fallbackClasses}>
        {getInitials(name)}
      </div>
    );
  };
  
  return (
    <div 
      className={containerClasses} 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {renderContent()}
      
      {status && (
        <span 
          className={statusClasses}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

// Avatar Group Component
export const AvatarGroup = ({
  children,
  max = 3,
  size = 'medium',
  className,
  ...props
}) => {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;
  
  const overlapClasses = {
    xs: '-space-x-2',
    small: '-space-x-2',
    medium: '-space-x-3',
    large: '-space-x-4',
    xl: '-space-x-5',
    '2xl': '-space-x-6'
  };
  
  return (
    <div 
      className={twMerge(
        'flex items-center',
        overlapClasses[size],
        className
      )}
      {...props}
    >
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative" style={{ zIndex: visibleChildren.length - index }}>
          {React.cloneElement(child, { size, border: true })}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <Avatar
          size={size}
          name={`+${remainingCount}`}
          className="bg-gray-300 text-gray-700"
          border
        />
      )}
    </div>
  );
};

Avatar.Group = AvatarGroup;

export default Avatar;