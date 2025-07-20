import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { BaseComponentProps } from '@/types'

const cardVariants = cva(
  'rounded-lg border border-secondary-200 bg-white shadow-sm',
  {
    variants: {
      variant: {
        default: 'border-secondary-200 bg-white',
        elevated: 'border-secondary-200 bg-white shadow-lg',
        outlined: 'border-secondary-300 bg-white shadow-none',
        ghost: 'border-transparent bg-transparent shadow-none',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants>,
    BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  clickable?: boolean
  loading?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      hoverable = false,
      clickable = false,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          cardVariants({ variant, padding, className }),
          hoverable && 'transition-all duration-200 hover:shadow-md hover:-translate-y-1',
          clickable && 'cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95',
          loading && 'animate-pulse'
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card Header Component
export interface CardHeaderProps extends BaseComponentProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        className={cn('flex items-start justify-between space-y-1.5', className)}
        ref={ref}
        {...props}
      >
        {children || (
          <>
            <div className="space-y-1">
              {title && (
                <h3 className="text-lg font-semibold leading-none tracking-tight text-secondary-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-secondary-600">{subtitle}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </>
        )}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

// Card Content Component
export interface CardContentProps extends BaseComponentProps {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className={cn('pt-0', className)} ref={ref} {...props}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

// Card Footer Component
export interface CardFooterProps extends BaseComponentProps {
  action?: React.ReactNode
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, action, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center justify-between pt-6',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter, cardVariants }