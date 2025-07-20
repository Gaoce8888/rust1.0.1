import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils';
import { InputProps } from '../../types';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    type = 'text',
    placeholder,
    value,
    defaultValue,
    disabled = false,
    required = false,
    error,
    onChange,
    onBlur,
    onFocus,
    className,
    style,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = type === 'password' && showPassword ? 'text' : type;

    const baseClasses = 'w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';
    
    const stateClasses = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      disabled: 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
    };

    const getStateClass = () => {
      if (disabled) return stateClasses.disabled;
      if (error) return stateClasses.error;
      return stateClasses.default;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="relative">
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              baseClasses,
              getStateClass(),
              className
            )}
            style={style}
            {...props}
          />
          
          {/* 密码显示切换按钮 */}
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          
          {/* 错误图标 */}
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        
        {/* 错误信息 */}
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;