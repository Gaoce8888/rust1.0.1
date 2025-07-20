import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Toast Context
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((options) => {
    const id = Date.now();
    const toast = {
      id,
      duration: 5000,
      ...options
    };
    
    setToasts(prev => [...prev, toast]);
    
    if (toast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
    
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  const toast = {
    show: (options) => addToast(options),
    success: (message, options) => addToast({ ...options, message, type: 'success' }),
    error: (message, options) => addToast({ ...options, message, type: 'error' }),
    warning: (message, options) => addToast({ ...options, message, type: 'warning' }),
    info: (message, options) => addToast({ ...options, message, type: 'info' }),
    remove: removeToast
  };
  
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  const positions = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };
  
  const groupedToasts = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right';
    if (!acc[position]) acc[position] = [];
    acc[position].push(toast);
    return acc;
  }, {});
  
  return createPortal(
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={clsx(
            'fixed z-50 flex flex-col gap-2',
            positions[position]
          )}
        >
          {positionToasts.map(toast => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      ))}
    </>,
    document.body
  );
};

// Individual Toast Component
const Toast = ({
  type = 'default',
  title,
  message,
  icon,
  closable = true,
  onClose,
  action,
  className,
  ...props
}) => {
  const [isExiting, setIsExiting] = useState(false);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };
  
  const types = {
    default: {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };
  
  const typeStyles = types[type] || types.default;
  
  const toastClasses = twMerge(
    'min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border',
    'transition-all duration-300 transform',
    typeStyles.bg,
    typeStyles.border,
    typeStyles.text,
    isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
    className
  );
  
  return (
    <div className={toastClasses} {...props}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icon || typeStyles.icon}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h4 className="text-sm font-medium">
              {title}
            </h4>
          )}
          {message && (
            <p className={clsx('text-sm', title && 'mt-1')}>
              {message}
            </p>
          )}
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        
        {closable && (
          <button
            onClick={handleClose}
            className="ml-4 flex-shrink-0 rounded-md hover:opacity-80 focus:outline-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;