import React, { forwardRef, useState } from 'react';
import { clsx } from 'clsx';

const inputVariants = {
  // 尺寸变体
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  },
  // 状态变体
  status: {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
  },
  // 圆角变体
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg'
  }
};

const Input = forwardRef(({
  className,
  type = 'text',
  size = 'md',
  radius = 'md',
  status = 'default',
  label,
  placeholder,
  helperText,
  errorMessage,
  successMessage,
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconClick,
  clearable = false,
  showPasswordToggle = false,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  
  // 确定当前状态
  const currentStatus = errorMessage ? 'error' : successMessage ? 'success' : status;

  const baseClasses = clsx(
    'w-full border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    'placeholder:text-gray-400'
  );

  const sizeClasses = inputVariants.size[size] || inputVariants.size.md;
  const statusClasses = inputVariants.status[currentStatus] || inputVariants.status.default;
  const radiusClasses = inputVariants.radius[radius] || inputVariants.radius.md;

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    const event = {
      target: { value: '' }
    };
    onChange?.(event);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return (
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        {leftIcon}
      </div>
    );
  };

  const renderRightIcons = () => {
    const icons = [];
    
    // 清除按钮
    if (clearable && value && !disabled) {
      icons.push(
        <button
          key="clear"
          type="button"
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      );
    }

    // 密码显示切换
    if (isPassword && showPasswordToggle) {
      icons.push(
        <button
          key="password"
          type="button"
          onClick={togglePasswordVisibility}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      );
    }

    // 自定义右侧图标
    if (rightIcon) {
      icons.push(
        <button
          key="custom"
          type="button"
          onClick={onRightIconClick}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {rightIcon}
        </button>
      );
    }

    if (icons.length === 0) return null;

    return (
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
        {icons}
      </div>
    );
  };

  const getStatusMessage = () => {
    if (errorMessage) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      );
    }
    if (successMessage) {
      return (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </p>
      );
    }
    if (helperText) {
      return <p className="mt-1 text-sm text-gray-500">{helperText}</p>;
    }
    return null;
  };

  return (
    <div className="w-full">
      {label && (
        <label className={clsx(
          'block text-sm font-medium mb-2',
          currentStatus === 'error' ? 'text-red-700' : 'text-gray-700'
        )}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {renderLeftIcon()}
        
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            baseClasses,
            sizeClasses,
            statusClasses,
            radiusClasses,
            {
              'pl-10': leftIcon,
              'pr-10': rightIcon || clearable || (isPassword && showPasswordToggle),
              'pr-16': (clearable && value && !disabled) && (rightIcon || (isPassword && showPasswordToggle))
            },
            className
          )}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {renderRightIcons()}
      </div>
      
      {getStatusMessage()}
    </div>
  );
});

Input.displayName = 'Input';

export { Input, inputVariants };