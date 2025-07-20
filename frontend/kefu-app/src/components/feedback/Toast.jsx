import React, { useState, useEffect, createContext, useContext } from 'react';
import { clsx } from 'clsx';

// Toast Context
const ToastContext = createContext();

// Toast类型配置
const toastTypes = {
  success: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-green-50 text-green-800 border-green-200',
    iconClassName: 'text-green-400'
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-red-50 text-red-800 border-red-200',
    iconClassName: 'text-red-400'
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    iconClassName: 'text-yellow-400'
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    iconClassName: 'text-blue-400'
  }
};

// 单个Toast组件
const Toast = ({ 
  id,
  type = 'info',
  title,
  message,
  duration = 4000,
  closable = true,
  onClose,
  action,
  className,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const typeConfig = toastTypes[type] || toastTypes.info;

  useEffect(() => {
    // 进入动画
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300); // 与动画时间匹配
  };

  return (
    <div
      className={clsx(
        'relative flex items-start p-4 mb-3 border rounded-lg shadow-lg transition-all duration-300 ease-in-out transform',
        typeConfig.className,
        {
          'opacity-0 translate-x-full': !isVisible,
          'opacity-100 translate-x-0': isVisible && !isLeaving,
          'opacity-0 translate-x-full': isLeaving
        },
        className
      )}
      {...props}
    >
      {/* 图标 */}
      <div className={clsx('flex-shrink-0 mt-0.5', typeConfig.iconClassName)}>
        {typeConfig.icon}
      </div>

      {/* 内容 */}
      <div className="ml-3 flex-1">
        {title && (
          <h4 className="text-sm font-medium mb-1">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-sm">
            {message}
          </p>
        )}
        
        {/* 操作按钮 */}
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>

      {/* 关闭按钮 */}
      {closable && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 进度条 */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-lg animate-progress" 
             style={{ 
               animationDuration: `${duration}ms`,
               animationTimingFunction: 'linear'
             }} 
        />
      )}
    </div>
  );
};

// Toast容器组件
const ToastContainer = ({ 
  position = 'top-right',
  maxCount = 5,
  className,
  ...props 
}) => {
  const { toasts } = useContext(ToastContext);

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

  const visibleToasts = toasts.slice(-maxCount);

  return (
    <div
      className={clsx(
        'fixed z-50 pointer-events-none',
        getPositionClasses(),
        className
      )}
      {...props}
    >
      <div className="space-y-2 pointer-events-auto max-w-sm w-full">
        {visibleToasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  );
};

// Toast Provider组件
const ToastProvider = ({ children, ...props }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const updateToast = (id, updates) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  };

  // 便捷方法
  const success = (message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  };

  const error = (message, options = {}) => {
    return addToast({ type: 'error', message, duration: 6000, ...options });
  };

  const warning = (message, options = {}) => {
    return addToast({ type: 'warning', message, ...options });
  };

  const info = (message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  };

  const toast = {
    add: addToast,
    remove: removeToast,
    clear: clearToasts,
    update: updateToast,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <ToastContainer {...props} />
    </ToastContext.Provider>
  );
};

// Hook for using toast
const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

// 全局Toast API (可选)
let globalToast = null;

const setGlobalToast = (toast) => {
  globalToast = toast;
};

const toast = {
  success: (message, options) => globalToast?.success(message, options),
  error: (message, options) => globalToast?.error(message, options),
  warning: (message, options) => globalToast?.warning(message, options),
  info: (message, options) => globalToast?.info(message, options),
  add: (options) => globalToast?.add(options),
  remove: (id) => globalToast?.remove(id),
  clear: () => globalToast?.clear()
};

// Toast初始化组件
const ToastInit = () => {
  const toastInstance = useToast();
  
  useEffect(() => {
    setGlobalToast(toastInstance);
    return () => setGlobalToast(null);
  }, [toastInstance]);

  return null;
};

// 添加CSS动画样式（需要在CSS或Tailwind配置中添加）
const toastStyles = `
@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}

.animate-progress {
  animation: progress linear;
}
`;

Toast.displayName = 'Toast';
ToastContainer.displayName = 'ToastContainer';
ToastProvider.displayName = 'ToastProvider';

export { 
  Toast, 
  ToastContainer, 
  ToastProvider, 
  ToastInit,
  useToast, 
  toast,
  toastStyles 
};