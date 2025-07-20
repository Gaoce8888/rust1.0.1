import React, { forwardRef } from 'react';
import { Input as HeroInput } from '@heroui/react';
import clsx from 'clsx';

const Input = forwardRef(({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  helpText,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  leftIcon,
  rightIcon,
  size = 'medium',
  variant = 'bordered',
  className,
  ...props
}, ref) => {
  const sizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const errorMessage = error || props.errorMessage;

  return (
    <div className={clsx('w-full', className)}>
      <HeroInput
        ref={ref}
        label={label}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        variant={variant}
        color={errorMessage ? 'danger' : 'default'}
        errorMessage={errorMessage}
        description={helpText}
        className={clsx(
          sizes[size],
          errorMessage && 'border-red-500 focus:border-red-500',
          'transition-colors duration-200'
        )}
        startContent={leftIcon && (
          <div className="pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        endContent={rightIcon && (
          <div className="pointer-events-none flex items-center">
            {rightIcon}
          </div>
        )}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export default Input;