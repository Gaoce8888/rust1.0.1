import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { BaseComponentProps, TableColumn, PaginationInfo, SortInfo, FilterInfo, Size } from '@/types'
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react'

const tableVariants = {
  size: {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  },
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  size?: Size
  striped?: boolean
  hoverable?: boolean
  selectable?: boolean
  selectedRows?: string[]
  onRowSelect?: (selectedRows: string[]) => void
  sortInfo?: SortInfo
  onSort?: (sortInfo: SortInfo) => void
  filterInfo?: FilterInfo
  onFilter?: (filterInfo: FilterInfo) => void
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  emptyText?: string
  rowKey?: keyof T | ((record: T, index: number) => string)
}

export function Table<T extends Record<string, any> = any>({
  data,
  columns,
  loading = false,
  size = 'md',
  striped = false,
  hoverable = true,
  selectable = false,
  selectedRows = [],
  onRowSelect,
  sortInfo,
  onSort,
  filterInfo,
  onFilter,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyText = '暂无数据',
  rowKey = 'id',
  className,
  ...props
}: TableProps<T>) {
  const [internalSelectedRows, setInternalSelectedRows] = useState<string[]>(selectedRows)

  // 获取行键值
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record, index)
    }
    return String(record[rowKey])
  }

  // 处理行选择
  const handleRowSelect = (rowKey: string, checked: boolean) => {
    const newSelectedRows = checked
      ? [...internalSelectedRows, rowKey]
      : internalSelectedRows.filter(key => key !== rowKey)
    
    setInternalSelectedRows(newSelectedRows)
    onRowSelect?.(newSelectedRows)
  }

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    const allRowKeys = data.map((record, index) => getRowKey(record, index))
    const newSelectedRows = checked ? allRowKeys : []
    
    setInternalSelectedRows(newSelectedRows)
    onRowSelect?.(newSelectedRows)
  }

  // 处理排序
  const handleSort = (columnKey: string) => {
    if (!onSort) return

    const currentOrder = sortInfo?.key === columnKey ? sortInfo.order : null
    const newOrder = currentOrder === 'ascend' ? 'descend' : 'ascend'
    
    onSort({
      key: columnKey,
      order: newOrder,
    })
  }

  // 渲染排序图标
  const renderSortIcon = (columnKey: string) => {
    if (sortInfo?.key !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 text-secondary-400" />
    }
    
    return sortInfo.order === 'ascend' ? (
      <ChevronUpIcon className="h-4 w-4 text-primary-600" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-primary-600" />
    )
  }

  // 渲染单元格内容
  const renderCell = (column: TableColumn<T>, record: T, index: number) => {
    if (column.render) {
      return column.render(record[column.dataIndex!], record, index)
    }
    
    const value = column.dataIndex ? record[column.dataIndex] : null
    return value != null ? String(value) : '-'
  }

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return data
    
    const { current, pageSize } = pagination
    const start = (current - 1) * pageSize
    const end = start + pageSize
    
    return data.slice(start, end)
  }, [data, pagination])

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)} {...props}>
        <div className="h-8 bg-secondary-200 rounded mb-2"></div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-secondary-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-secondary-200 bg-secondary-50">
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={internalSelectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-secondary-900',
                    tableVariants.size[size],
                    column.width && `w-${column.width}`,
                    column.align && `text-${column.align}`,
                    column.sortable && 'cursor-pointer hover:bg-secondary-100 select-none'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  className="px-4 py-8 text-center text-secondary-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              paginatedData.map((record, index) => {
                const rowKey = getRowKey(record, index)
                const isSelected = internalSelectedRows.includes(rowKey)
                
                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'border-b border-secondary-100',
                      striped && index % 2 === 1 && 'bg-secondary-50',
                      hoverable && 'hover:bg-secondary-50 transition-colors',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleRowSelect(rowKey, e.target.checked)}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 py-3',
                          tableVariants.size[size],
                          column.align && `text-${column.align}`
                        )}
                      >
                        {renderCell(column, record, index)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 分页组件 */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200">
          <div className="text-sm text-secondary-600">
            共 {pagination.total} 条记录
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange?.(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="text-sm text-secondary-600">
              {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => onPageChange?.(pagination.current + 1)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}