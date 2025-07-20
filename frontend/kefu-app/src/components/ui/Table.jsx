import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';

const Table = ({
  columns = [],
  data = [],
  className,
  size = 'md',
  striped = false,
  hoverable = true,
  bordered = true,
  loading = false,
  emptyText = '暂无数据',
  sortable = false,
  selectable = false,
  onRowSelect,
  onSort,
  pagination,
  ...props
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState(new Set());

  // 排序数据
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig, sortable]);

  const handleSort = (key) => {
    if (!sortable) return;

    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(sortedData.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
    onRowSelect?.(checked ? sortedData : []);
  };

  const handleSelectRow = (index, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
    onRowSelect?.(sortedData.filter((_, i) => newSelected.has(i)));
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const getCellPadding = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  const isAllSelected = selectedRows.size > 0 && selectedRows.size === sortedData.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sortedData.length;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table 
          className={clsx(
            'min-w-full divide-y divide-gray-200',
            getSizeClasses(),
            {
              'border border-gray-200': bordered
            },
            className
          )}
          {...props}
        >
          {/* 表头 */}
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className={clsx('relative', getCellPadding())}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  className={clsx(
                    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    getCellPadding(),
                    {
                      'cursor-pointer hover:bg-gray-100': sortable && column.sortable !== false,
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right'
                    }
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {sortable && column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className={clsx(
            'bg-white divide-y divide-gray-200',
            {
              'divide-y-0': !striped
            }
          )}>
            {sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={clsx(
                    {
                      'bg-gray-50': striped && rowIndex % 2 === 1,
                      'hover:bg-gray-50': hoverable && (!striped || rowIndex % 2 === 0),
                      'hover:bg-gray-100': hoverable && striped && rowIndex % 2 === 1,
                      'bg-blue-50': selectedRows.has(rowIndex)
                    }
                  )}
                >
                  {selectable && (
                    <td className={clsx('relative', getCellPadding())}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={(e) => handleSelectRow(rowIndex, e.target.checked)}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key || colIndex}
                      className={clsx(
                        'text-gray-900 whitespace-nowrap',
                        getCellPadding(),
                        {
                          'text-center': column.align === 'center',
                          'text-right': column.align === 'right'
                        }
                      )}
                    >
                      {column.render 
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200">
          {pagination}
        </div>
      )}
    </div>
  );
};

// 分页组件
const Pagination = ({
  current = 1,
  total = 0,
  pageSize = 10,
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal = true,
  onChange,
  onShowSizeChange,
  className,
  ...props
}) => {
  const [quickJumpValue, setQuickJumpValue] = useState('');

  const totalPages = Math.ceil(total / pageSize);
  const startRecord = (current - 1) * pageSize + 1;
  const endRecord = Math.min(current * pageSize, total);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange?.(page, pageSize);
    }
  };

  const handleSizeChange = (newSize) => {
    const newPage = Math.ceil((current - 1) * pageSize / newSize) + 1;
    onShowSizeChange?.(newPage, newSize);
  };

  const handleQuickJump = () => {
    const page = parseInt(quickJumpValue);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setQuickJumpValue('');
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={clsx('flex items-center justify-between', className)} {...props}>
      {/* 总数显示 */}
      {showTotal && (
        <div className="text-sm text-gray-700">
          共 {total} 条记录，显示第 {startRecord}-{endRecord} 条
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* 每页条数选择器 */}
        {showSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">每页</span>
            <select
              value={pageSize}
              onChange={(e) => handleSizeChange(parseInt(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700">条</span>
          </div>
        )}

        {/* 分页按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(current - 1)}
            disabled={current === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>

          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={index} className="px-3 py-2 text-sm text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={index}
                onClick={() => handlePageChange(page)}
                className={clsx(
                  'px-3 py-2 text-sm border rounded-md',
                  {
                    'bg-blue-600 text-white border-blue-600': page === current,
                    'border-gray-300 hover:bg-gray-50': page !== current
                  }
                )}
              >
                {page}
              </button>
            )
          ))}

          <button
            onClick={() => handlePageChange(current + 1)}
            disabled={current === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>

        {/* 快速跳转 */}
        {showQuickJumper && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">跳至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={quickJumpValue}
              onChange={(e) => setQuickJumpValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickJump()}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">页</span>
            <button
              onClick={handleQuickJump}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              确定
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

Table.displayName = 'Table';
Pagination.displayName = 'Pagination';

export { Table, Pagination };