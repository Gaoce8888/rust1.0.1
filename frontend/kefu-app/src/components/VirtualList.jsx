import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { performanceMonitor } from '@utils/performance';

/**
 * 虚拟滚动列表组件
 * 用于高效渲染大量数据，避免DOM节点过多导致的性能问题
 */
export const VirtualList = React.memo(({
  items = [],
  itemHeight = 50,
  itemRenderer,
  className = '',
  style = {},
  overscanCount = 5,
  onScroll,
  onItemsRendered,
  estimatedItemSize,
  useDynamicSize = false,
  ...props
}) => {
  const listRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  // 性能监控
  useEffect(() => {
    performanceMonitor.startTimer('VirtualList-render');
    return () => {
      performanceMonitor.endTimer('VirtualList-render');
    };
  }, [items.length]);

  // 动态计算item高度
  const getItemSize = useCallback((index) => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return itemHeight;
  }, [itemHeight]);

  // 优化的item渲染函数
  const renderItem = useCallback(({ index, style }) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div style={style} key={`item-${index}`}>
        {itemRenderer({ item, index, style })}
      </div>
    );
  }, [items, itemRenderer]);

  // 滚动事件处理
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (onScroll) {
      onScroll({ scrollOffset, scrollUpdateWasRequested });
    }
  }, [onScroll]);

  // 渲染完成事件处理
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex, overscanStartIndex, overscanStopIndex }) => {
    if (onItemsRendered) {
      onItemsRendered({ visibleStartIndex, visibleStopIndex, overscanStartIndex, overscanStopIndex });
    }
  }, [onItemsRendered]);

  // 滚动到指定索引
  const scrollToItem = useCallback((index, align = 'auto') => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, align);
    }
  }, []);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollToItem(0, 'start');
  }, [scrollToItem]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1, 'end');
  }, [scrollToItem, items.length]);

  // 获取可见范围
  const getVisibleRange = useCallback(() => {
    if (!listRef.current) return { start: 0, end: 0 };
    
    const { scrollOffset, clientHeight } = listRef.current.state;
    const start = Math.floor(scrollOffset / itemHeight);
    const end = Math.min(start + Math.ceil(clientHeight / itemHeight), items.length - 1);
    
    return { start, end };
  }, [itemHeight, items.length]);

  // 容器尺寸变化处理
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 如果没有数据，显示空状态
  if (items.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`virtual-list-empty ${className}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          ...style 
        }}
      >
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📋</div>
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{ height: '100%', ...style }}
      {...props}
    >
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={getItemSize}
            overscanCount={overscanCount}
            onScroll={handleScroll}
            onItemsRendered={handleItemsRendered}
            estimatedItemSize={estimatedItemSize}
            useDynamicSize={useDynamicSize}
          >
            {renderItem}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

/**
 * 虚拟滚动列表的Hook
 * 提供虚拟列表的常用功能
 */
export const useVirtualList = (items = [], options = {}) => {
  const {
    itemHeight = 50,
    overscanCount = 5,
    estimatedItemSize,
  } = options;

  const [scrollOffset, setScrollOffset] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const handleScroll = useCallback(({ scrollOffset: offset }) => {
    setScrollOffset(offset);
  }, []);

  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }) => {
    setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
  }, []);

  const listProps = useMemo(() => ({
    itemHeight,
    overscanCount,
    estimatedItemSize,
    onScroll: handleScroll,
    onItemsRendered: handleItemsRendered,
  }), [itemHeight, overscanCount, estimatedItemSize, handleScroll, handleItemsRendered]);

  return {
    scrollOffset,
    visibleRange,
    listProps,
  };
};

/**
 * 虚拟滚动列表的增强版本
 * 包含搜索、过滤、排序等功能
 */
export const EnhancedVirtualList = React.memo(({
  items = [],
  searchTerm = '',
  searchFields = [],
  sortBy = null,
  sortDirection = 'asc',
  filterFunction = null,
  itemHeight = 50,
  itemRenderer,
  className = '',
  style = {},
  ...props
}) => {
  // 过滤和排序数据
  const processedItems = useMemo(() => {
    let result = [...items];

    // 搜索过滤
    if (searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(term);
        })
      );
    }

    // 自定义过滤
    if (filterFunction) {
      result = result.filter(filterFunction);
    }

    // 排序
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchTerm, searchFields, sortBy, sortDirection, filterFunction]);

  // 使用虚拟列表Hook
  const { scrollOffset, visibleRange, listProps } = useVirtualList(processedItems, {
    itemHeight,
    ...props,
  });

  return (
    <div className={`enhanced-virtual-list ${className}`} style={style}>
      {/* 统计信息 */}
      <div className="virtual-list-stats text-xs text-gray-500 mb-2">
        显示 {processedItems.length} 项，可见范围: {visibleRange.start}-{visibleRange.end}
      </div>
      
      {/* 虚拟列表 */}
      <VirtualList
        items={processedItems}
        itemHeight={itemHeight}
        itemRenderer={itemRenderer}
        {...listProps}
        {...props}
      />
    </div>
  );
});

EnhancedVirtualList.displayName = 'EnhancedVirtualList';

/**
 * 虚拟滚动列表的懒加载版本
 * 支持分页加载数据
 */
export const LazyVirtualList = React.memo(({
  items = [],
  hasMore = false,
  isLoading = false,
  onLoadMore,
  itemHeight = 50,
  itemRenderer,
  className = '',
  style = {},
  threshold = 5, // 距离底部多少项时开始加载
  ...props
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 处理加载更多
  const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
    if (hasMore && !isLoading && !isLoadingMore && visibleStopIndex >= items.length - threshold) {
      setIsLoadingMore(true);
      onLoadMore?.().finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [hasMore, isLoading, isLoadingMore, items.length, threshold, onLoadMore]);

  // 渲染加载状态
  const renderItem = useCallback(({ index, style }) => {
    const item = items[index];
    
    // 如果是最后一个item且正在加载更多，显示加载状态
    if (index === items.length - 1 && isLoadingMore) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="text-gray-500">加载中...</div>
        </div>
      );
    }

    if (!item) return null;

    return (
      <div style={style} key={`item-${index}`}>
        {itemRenderer({ item, index, style })}
      </div>
    );
  }, [items, itemRenderer, isLoadingMore]);

  return (
    <div className={`lazy-virtual-list ${className}`} style={style}>
      <VirtualList
        items={items}
        itemHeight={itemHeight}
        itemRenderer={renderItem}
        onItemsRendered={handleItemsRendered}
        {...props}
      />
      
      {/* 底部加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center p-4 border-t">
          <div className="text-gray-500">加载中...</div>
        </div>
      )}
    </div>
  );
});

LazyVirtualList.displayName = 'LazyVirtualList';