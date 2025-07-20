import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

const cardVariants = {
  // 阴影变体
  shadow: {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  },
  // 圆角变体
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  },
  // 边框变体
  border: {
    none: 'border-0',
    default: 'border border-gray-200',
    thick: 'border-2 border-gray-300'
  }
};

const Card = forwardRef(({
  children,
  className,
  shadow = 'md',
  radius = 'lg',
  border = 'default',
  padding = true,
  hoverable = false,
  clickable = false,
  onClick,
  ...props
}, ref) => {
  const baseClasses = clsx(
    'bg-white',
    {
      'transition-all duration-200': hoverable || clickable,
      'hover:shadow-lg': hoverable && shadow !== 'xl',
      'hover:shadow-xl': hoverable && shadow === 'xl',
      'cursor-pointer': clickable,
      'hover:-translate-y-1': hoverable,
      'p-6': padding === true,
      'p-4': padding === 'sm',
      'p-8': padding === 'lg',
      'p-0': padding === false
    }
  );

  const shadowClasses = cardVariants.shadow[shadow] || cardVariants.shadow.md;
  const radiusClasses = cardVariants.radius[radius] || cardVariants.radius.lg;
  const borderClasses = cardVariants.border[border] || cardVariants.border.default;

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        baseClasses,
        shadowClasses,
        radiusClasses,
        borderClasses,
        className
      )}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

// Card Header 组件
const CardHeader = ({ 
  children, 
  className,
  title,
  subtitle,
  extra,
  ...props 
}) => {
  return (
    <div 
      className={clsx(
        'flex items-center justify-between pb-4 border-b border-gray-200',
        className
      )}
      {...props}
    >
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {extra && (
        <div className="flex-shrink-0 ml-4">
          {extra}
        </div>
      )}
    </div>
  );
};

// Card Body 组件
const CardBody = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div 
      className={clsx('py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Footer 组件
const CardFooter = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div 
      className={clsx(
        'pt-4 border-t border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 统计卡片组件
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral', // 'up', 'down', 'neutral'
  className,
  ...props
}) => {
  const getTrendColor = () => {
    switch (trendType) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    if (trendType === 'up') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7m0 0H7" />
        </svg>
      );
    }
    if (trendType === 'down') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10m0 0h10" />
        </svg>
      );
    }
    return null;
  };

  return (
    <Card 
      className={clsx('relative overflow-hidden', className)}
      {...props}
    >
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="mt-1 flex items-center gap-2">
              {trend && (
                <span className={clsx('flex items-center gap-1 text-sm', getTrendColor())}>
                  {getTrendIcon()}
                  {trend}
                </span>
              )}
              {subtitle && (
                <span className="text-sm text-gray-500">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="flex-shrink-0">
            <div className="p-3 bg-blue-100 rounded-full">
              <div className="text-blue-600">
                {icon}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// 产品卡片组件
const ProductCard = ({
  image,
  title,
  description,
  price,
  originalPrice,
  discount,
  rating,
  reviewCount,
  badge,
  onAddToCart,
  onViewDetails,
  className,
  ...props
}) => {
  return (
    <Card 
      className={clsx('group overflow-hidden', className)}
      hoverable
      {...props}
    >
      {/* 图片区域 */}
      <div className="relative aspect-w-16 aspect-h-12 overflow-hidden rounded-t-lg">
        {image && (
          <img
            src={image}
            alt={title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        
        {badge && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded">
              {badge}
            </span>
          </div>
        )}
        
        {discount && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 text-xs font-medium text-white bg-green-500 rounded">
              -{discount}%
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {title}
        </h3>
        
        {description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {description}
          </p>
        )}

        {/* 评分 */}
        {rating && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={clsx(
                    'w-4 h-4',
                    i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'
                  )}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {reviewCount && (
              <span className="text-sm text-gray-500">({reviewCount})</span>
            )}
          </div>
        )}

        {/* 价格 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">
            ¥{price}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-gray-500 line-through">
              ¥{originalPrice}
            </span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onAddToCart}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            加入购物车
          </button>
          <button
            onClick={onViewDetails}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            查看详情
          </button>
        </div>
      </div>
    </Card>
  );
};

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';
StatCard.displayName = 'StatCard';
ProductCard.displayName = 'ProductCard';

export { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  StatCard, 
  ProductCard, 
  cardVariants 
};