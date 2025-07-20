import React from 'react';
import { Spinner, Card } from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 加载动画组件
 * 支持多种加载状态和样式
 */
export default function LoadingSpinner({ 
  type = 'spinner',
  size = 'md',
  text = '加载中...',
  showText = true,
  fullScreen = false,
  overlay = false,
  className = ""
}) {
  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className="w-4 h-4 bg-current rounded-full animate-pulse"></div>
        );
      
      case 'ring':
        return (
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1">
            <div className="w-1 h-4 bg-current animate-pulse"></div>
            <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      
      case 'custom':
        return (
          <div className="relative">
            <Icon icon="solar:refresh-linear" className="animate-spin text-2xl" />
          </div>
        );
      
      default:
        return <Spinner size={size} color="current" />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {renderSpinner()}
      {showText && text && (
        <div className="text-sm text-default-500 animate-pulse">
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="p-6">
          {content}
        </Card>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="p-6">
          {content}
        </Card>
      </div>
    );
  }

  return content;
}

// 导出常用的加载类型
export const LoadingType = {
  SPINNER: 'spinner',
  DOTS: 'dots',
  PULSE: 'pulse',
  RING: 'ring',
  BARS: 'bars',
  CUSTOM: 'custom'
};

// 导出常用的加载尺寸
export const LoadingSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg'
};