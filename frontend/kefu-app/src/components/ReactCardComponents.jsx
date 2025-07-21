import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardBody, Button, Avatar, Chip, Image, Progress, Spinner } from '@nextui-org/react';

// 增强的卡片大小配置
export const CARD_SIZE_CONFIG = {
  tiny: {
    width: '200px',
    height: 'auto',
    maxWidth: '100%',
    fontSize: '0.75rem',
    padding: '0.5rem',
    imageHeight: '80px',
    avatarSize: 'sm',
    buttonSize: 'sm',
    borderRadius: '6px',
    spacing: '0.5rem'
  },
  small: {
    width: '280px',
    height: 'auto',
    maxWidth: '100%',
    fontSize: '0.875rem',
    padding: '0.75rem',
    imageHeight: '120px',
    avatarSize: 'md',
    buttonSize: 'sm',
    borderRadius: '8px',
    spacing: '0.75rem'
  },
  medium: {
    width: '320px',
    height: 'auto',
    maxWidth: '100%',
    fontSize: '1rem',
    padding: '1rem',
    imageHeight: '160px',
    avatarSize: 'lg',
    buttonSize: 'sm',
    borderRadius: '12px',
    spacing: '1rem'
  },
  large: {
    width: '400px',
    height: 'auto',
    maxWidth: '100%',
    fontSize: '1.125rem',
    padding: '1.25rem',
    imageHeight: '200px',
    avatarSize: 'lg',
    buttonSize: 'md',
    borderRadius: '16px',
    spacing: '1.25rem'
  },
  auto: {
    width: '100%',
    height: 'auto',
    maxWidth: '100%',
    fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
    padding: 'clamp(0.75rem, 2vw, 1.25rem)',
    imageHeight: 'clamp(120px, 25vw, 200px)',
    avatarSize: 'lg',
    buttonSize: 'sm',
    borderRadius: 'clamp(8px, 1.5vw, 16px)',
    spacing: 'clamp(0.75rem, 2vw, 1.25rem)'
  }
};

// 响应式断点配置
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 'max-width: 480px',
  tablet: 'max-width: 768px',
  desktop: 'min-width: 769px',
  wide: 'min-width: 1024px'
};

// 卡片主题配置
export const CARD_THEME_CONFIG = {
  light: {
    background: 'bg-white',
    border: 'border-gray-200',
    shadow: 'shadow-sm',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400'
  },
  dark: {
    background: 'bg-gray-800',
    border: 'border-gray-700',
    shadow: 'shadow-lg',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-500'
  },
  auto: {
    background: 'bg-content1',
    border: 'border-divider',
    shadow: 'shadow-sm',
    textPrimary: 'text-foreground',
    textSecondary: 'text-default-600',
    textMuted: 'text-default-400'
  }
};

// 增强的自适应大小Hook
export const useAdaptiveSize = (containerRef, defaultSize = 'auto', options = {}) => {
  const [currentSize, setCurrentSize] = useState(defaultSize);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const {
    enableSmoothTransition = true,
    debounceMs = 100,
    minWidth = 200,
    maxWidth = 800
  } = options;

  useEffect(() => {
    let timeoutId;
    
    const updateSize = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(minWidth, Math.min(maxWidth, rect.width));
      const height = rect.height;
      
      setContainerWidth(width);
      setContainerHeight(height);
      
      // 根据容器宽度自动调整大小
      if (width < 240) {
        setCurrentSize('tiny');
      } else if (width < 320) {
        setCurrentSize('small');
      } else if (width < 480) {
        setCurrentSize('medium');
      } else if (width < 768) {
        setCurrentSize('large');
      } else {
        setCurrentSize('auto');
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, debounceMs);
    };

    updateSize();
    
    const resizeObserver = new ResizeObserver(debouncedUpdate);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [containerRef, minWidth, maxWidth, debounceMs]);

  return { 
    currentSize, 
    containerWidth, 
    containerHeight, 
    isLoading,
    setLoading: setIsLoading
  };
};

// 卡片容器组件 - 用于在对话框内自适应显示
export const CardContainer = ({ 
  children, 
  size = 'auto', 
  theme = 'auto',
  className = "",
  style = {},
  onSizeChange,
  ...props 
}) => {
  const containerRef = useRef(null);
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];

  useEffect(() => {
    onSizeChange?.(finalSize, adaptiveSize.containerWidth);
  }, [finalSize, adaptiveSize.containerWidth, onSizeChange]);

  return (
    <div
      ref={containerRef}
      className={`card-container ${themeConfig.background} ${themeConfig.border} ${themeConfig.shadow} ${className}`}
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        borderRadius: config.borderRadius,
        transition: 'all 0.3s ease-in-out',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// 增强的产品卡片组件
export const ProductCard = ({ 
  title, 
  price, 
  image, 
  description, 
  rating = 0, 
  onClick,
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showRating = true,
  showDescription = true,
  showButton = true,
  showPrice = true,
  showImage = true,
  customStyles = {},
  loading = false,
  error = null,
  onImageError,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];
  
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    onImageError?.();
  };

  const cardContent = useMemo(() => (
    <Card
      className={`product-card ${className}`}
      isPressable={!loading && !error}
      onPress={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody className="p-0">
        {showImage && image && (
          <div className="relative w-full bg-gray-100">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
            {!imageError ? (
              <Image
                src={image}
                alt={title}
                className="w-full object-cover"
                style={{ height: config.imageHeight }}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <div 
                className="w-full flex items-center justify-center bg-gray-200"
                style={{ height: config.imageHeight }}
              >
                <span className="text-gray-400">图片加载失败</span>
              </div>
            )}
          </div>
        )}
        
        <div style={{ padding: config.padding }}>
          <div className="flex justify-between items-start mb-2">
            <h3 
              className={`font-semibold line-clamp-2 ${themeConfig.textPrimary}`}
              style={{ fontSize: `calc(${config.fontSize} * 1.2)` }}
            >
              {title}
            </h3>
            {showRating && (
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <span className="text-warning">⭐</span>
                <span className={`${themeConfig.textSecondary}`} style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}>
                  {rating}
                </span>
              </div>
            )}
          </div>
          
          {showDescription && description && (
            <p 
              className={`mb-3 line-clamp-2 ${themeConfig.textSecondary}`}
              style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
            >
              {description}
            </p>
          )}
          
          <div className="flex justify-between items-center">
            {showPrice && (
              <span 
                className="font-bold text-primary"
                style={{ fontSize: `calc(${config.fontSize} * 1.4)` }}
              >
                ¥{price.toFixed(2)}
              </span>
            )}
            {showButton && (
              <Button
                size={config.buttonSize}
                color="primary"
                variant={isHovered ? "solid" : "bordered"}
                style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
              >
                查看详情
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  ), [title, price, image, description, rating, loading, error, finalSize, config, themeConfig, isHovered, imageLoading, imageError, className, customStyles, showRating, showDescription, showButton, showPrice, showImage, onClick, onImageError, props]);

  if (loading) {
    return (
      <CardContainer size={size} theme={theme} containerRef={containerRef}>
        <div className="flex items-center justify-center" style={{ height: config.imageHeight }}>
          <Spinner size="lg" />
        </div>
      </CardContainer>
    );
  }

  if (error) {
    return (
      <CardContainer size={size} theme={theme} containerRef={containerRef}>
        <div className="flex items-center justify-center p-4" style={{ height: config.imageHeight }}>
          <div className="text-center">
            <span className="text-danger text-2xl">⚠️</span>
            <p className="text-small text-default-500 mt-2">{error}</p>
          </div>
        </div>
      </CardContainer>
    );
  }

  return cardContent;
};

// 增强的用户资料卡片组件
export const UserProfileCard = ({ 
  avatar, 
  name, 
  email, 
  role, 
  status = "online",
  onEdit,
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showStatus = true,
  showRole = true,
  showActions = true,
  showEmail = true,
  customStyles = {},
  ...props 
}) => {
  const statusColors = {
    online: "success",
    offline: "default",
    busy: "warning",
    away: "secondary"
  };
  
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];
  
  return (
    <Card 
      className={`user-profile-card ${className}`} 
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: config.padding }}>
        <div className="flex items-center gap-3">
          <Avatar
            src={avatar}
            name={name}
            size={config.avatarSize}
            className="flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className={`font-semibold truncate ${themeConfig.textPrimary}`}
                style={{ fontSize: `calc(${config.fontSize} * 1.1)` }}
              >
                {name}
              </h3>
              {showStatus && (
                <Chip
                  size="sm"
                  color={statusColors[status]}
                  variant="dot"
                  style={{ fontSize: `calc(${config.fontSize} * 0.8)` }}
                >
                  {status}
                </Chip>
              )}
            </div>
            
            {showEmail && (
              <p 
                className={`mb-1 truncate ${themeConfig.textSecondary}`}
                style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
              >
                {email}
              </p>
            )}
            
            {showRole && role && (
              <p 
                className={`mb-3 ${themeConfig.textMuted}`}
                style={{ fontSize: `calc(${config.fontSize} * 0.8)` }}
              >
                {role}
              </p>
            )}
            
            {showActions && (
              <div className="flex gap-2">
                <Button
                  size={config.buttonSize}
                  variant="bordered"
                  startContent={<span>💬</span>}
                  style={{ fontSize: `calc(${config.fontSize} * 0.85)` }}
                >
                  发送消息
                </Button>
                
                {onEdit && (
                  <Button
                    size={config.buttonSize}
                    variant="ghost"
                    startContent={<span>✏️</span>}
                    onPress={onEdit}
                    style={{ fontSize: `calc(${config.fontSize} * 0.85)` }}
                  >
                    编辑
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// 增强的通知卡片组件
export const NotificationCard = ({ 
  title, 
  message, 
  type = "info",
  timestamp,
  onDismiss,
  onAction,
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showTimestamp = true,
  showAction = true,
  autoDismiss = false,
  dismissDelay = 5000,
  customStyles = {},
  ...props 
}) => {
  const typeConfig = {
    info: { color: "primary", icon: "ℹ️" },
    success: { color: "success", icon: "✅" },
    warning: { color: "warning", icon: "⚠️" },
    error: { color: "danger", icon: "❌" }
  };
  
  const config = typeConfig[type];
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const sizeConfig = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];

  // 自动消失功能
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, dismissDelay);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissDelay, onDismiss]);
  
  return (
    <Card 
      className={`notification-card ${className}`} 
      style={{
        width: sizeConfig.width,
        maxWidth: sizeConfig.maxWidth,
        fontSize: sizeConfig.fontSize,
        borderRadius: sizeConfig.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: sizeConfig.padding }}>
        <div className="flex items-start gap-3">
          <span 
            className={`text-${config.color} flex-shrink-0 mt-0.5`}
            style={{ fontSize: `calc(${sizeConfig.fontSize} * 1.2)` }}
          >
            {config.icon}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 
                className={`font-semibold ${themeConfig.textPrimary}`}
                style={{ fontSize: `calc(${sizeConfig.fontSize} * 1.1)` }}
              >
                {title}
              </h4>
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={onDismiss}
                  style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.9)` }}
                >
                  <span>✕</span>
                </Button>
              )}
            </div>
            
            <p 
              className={`mb-2 ${themeConfig.textSecondary}`}
              style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.9)` }}
            >
              {message}
            </p>
            
            <div className="flex justify-between items-center">
              {showTimestamp && timestamp && (
                <span 
                  className={themeConfig.textMuted}
                  style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.8)` }}
                >
                  {new Date(timestamp).toLocaleString()}
                </span>
              )}
              
              {showAction && onAction && (
                <Button
                  size={sizeConfig.buttonSize}
                  color={config.color}
                  variant="light"
                  onPress={onAction}
                  style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.85)` }}
                >
                  查看详情
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// 增强的数据卡片组件
export const DataCard = ({ 
  title, 
  value, 
  change,
  trend = "stable",
  icon,
  color = "primary",
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showChange = true,
  showIcon = true,
  numberFormat = 'comma',
  decimalPlaces = 2,
  customStyles = {},
  ...props 
}) => {
  const trendConfig = {
    up: { color: "success", icon: "📈" },
    down: { color: "danger", icon: "📉" },
    stable: { color: "default", icon: "➡️" }
  };
  
  const config = trendConfig[trend];
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const sizeConfig = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];

  // 数字格式化
  const formatNumber = (num) => {
    if (typeof num !== 'number') return num;
    
    const formatted = num.toFixed(decimalPlaces);
    if (numberFormat === 'comma') {
      return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (numberFormat === 'space') {
      return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return formatted;
  };
  
  return (
    <Card 
      className={`data-card ${className}`} 
      style={{
        width: sizeConfig.width,
        maxWidth: sizeConfig.maxWidth,
        fontSize: sizeConfig.fontSize,
        borderRadius: sizeConfig.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: sizeConfig.padding }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {showIcon && icon && (
              <div className={`p-2 rounded-lg bg-${color}-100`}>
                <span className={`text-${color} text-lg`}>{icon}</span>
              </div>
            )}
            <h3 
              className={`font-medium ${themeConfig.textSecondary}`}
              style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.9)` }}
            >
              {title}
            </h3>
          </div>
          
          {showChange && change !== undefined && (
            <div className={`flex items-center gap-1 text-${config.color}`}>
              <span>{config.icon}</span>
              <span 
                className="font-medium"
                style={{ fontSize: `calc(${sizeConfig.fontSize} * 0.9)` }}
              >
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        
        <div 
          className={`font-bold ${themeConfig.textPrimary}`}
          style={{ fontSize: `calc(${sizeConfig.fontSize} * 1.8)` }}
        >
          {formatNumber(value)}
        </div>
      </CardBody>
    </Card>
  );
};

// 增强的语音消息卡片组件
export const VoiceMessageCard = ({ 
  title,
  duration,
  isPlaying = false,
  onPlay,
  onPause,
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showTitle = true,
  showProgress = true,
  autoPlay = false,
  loop = false,
  volume = 1.0,
  customStyles = {},
  ...props 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];

  // 音频播放控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = loop;
    }
  }, [volume, loop]);

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
      audioRef.current?.pause();
    } else {
      onPlay?.();
      audioRef.current?.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };
  
  return (
    <Card 
      className={`voice-message-card ${className}`} 
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: config.padding }}>
        <div className="flex items-center gap-3">
          <Button
            size={config.buttonSize}
            variant="light"
            isIconOnly
            onPress={handlePlayPause}
            style={{ fontSize: `calc(${config.fontSize} * 1.2)` }}
          >
            <span>{isPlaying ? "⏸️" : "▶️"}</span>
          </Button>
          
          <div className="flex-1">
            {showTitle && (
              <h4 
                className={`font-semibold mb-1 ${themeConfig.textPrimary}`}
                style={{ fontSize: `calc(${config.fontSize} * 1.1)` }}
              >
                {title}
              </h4>
            )}
            
            {showProgress && (
              <div className="flex items-center gap-2">
                <Progress 
                  size="sm" 
                  value={progress} 
                  className="flex-1"
                  color="primary"
                />
                <span 
                  className={themeConfig.textMuted}
                  style={{ fontSize: `calc(${config.fontSize} * 0.8)` }}
                >
                  {formatDuration(currentTime || duration)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setProgress(0);
            setCurrentTime(0);
            onPause?.();
          }}
          style={{ display: 'none' }}
        />
      </CardBody>
    </Card>
  );
};

// 增强的动作卡片组件
export const ActionCard = ({ 
  title,
  description,
  actions = [],
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showDescription = true,
  buttonLayout = 'horizontal',
  maxButtons = 4,
  buttonSpacing = 8,
  customStyles = {},
  ...props 
}) => {
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];
  
  const visibleActions = actions.slice(0, maxButtons);
  
  return (
    <Card 
      className={`action-card ${className}`} 
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: config.padding }}>
        <div className="mb-3">
          <h3 
            className={`font-semibold mb-1 ${themeConfig.textPrimary}`}
            style={{ fontSize: `calc(${config.fontSize} * 1.2)` }}
          >
            {title}
          </h3>
          {showDescription && description && (
            <p 
              className={themeConfig.textSecondary}
              style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
            >
              {description}
            </p>
          )}
        </div>
        
        <div 
          className={`flex gap-2 ${buttonLayout === 'vertical' ? 'flex-col' : 'flex-wrap'}`}
          style={{ gap: `${buttonSpacing}px` }}
        >
          {visibleActions.map((action, index) => (
            <Button
              key={index}
              size={config.buttonSize}
              color={action.color || "primary"}
              variant={action.variant || "solid"}
              onPress={action.onPress}
              startContent={action.icon && <span>{action.icon}</span>}
              style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

// 增强的媒体卡片组件
export const MediaCard = ({ 
  title,
  mediaUrl,
  mediaType = "image", // image, video, audio
  description,
  onPlay,
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showDescription = true,
  lazyLoad = true,
  preload = 'metadata',
  controls = true,
  customStyles = {},
  ...props 
}) => {
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];
  
  return (
    <Card 
      className={`media-card ${className}`} 
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody className="p-0">
        {mediaType === "image" && (
          <Image
            src={mediaUrl}
            alt={title}
            className="w-full object-cover"
            style={{ height: config.imageHeight }}
            loading={lazyLoad ? "lazy" : "eager"}
          />
        )}
        
        {mediaType === "video" && (
          <div className="relative w-full bg-gray-100">
            <video
              src={mediaUrl}
              className="w-full object-cover"
              style={{ height: config.imageHeight }}
              controls={controls}
              preload={preload}
            />
          </div>
        )}
        
        {mediaType === "audio" && (
          <div className="p-4 bg-gray-50">
            <audio
              src={mediaUrl}
              controls={controls}
              preload={preload}
              className="w-full"
            />
          </div>
        )}
        
        <div style={{ padding: config.padding }}>
          <h3 
            className={`font-semibold mb-2 ${themeConfig.textPrimary}`}
            style={{ fontSize: `calc(${config.fontSize} * 1.2)` }}
          >
            {title}
          </h3>
          
          {showDescription && description && (
            <p 
              className={themeConfig.textSecondary}
              style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
            >
              {description}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

// 增强的表单卡片组件
export const FormCard = ({ 
  title,
  fields = [],
  onSubmit,
  submitLabel = "提交",
  className = "",
  size = 'auto',
  containerRef,
  theme = 'auto',
  showLabels = true,
  showValidation = true,
  autoFocus = false,
  submitOnEnter = true,
  customStyles = {},
  ...props 
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  const adaptiveSize = useAdaptiveSize(containerRef, size);
  const finalSize = size === 'auto' ? adaptiveSize.currentSize : size;
  const config = CARD_SIZE_CONFIG[finalSize];
  const themeConfig = CARD_THEME_CONFIG[theme];
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 简单验证
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label}是必填项`;
      }
    });
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit?.(formData);
    } else {
      setErrors(newErrors);
    }
  };
  
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // 清除错误
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: undefined
      }));
    }
  };
  
  return (
    <Card 
      className={`form-card ${className}`} 
      style={{
        width: config.width,
        maxWidth: config.maxWidth,
        fontSize: config.fontSize,
        borderRadius: config.borderRadius,
        ...customStyles
      }}
      {...props}
    >
      <CardBody style={{ padding: config.padding }}>
        <h3 
          className={`font-semibold mb-4 ${themeConfig.textPrimary}`}
          style={{ fontSize: `calc(${config.fontSize} * 1.3)` }}
        >
          {title}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="space-y-2">
              {showLabels && (
                <label 
                  className={`font-medium ${themeConfig.textPrimary}`}
                  style={{ fontSize: `calc(${config.fontSize} * 0.9)` }}
                >
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
              )}
              
              {field.type === "text" && (
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${themeConfig.border} ${themeConfig.background}`}
                  style={{ fontSize: config.fontSize }}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  autoFocus={autoFocus && index === 0}
                />
              )}
              
              {field.type === "textarea" && (
                <textarea
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${themeConfig.border} ${themeConfig.background}`}
                  style={{ fontSize: config.fontSize }}
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === "select" && (
                <select
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${themeConfig.border} ${themeConfig.background}`}
                  style={{ fontSize: config.fontSize }}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                >
                  <option value="">{field.placeholder}</option>
                  {field.options?.map((option, optIndex) => (
                    <option key={optIndex} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {showValidation && errors[field.name] && (
                <p className="text-danger text-small">{errors[field.name]}</p>
              )}
            </div>
          ))}
          
          <Button
            type="submit"
            color="primary"
            size={config.buttonSize}
            className="w-full"
            style={{ fontSize: `calc(${config.fontSize} * 1.1)` }}
          >
            {submitLabel}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};

// 工具函数
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 增强的卡片配置管理器
export class CardConfigManager {
  constructor() {
    this.configs = new Map();
    this.defaultConfig = CARD_SIZE_CONFIG.auto;
    this.themeConfig = CARD_THEME_CONFIG.auto;
    this.globalSettings = {
      enableAnimations: true,
      enableShadows: true,
      enableResponsive: true,
      defaultSize: 'auto',
      defaultTheme: 'auto'
    };
  }

  // 设置卡片配置
  setCardConfig(cardType, config) {
    this.configs.set(cardType, { ...this.defaultConfig, ...config });
  }

  // 获取卡片配置
  getCardConfig(cardType, size = 'auto') {
    const cardConfig = this.configs.get(cardType) || this.defaultConfig;
    const sizeConfig = CARD_SIZE_CONFIG[size] || this.defaultConfig;
    return { ...cardConfig, ...sizeConfig };
  }

  // 设置默认配置
  setDefaultConfig(config) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  // 设置主题配置
  setThemeConfig(theme) {
    this.themeConfig = CARD_THEME_CONFIG[theme] || CARD_THEME_CONFIG.auto;
  }

  // 获取响应式配置
  getResponsiveConfig(containerWidth) {
    if (containerWidth < 240) return CARD_SIZE_CONFIG.tiny;
    if (containerWidth < 320) return CARD_SIZE_CONFIG.small;
    if (containerWidth < 480) return CARD_SIZE_CONFIG.medium;
    if (containerWidth < 768) return CARD_SIZE_CONFIG.large;
    return CARD_SIZE_CONFIG.auto;
  }

  // 设置全局设置
  setGlobalSettings(settings) {
    this.globalSettings = { ...this.globalSettings, ...settings };
  }

  // 获取全局设置
  getGlobalSettings() {
    return this.globalSettings;
  }

  // 导出配置
  exportConfig() {
    return {
      configs: Object.fromEntries(this.configs),
      defaultConfig: this.defaultConfig,
      themeConfig: this.themeConfig,
      globalSettings: this.globalSettings,
      timestamp: new Date().toISOString()
    };
  }

  // 导入配置
  importConfig(config) {
    if (config.configs) {
      this.configs = new Map(Object.entries(config.configs));
    }
    if (config.defaultConfig) {
      this.defaultConfig = config.defaultConfig;
    }
    if (config.themeConfig) {
      this.themeConfig = config.themeConfig;
    }
    if (config.globalSettings) {
      this.globalSettings = config.globalSettings;
    }
  }
}

// 导出所有组件
export default {
  ProductCard,
  UserProfileCard,
  NotificationCard,
  DataCard,
  VoiceMessageCard,
  ActionCard,
  MediaCard,
  FormCard,
  CardContainer,
  CardConfigManager,
  CARD_SIZE_CONFIG,
  CARD_THEME_CONFIG,
  RESPONSIVE_BREAKPOINTS,
  useAdaptiveSize
};