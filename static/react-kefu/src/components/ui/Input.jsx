import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const Input = React.forwardRef(({
  type = 'text',
  size = 'medium',
  variant = 'default',
  error = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  label,
  helperText,
  errorMessage,
  required = false,
  className,
  wrapperClassName,
  ...props
}, ref) => {
  const baseStyles = 'transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    default: 'border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    filled: 'bg-gray-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    underline: 'border-0 border-b-2 border-gray-300 focus:border-blue-500 rounded-none px-0',
    ghost: 'border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-5 py-3 text-lg'
  };
  
  const roundedSizes = {
    default: 'rounded-lg',
    filled: 'rounded-lg',
    underline: 'rounded-none',
    ghost: 'rounded-lg'
  };
  
  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };
  
  const inputClasses = twMerge(
    baseStyles,
    variants[variant],
    sizes[size],
    roundedSizes[variant],
    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
    (icon && iconPosition === 'left') && 'pl-10',
    (icon && iconPosition === 'right') && 'pr-10',
    fullWidth && 'w-full',
    className
  );
  
  const wrapperClasses = twMerge(
    'relative',
    fullWidth && 'w-full',
    wrapperClassName
  );
  
  const iconClasses = clsx(
    'absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none',
    iconSizes[size],
    iconPosition === 'left' ? 'left-3' : 'right-3'
  );
  
  const labelClasses = twMerge(
    'block mb-1 text-sm font-medium text-gray-700',
    error && 'text-red-600'
  );
  
  const helperTextClasses = twMerge(
    'mt-1 text-sm',
    error ? 'text-red-600' : 'text-gray-500'
  );
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={wrapperClasses}>
        {icon && (
          <span className={iconClasses}>
            {icon}
          </span>
        )}
        
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          disabled={disabled}
          aria-invalid={error}
          aria-describedby={helperText || errorMessage ? 'helper-text' : undefined}
          {...props}
        />
      </div>
      
      {(helperText || errorMessage) && (
        <p id="helper-text" className={helperTextClasses}>
          {error ? errorMessage : helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;