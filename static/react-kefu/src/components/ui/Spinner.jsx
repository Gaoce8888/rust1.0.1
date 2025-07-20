import React from 'react';
import { twMerge } from 'tailwind-merge';

const Spinner = ({
  size = 'medium',
  color = 'primary',
  variant = 'spin',
  className,
  label,
  ...props
}) => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  const colors = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-cyan-600',
    white: 'text-white',
    current: 'text-current'
  };
  
  const spinnerClasses = twMerge(
    sizes[size],
    colors[color],
    className
  );
  
  const renderSpinner = () => {
    switch (variant) {
      case 'spin':
        return (
          <svg 
            className={twMerge('animate-spin', spinnerClasses)} 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            {...props}
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
        
      case 'dots':
        return (
          <div className={twMerge('flex space-x-1', spinnerClasses)} {...props}>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        );
        
      case 'pulse':
        return (
          <div className={twMerge('relative', spinnerClasses)} {...props}>
            <div className="absolute inset-0 bg-current rounded-full animate-ping opacity-75" />
            <div className="relative bg-current rounded-full w-full h-full" />
          </div>
        );
        
      case 'bars':
        return (
          <div className={twMerge('flex space-x-1', spinnerClasses)} {...props}>
            <div className="w-1 h-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-1 h-full bg-current animate-pulse" style={{ animationDelay: '450ms' }} />
          </div>
        );
        
      case 'ring':
        return (
          <div className={twMerge('relative', spinnerClasses)} {...props}>
            <div className="absolute inset-0 border-4 border-current opacity-25 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-current rounded-full animate-spin" />
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (label) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        {renderSpinner()}
        <span className={twMerge('text-sm', colors[color])}>{label}</span>
      </div>
    );
  }
  
  return renderSpinner();
};

export default Spinner;