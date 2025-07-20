import React from 'react';
import { twMerge } from 'tailwind-merge';

const Badge = ({
  variant = 'default',
  size = 'medium',
  dot = false,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium transition-all duration-200';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
    // Solid variants
    solidDefault: 'bg-gray-600 text-white',
    solidPrimary: 'bg-blue-600 text-white',
    solidSecondary: 'bg-purple-600 text-white',
    solidSuccess: 'bg-green-600 text-white',
    solidWarning: 'bg-yellow-600 text-white',
    solidDanger: 'bg-red-600 text-white',
    solidInfo: 'bg-cyan-600 text-white',
    // Outline variants
    outlineDefault: 'border border-gray-300 text-gray-700',
    outlinePrimary: 'border border-blue-300 text-blue-700',
    outlineSecondary: 'border border-purple-300 text-purple-700',
    outlineSuccess: 'border border-green-300 text-green-700',
    outlineWarning: 'border border-yellow-300 text-yellow-700',
    outlineDanger: 'border border-red-300 text-red-700',
    outlineInfo: 'border border-cyan-300 text-cyan-700'
  };
  
  const sizes = {
    small: 'px-2 py-0.5 text-xs rounded',
    medium: 'px-2.5 py-0.5 text-sm rounded-md',
    large: 'px-3 py-1 text-base rounded-md'
  };
  
  const dotSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5'
  };
  
  const classes = twMerge(
    baseStyles,
    variants[variant],
    sizes[size],
    className
  );
  
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove && onRemove();
  };
  
  return (
    <span className={classes} {...props}>
      {dot && (
        <span className={twMerge(
          'rounded-full bg-current opacity-80 mr-1.5',
          dotSizes[size]
        )} />
      )}
      
      {children}
      
      {removable && (
        <button
          onClick={handleRemove}
          className="ml-1 -mr-0.5 hover:opacity-80 focus:outline-none"
          aria-label="Remove badge"
        >
          <svg 
            className={twMerge(
              'text-current',
              size === 'small' && 'w-3 h-3',
              size === 'medium' && 'w-3.5 h-3.5',
              size === 'large' && 'w-4 h-4'
            )} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default Badge;