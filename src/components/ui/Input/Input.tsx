import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { BaseComponentProps, FieldType, Size, Variant } from '@/types'

const inputVariants = cva(
  'flex w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-300',
        error: 'border-error-500 focus-visible:ring-error-500',
        success: 'border-success-500 focus-visible:ring-success-500',
        warning: 'border-warning-500 focus-visible:ring-warning-500',
      },
      size: {
        xs: 'h-6 px-2 text-xs',
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
        xl: 'h-14 px-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: true,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants>,
    BaseComponentProps {
  type?: FieldType
  size?: Size
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: boolean
  success?: boolean
  warning?: boolean
  helperText?: string
  label?: string
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      variant,
      size,
      fullWidth,
      leftIcon,
      rightIcon,
      error,
      success,
      warning,
      helperText,
      label,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    // 根据状态确定变体
    let inputVariant = variant
    if (error) inputVariant = 'error'
    else if (success) inputVariant = 'success'
    else if (warning) inputVariant = 'warning'

    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-900"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: inputVariant, size, fullWidth, className }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10'
            )}
            ref={ref}
            id={inputId}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={cn(
              'text-xs',
              error && 'text-error-600',
              success && 'text-success-600',
              warning && 'text-warning-600',
              !error && !success && !warning && 'text-secondary-500'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }