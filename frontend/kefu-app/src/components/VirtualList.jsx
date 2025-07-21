import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { performanceMonitor } from '@utils/performance';

// 虚拟列表组件
export const VirtualList = React.memo(({ 
  items = [], 
  itemHeight = 50, 
  itemRenderer, 
  className = '',
  style = {},
  overscanCount = 5,
  onScroll,
  onItemsRendered
}) => {
  const listRef = useRef(null);
  const [scrollDirection, setScrollDirection] = useState('forward');
  const [scrollOffset, setScrollOffset] = useState(0);

  // 优化的渲染函数
  const renderItem = useCallback(({ index, style: itemStyle }) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div style={itemStyle}>
        {itemRenderer(item, index)}
      </div>
    );
  }, [items, itemRenderer]);

  // 滚动处理
  const handleScroll = useCallback(({ scrollDirection: direction, scrollOffset: offset }) => {
    setScrollDirection(direction);
    setScrollOffset(offset);
    onScroll?.({ scrollDirection: direction, scrollOffset: offset });
  }, [onScroll]);

  // 渲染完成处理
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex, overscanStartIndex, overscanStopIndex }) => {
    onItemsRendered?.({ visibleStartIndex, visibleStopIndex, overscanStartIndex, overscanStopIndex });
  }, [onItemsRendered]);

  // 滚动到指定项
  const scrollToItem = useCallback((index, align = 'auto') => {
    listRef.current?.scrollToItem(index, align);
  }, []);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollToItem(0, 'start');
  }, [scrollToItem]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1, 'end');
  }, [scrollToItem, items.length]);

  // 性能监控
  useEffect(() => {
    performanceMonitor.startTimer('VirtualList-render');
    return () => {
      performanceMonitor.endTimer('VirtualList-render');
    };
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} style={style}>
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={overscanCount}
            onScroll={handleScroll}
            onItemsRendered={handleItemsRendered}
          >
            {renderItem}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

// 虚拟列表Hook
export const useVirtualList = (items = [], options = {}) => {
  const {
    itemHeight = 50,
    overscanCount = 5,
    initialScrollOffset = 0
  } = options;

  const [scrollOffset, setScrollOffset] = useState(initialScrollOffset);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const handleScroll = useCallback(({ scrollOffset: offset }) => {
    setScrollOffset(offset);
  }, []);

  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }) => {
    setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  return {
    scrollOffset,
    visibleRange,
    visibleItems,
    handleScroll,
    handleItemsRendered,
    itemHeight,
    overscanCount
  };
};

// 增强的虚拟列表组件（支持搜索和过滤）
export const EnhancedVirtualList = React.memo(({ 
  items = [], 
  searchTerm = '', 
  searchFields = [],
  itemHeight = 50,
  itemRenderer,
  className = '',
  style = {},
  onFilteredItemsChange
}) => {
  // 过滤和搜索逻辑
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      });
    });
  }, [items, searchTerm, searchFields]);

  // 通知过滤结果变化
  useEffect(() => {
    onFilteredItemsChange?.(filteredItems);
  }, [filteredItems, onFilteredItemsChange]);

  return (
    <VirtualList
      items={filteredItems}
      itemHeight={itemHeight}
      itemRenderer={itemRenderer}
      className={className}
      style={style}
    />
  );
});

// 懒加载虚拟列表组件
export const LazyVirtualList = React.memo(({ 
  items = [], 
  hasMore = false, 
  isLoading = false, 
  onLoadMore,
  itemHeight = 50,
  itemRenderer,
  className = '',
  style = {},
  threshold = 5
}) => {
  const [internalItems, setInternalItems] = useState(items);
  const [internalHasMore, setInternalHasMore] = useState(hasMore);
  const [internalLoading, setInternalLoading] = useState(isLoading);

  // 同步外部状态
  useEffect(() => {
    setInternalItems(items);
  }, [items]);

  useEffect(() => {
    setInternalHasMore(hasMore);
  }, [hasMore]);

  useEffect(() => {
    setInternalLoading(isLoading);
  }, [isLoading]);

  // 懒加载处理
  const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
    if (internalHasMore && !internalLoading && visibleStopIndex >= internalItems.length - threshold) {
      setInternalLoading(true);
      onLoadMore?.().finally(() => {
        setInternalLoading(false);
      });
    }
  }, [internalHasMore, internalLoading, internalItems.length, threshold, onLoadMore]);

  // 渲染加载指示器
  const renderItem = useCallback((item, index) => {
    if (index === internalItems.length && internalHasMore) {
      return (
        <div className="flex items-center justify-center p-4">
          {internalLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-500">加载中...</span>
            </div>
          ) : (
            <button 
              onClick={() => onLoadMore?.()}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              加载更多
            </button>
          )}
        </div>
      );
    }

    return itemRenderer(item, index);
  }, [internalItems.length, internalHasMore, internalLoading, itemRenderer, onLoadMore]);

  const allItems = useMemo(() => {
    const items = [...internalItems];
    if (internalHasMore) {
      items.push({ id: 'loading-placeholder', type: 'loading' });
    }
    return items;
  }, [internalItems, internalHasMore]);

  return (
    <VirtualList
      items={allItems}
      itemHeight={itemHeight}
      itemRenderer={renderItem}
      className={className}
      style={style}
      onItemsRendered={handleItemsRendered}
    />
  );
});

// 虚拟列表工具函数
export const virtualListUtils = {
  // 计算可见项范围
  calculateVisibleRange: (scrollTop, containerHeight, itemHeight, itemCount) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      Math.ceil((scrollTop + containerHeight) / itemHeight),
      itemCount - 1
    );
    return { start: Math.max(0, startIndex), end: endIndex };
  },

  // 计算滚动位置
  calculateScrollPosition: (index, itemHeight, containerHeight) => {
    return index * itemHeight;
  },

  // 检查项是否可见
  isItemVisible: (index, scrollTop, containerHeight, itemHeight) => {
    const itemTop = index * itemHeight;
    const itemBottom = itemTop + itemHeight;
    return itemBottom > scrollTop && itemTop < scrollTop + containerHeight;
  }
};