import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'medium',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  className,
  children,
  ...props
}) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEsc]);
  
  const sizes = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  const backdropClasses = clsx(
    'fixed inset-0 z-50 flex items-center justify-center p-4',
    'bg-black/50 backdrop-blur-sm',
    'transition-all duration-300',
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  );
  
  const modalClasses = twMerge(
    'relative w-full bg-white rounded-xl shadow-2xl',
    'transform transition-all duration-300',
    sizes[size],
    isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
    className
  );
  
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return createPortal(
    <div 
      className={backdropClasses} 
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div ref={modalRef} className={modalClasses} {...props}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div>
              {title && (
                <h3 id="modal-title" className="text-xl font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-gray-600">
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;