import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none mx-4'
};

const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
  maskClosable = true,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  destroyOnClose = false,
  centered = true,
  animation = true,
  zIndex = 1000,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // 处理ESC键关闭
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closable && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 保存当前焦点
      previousFocusRef.current = document.activeElement;
      // 聚焦到模态框
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closable, onClose]);

  // 恢复焦点
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  // 阻止body滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleMaskClick = (e) => {
    if (e.target === e.currentTarget && maskClosable && closable) {
      onClose?.();
    }
  };

  const handleClose = () => {
    if (closable) {
      onClose?.();
    }
  };

  // 焦点陷阱处理
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen && destroyOnClose) {
    return null;
  }

  const sizeClasses = modalSizes[size] || modalSizes.md;

  return (
    <div
      className={clsx(
        'fixed inset-0 flex items-center justify-center p-4',
        {
          'opacity-0 pointer-events-none': !isOpen,
          'opacity-100': isOpen,
          'items-center': centered,
          'items-start pt-20': !centered
        },
        animation && 'transition-opacity duration-300 ease-out'
      )}
      style={{ zIndex }}
      onClick={handleMaskClick}
      aria-hidden={!isOpen}
    >
      {/* 遮罩层 */}
      <div 
        className={clsx(
          'absolute inset-0 bg-black',
          {
            'bg-opacity-0': !isOpen,
            'bg-opacity-50': isOpen
          },
          animation && 'transition-all duration-300 ease-out'
        )}
      />

      {/* 模态框内容 */}
      <div
        ref={modalRef}
        className={clsx(
          'relative bg-white rounded-lg shadow-xl w-full',
          sizeClasses,
          {
            'scale-95 opacity-0': !isOpen && animation,
            'scale-100 opacity-100': isOpen,
            'transform': animation
          },
          animation && 'transition-all duration-300 ease-out',
          className
        )}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        {...props}
      >
        {/* 头部 */}
        {(title || closable) && (
          <div className={clsx(
            'flex items-center justify-between p-6 border-b border-gray-200',
            headerClassName
          )}>
            {title && (
              <h2 
                id="modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                {title}
              </h2>
            )}
            
            {closable && (
              <button
                type="button"
                onClick={handleClose}
                className={clsx(
                  'p-2 text-gray-400 hover:text-gray-600',
                  'rounded-md hover:bg-gray-100',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
                aria-label="关闭模态框"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 主体内容 */}
        <div className={clsx('p-6', bodyClassName)}>
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className={clsx(
            'flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50',
            footerClassName
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// 确认对话框组件
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  content,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonProps = {},
  cancelButtonProps = {},
  type = 'warning',
  ...props
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  const getIcon = () => {
    const iconClasses = 'w-6 h-6';
    
    switch (type) {
      case 'warning':
        return (
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
            <svg className={clsx(iconClasses, 'text-yellow-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'danger':
        return (
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className={clsx(iconClasses, 'text-red-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
            <svg className={clsx(iconClasses, 'text-blue-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300',
              'rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'transition-colors duration-200'
            )}
            {...cancelButtonProps}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'transition-colors duration-200',
              {
                'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500': type === 'warning',
                'bg-red-600 hover:bg-red-700 focus:ring-red-500': type === 'danger',
                'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500': type === 'info'
              }
            )}
            {...confirmButtonProps}
          >
            {confirmText}
          </button>
        </>
      }
      {...props}
    >
      <div className="text-center">
        {getIcon()}
        <div className="mt-3">
          {content && (
            <p className="text-sm text-gray-500">{content}</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export { Modal, ConfirmModal, modalSizes };