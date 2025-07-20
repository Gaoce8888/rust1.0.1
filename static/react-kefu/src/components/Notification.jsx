import React, { useState, useEffect } from 'react';
import { Card, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 通知组件
 * 支持不同类型的通知消息和自动消失
 */
export default function Notification({ 
  type = 'info',
  title,
  message,
  duration = 5000,
  showClose = true,
  onClose,
  className = "",
  position = 'top-right'
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'solar:check-circle-linear',
          color: 'text-success',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200'
        };
      case 'error':
        return {
          icon: 'solar:close-circle-linear',
          color: 'text-danger',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200'
        };
      case 'warning':
        return {
          icon: 'solar:warning-linear',
          color: 'text-warning',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200'
        };
      case 'info':
      default:
        return {
          icon: 'solar:info-circle-linear',
          color: 'text-primary',
          bgColor: 'bg-primary-50',
          borderColor: 'border-primary-200'
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const config = getTypeConfig();

  if (!isVisible) return null;

  return (
    <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
      <Card 
        className={`min-w-80 max-w-md border ${config.bgColor} ${config.borderColor} ${
          isExiting ? 'animate-slideOut' : 'animate-slideIn'
        }`}
        shadow="lg"
      >
        <div className="flex items-start gap-3 p-4">
          <Icon 
            icon={config.icon} 
            className={`text-xl ${config.color} flex-shrink-0 mt-0.5`} 
          />
          
          <div className="flex-1 min-w-0">
            {title && (
              <div className="font-medium text-foreground mb-1">
                {title}
              </div>
            )}
            {message && (
              <div className="text-sm text-default-600">
                {message}
              </div>
            )}
          </div>
          
          {showClose && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={handleClose}
              className="flex-shrink-0"
            >
              <Icon icon="solar:close-linear" className="text-default-400" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// 通知管理器组件
export function NotificationManager({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showSuccess = (message, title = '成功') => {
    return addNotification({ type: 'success', title, message });
  };

  const showError = (message, title = '错误') => {
    return addNotification({ type: 'error', title, message });
  };

  const showWarning = (message, title = '警告') => {
    return addNotification({ type: 'warning', title, message });
  };

  const showInfo = (message, title = '提示') => {
    return addNotification({ type: 'info', title, message });
  };

  return (
    <>
      {children}
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          {...notification}
          position={`top-right`}
          style={{ top: `${4 + index * 80}px` }}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
}

// 导出通知类型
export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// 导出位置常量
export const NotificationPosition = {
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_RIGHT: 'bottom-right'
};