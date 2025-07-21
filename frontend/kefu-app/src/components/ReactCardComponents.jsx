import React, { useState } from 'react';
import { Card, CardBody, Button, Avatar, Chip, Image, Progress } from '@nextui-org/react';

// 产品卡片组件
export const ProductCard = ({ 
  title, 
  price, 
  image, 
  description, 
  rating = 0, 
  onClick,
  className = "",
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Card
      className={`product-card ${className}`}
      isPressable
      onPress={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <CardBody className="p-0">
        <Image
          src={image}
          alt={title}
          className="w-full h-48 object-cover"
          loading="lazy"
        />
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2">
              {title}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-warning">⭐</span>
              <span className="text-sm text-default-500">{rating}</span>
            </div>
          </div>
          
          {description && (
            <p className="text-sm text-default-600 mb-3 line-clamp-2">
              {description}
            </p>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-primary">
              ¥{price.toFixed(2)}
            </span>
            <Button
              size="sm"
              color="primary"
              variant={isHovered ? "solid" : "bordered"}
            >
              查看详情
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// 用户资料卡片组件
export const UserProfileCard = ({ 
  avatar, 
  name, 
  email, 
  role, 
  status = "online",
  onEdit,
  className = "",
  ...props 
}) => {
  const statusColors = {
    online: "success",
    offline: "default",
    busy: "warning",
    away: "secondary"
  };
  
  return (
    <Card className={`user-profile-card ${className}`} {...props}>
      <CardBody className="p-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={avatar}
            name={name}
            size="lg"
            className="flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {name}
              </h3>
              <Chip
                size="sm"
                color={statusColors[status]}
                variant="dot"
              >
                {status}
              </Chip>
            </div>
            
            <p className="text-sm text-default-600 mb-1 truncate">
              {email}
            </p>
            
            {role && (
              <p className="text-xs text-default-500 mb-3">
                {role}
              </p>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                startContent={<span>💬</span>}
              >
                发送消息
              </Button>
              
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  startContent={<span>✏️</span>}
                  onPress={onEdit}
                >
                  编辑
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// 通知卡片组件
export const NotificationCard = ({ 
  title, 
  message, 
  type = "info",
  timestamp,
  onDismiss,
  onAction,
  className = "",
  ...props 
}) => {
  const typeConfig = {
    info: { color: "primary", icon: "ℹ️" },
    success: { color: "success", icon: "✅" },
    warning: { color: "warning", icon: "⚠️" },
    error: { color: "danger", icon: "❌" }
  };
  
  const config = typeConfig[type];
  
  return (
    <Card className={`notification-card ${className}`} {...props}>
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <span className={`text-${config.color} text-lg flex-shrink-0 mt-0.5`}>
            {config.icon}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-semibold text-foreground">
                {title}
              </h4>
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={onDismiss}
                >
                  <span>✕</span>
                </Button>
              )}
            </div>
            
            <p className="text-sm text-default-600 mb-2">
              {message}
            </p>
            
            <div className="flex justify-between items-center">
              {timestamp && (
                <span className="text-xs text-default-500">
                  {new Date(timestamp).toLocaleString()}
                </span>
              )}
              
              {onAction && (
                <Button
                  size="sm"
                  color={config.color}
                  variant="light"
                  onPress={onAction}
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

// 数据卡片组件
export const DataCard = ({ 
  title, 
  value, 
  change,
  trend = "stable",
  icon,
  color = "primary",
  className = "",
  ...props 
}) => {
  const trendConfig = {
    up: { color: "success", icon: "📈" },
    down: { color: "danger", icon: "📉" },
    stable: { color: "default", icon: "➡️" }
  };
  
  const config = trendConfig[trend];
  
  return (
    <Card className={`data-card ${className}`} {...props}>
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={`p-2 rounded-lg bg-${color}-100`}>
                <span className={`text-${color} text-lg`}>{icon}</span>
              </div>
            )}
            <h3 className="text-sm font-medium text-default-600">
              {title}
            </h3>
          </div>
          
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-${config.color}`}>
              <span>{config.icon}</span>
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-foreground">
          {value}
        </div>
      </CardBody>
    </Card>
  );
};

// 语音消息卡片组件
export const VoiceMessageCard = ({ 
  title,
  duration,
  isPlaying = false,
  onPlay,
  onPause,
  className = "",
  ...props 
}) => {
  const [progress, setProgress] = useState(0);
  
  return (
    <Card className={`voice-message-card ${className}`} {...props}>
      <CardBody className="p-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={isPlaying ? onPause : onPlay}
          >
            <span>{isPlaying ? "⏸️" : "▶️"}</span>
          </Button>
          
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground mb-1">
              {title}
            </h4>
            
            <div className="flex items-center gap-2">
              <Progress 
                size="sm" 
                value={progress} 
                className="flex-1"
                color="primary"
              />
              <span className="text-xs text-default-500">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// 动作卡片组件
export const ActionCard = ({ 
  title,
  description,
  actions = [],
  className = "",
  ...props 
}) => {
  return (
    <Card className={`action-card ${className}`} {...props}>
      <CardBody className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-default-600">
              {description}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              color={action.color || "primary"}
              variant={action.variant || "solid"}
              onPress={action.onPress}
              startContent={action.icon && <span>{action.icon}</span>}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

// 媒体卡片组件
export const MediaCard = ({ 
  title,
  mediaUrl,
  mediaType = "image", // image, video, audio
  description,
  onPlay,
  className = "",
  ...props 
}) => {
  return (
    <Card className={`media-card ${className}`} {...props}>
      <CardBody className="p-0">
        {mediaType === "image" && (
          <Image
            src={mediaUrl}
            alt={title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        )}
        
        {mediaType === "video" && (
          <div className="relative w-full h-48 bg-gray-100">
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              controls
            />
          </div>
        )}
        
        {mediaType === "audio" && (
          <div className="p-4 bg-gray-50">
            <audio
              src={mediaUrl}
              controls
              className="w-full"
            />
          </div>
        )}
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-default-600">
              {description}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

// 表单卡片组件
export const FormCard = ({ 
  title,
  fields = [],
  onSubmit,
  submitLabel = "提交",
  className = "",
  ...props 
}) => {
  const [formData, setFormData] = useState({});
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };
  
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  return (
    <Card className={`form-card ${className}`} {...props}>
      <CardBody className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {title}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {field.label}
              </label>
              
              {field.type === "text" && (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === "textarea" && (
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === "select" && (
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            </div>
          ))}
          
          <Button
            type="submit"
            color="primary"
            className="w-full"
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
};