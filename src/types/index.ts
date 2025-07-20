import { ReactNode } from 'react'

/**
 * 基础组件属性接口
 */
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  id?: string
}

/**
 * 尺寸类型
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * 变体类型
 */
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

/**
 * 状态类型
 */
export type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * 方向类型
 */
export type Direction = 'horizontal' | 'vertical'

/**
 * 位置类型
 */
export type Position = 'top' | 'right' | 'bottom' | 'left' | 'center'

/**
 * 对齐类型
 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch'

/**
 * 表单字段类型
 */
export type FieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'datetime-local' | 'time' | 'file'

/**
 * 数据表格列定义
 */
export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex?: keyof T
  width?: number | string
  align?: Alignment
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: T, index: number) => ReactNode
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: (total: number, range: [number, number]) => string
}

/**
 * 排序信息
 */
export interface SortInfo {
  key: string
  order: 'ascend' | 'descend' | null
}

/**
 * 过滤信息
 */
export interface FilterInfo {
  [key: string]: any
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
  errors?: Record<string, string[]>
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    current: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 选项类型
 */
export interface Option {
  label: string
  value: string | number
  disabled?: boolean
  children?: Option[]
}

/**
 * 菜单项类型
 */
export interface MenuItem {
  key: string
  label: string
  icon?: ReactNode
  children?: MenuItem[]
  disabled?: boolean
  danger?: boolean
}

/**
 * 面包屑项类型
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

/**
 * 步骤项类型
 */
export interface StepItem {
  title: string
  description?: string
  icon?: ReactNode
  status?: 'wait' | 'process' | 'finish' | 'error'
}

/**
 * 标签页项类型
 */
export interface TabItem {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  closable?: boolean
  children?: ReactNode
}

/**
 * 通知类型
 */
export interface Notification {
  id: string
  type: Variant
  title: string
  message?: string
  duration?: number
  closable?: boolean
  icon?: ReactNode
}

/**
 * 模态框配置
 */
export interface ModalConfig {
  title?: string
  content: ReactNode
  width?: number | string
  centered?: boolean
  closable?: boolean
  maskClosable?: boolean
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

/**
 * 抽屉配置
 */
export interface DrawerConfig {
  title?: string
  content: ReactNode
  width?: number | string
  height?: number | string
  placement?: Position
  closable?: boolean
  maskClosable?: boolean
  onClose?: () => void
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  primaryColor?: string
  borderRadius?: number
  fontFamily?: string
  fontSize?: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
}

/**
 * 国际化配置
 */
export interface I18nConfig {
  locale: string
  messages: Record<string, Record<string, string>>
}

/**
 * 用户信息
 */
export interface User {
  id: string | number
  username: string
  email: string
  avatar?: string
  role?: string
  permissions?: string[]
}

/**
 * 文件信息
 */
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt: Date
  uploadedBy?: string
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (event: T) => void

/**
 * 异步事件处理器类型
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>

/**
 * 回调函数类型
 */
export type Callback<T = any> = (data: T) => void

/**
 * 异步回调函数类型
 */
export type AsyncCallback<T = any> = (data: T) => Promise<void>