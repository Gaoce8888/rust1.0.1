import React, { createContext, useContext, useCallback } from 'react'
import { useForm, FormProvider, FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { BaseComponentProps } from '@/types'

// Form Context
interface FormContextValue {
  form: UseFormReturn<any>
  loading?: boolean
}

const FormContext = createContext<FormContextValue | undefined>(undefined)

export const useFormContext = () => {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context
}

// Form Component
export interface FormProps<T extends FieldValues = FieldValues> extends BaseComponentProps {
  schema?: z.ZodSchema<T>
  defaultValues?: Partial<T>
  onSubmit?: SubmitHandler<T>
  onError?: (errors: any) => void
  loading?: boolean
  layout?: 'horizontal' | 'vertical'
  labelWidth?: string
  children: React.ReactNode
}

export function Form<T extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onError,
  loading = false,
  layout = 'vertical',
  labelWidth = '120px',
  children,
  className,
  ...props
}: FormProps<T>) {
  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
  })

  const handleSubmit = useCallback(
    (data: T) => {
      onSubmit?.(data)
    },
    [onSubmit]
  )

  const handleError = useCallback(
    (errors: any) => {
      onError?.(errors)
    },
    [onError]
  )

  return (
    <FormContext.Provider value={{ form, loading }}>
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit, handleError)}
          className={cn(
            'space-y-6',
            layout === 'horizontal' && 'space-y-4',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              layout === 'horizontal' && 'grid gap-4',
              layout === 'horizontal' && `grid-cols-[${labelWidth}_1fr]`
            )}
          >
            {children}
          </div>
        </form>
      </FormProvider>
    </FormContext.Provider>
  )
}

// Form Item Component
export interface FormItemProps extends BaseComponentProps {
  name: string
  label?: string
  required?: boolean
  help?: string
  error?: string
  layout?: 'horizontal' | 'vertical'
  labelWidth?: string
  children: React.ReactNode
}

export function FormItem({
  name,
  label,
  required = false,
  help,
  error,
  layout = 'vertical',
  labelWidth = '120px',
  children,
  className,
  ...props
}: FormItemProps) {
  const { form } = useFormContext()
  const fieldError = form.formState.errors[name]?.message as string
  const displayError = error || fieldError

  return (
    <div
      className={cn(
        'space-y-2',
        layout === 'horizontal' && 'flex items-start space-x-4 space-y-0',
        className
      )}
      {...props}
    >
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'block text-sm font-medium text-secondary-900',
            layout === 'horizontal' && 'flex-shrink-0',
            layout === 'horizontal' && `w-[${labelWidth}]`,
            layout === 'horizontal' && 'pt-2'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex-1 space-y-1">
        {children}
        {displayError && (
          <p className="text-xs text-error-600">{displayError}</p>
        )}
        {help && !displayError && (
          <p className="text-xs text-secondary-500">{help}</p>
        )}
      </div>
    </div>
  )
}

// Form Field Component
export interface FormFieldProps extends BaseComponentProps {
  name: string
  children: React.ReactNode
}

export function FormField({ name, children, ...props }: FormFieldProps) {
  const { form } = useFormContext()
  const { register, control, formState } = form

  return (
    <div {...props}>
      {React.cloneElement(children as React.ReactElement, {
        ...register(name),
        error: !!formState.errors[name],
        ...(children as React.ReactElement).props,
      })}
    </div>
  )
}

// Form Actions Component
export interface FormActionsProps extends BaseComponentProps {
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  showCancel?: boolean
  loading?: boolean
  children?: React.ReactNode
}

export function FormActions({
  submitText = '提交',
  cancelText = '取消',
  onCancel,
  showCancel = true,
  loading = false,
  children,
  className,
  ...props
}: FormActionsProps) {
  const { loading: formLoading } = useFormContext()
  const isLoading = loading || formLoading

  return (
    <div
      className={cn(
        'flex items-center justify-end space-x-3 pt-6 border-t border-secondary-200',
        className
      )}
      {...props}
    >
      {children}
      {showCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {cancelText}
        </button>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '提交中...' : submitText}
      </button>
    </div>
  )
}

// Form Section Component
export interface FormSectionProps extends BaseComponentProps {
  title?: string
  description?: string
  children: React.ReactNode
}

export function FormSection({
  title,
  description,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div
      className={cn('space-y-4 p-6 bg-secondary-50 rounded-lg', className)}
      {...props}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-secondary-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-secondary-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  )
}