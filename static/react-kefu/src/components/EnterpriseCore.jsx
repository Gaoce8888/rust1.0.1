import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// 高性能虚拟化列表组件
export const VirtualizedList = React.memo(({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  overscan = 5,
  onScroll,
  className = ""
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    return { start: Math.max(0, start - overscan), end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  // 总高度
  const totalHeight = items.length * itemHeight;
  
  // 偏移量
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(e);
  }, [onScroll]);

  return (
    <div 
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item) => (
            <div key={item.id || item.index} style={{ height: itemHeight }}>
              {renderItem(item, item.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// 高性能消息渲染组件
export const OptimizedMessageRenderer = React.memo(({ 
  message, 
  onRender,
  priority = 'normal' 
}) => {
  const messageRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onRender?.(message);
        }
      },
      { threshold: 0.1 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => observer.disconnect();
  }, [message, onRender]);

  // 根据优先级决定渲染策略
  const shouldRender = priority === 'high' || isVisible;

  if (!shouldRender) {
    return (
      <div ref={messageRef} className="message-placeholder" style={{ height: '60px' }}>
        <div className="skeleton-loader" />
      </div>
    );
  }

  return (
    <div ref={messageRef} className="optimized-message">
      {/* 消息内容渲染 */}
      <div className="message-content">
        {message.content}
      </div>
      <div className="message-meta">
        <span className="message-time">{message.timestamp}</span>
        <span className="message-status">{message.status}</span>
      </div>
    </div>
  );
});

// 内存优化的状态管理器
export class MemoryOptimizedStore {
  constructor(maxSize = 1000) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  set(key, value) {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.store.delete(oldestKey);
    }

    this.store.set(key, value);
    this.updateAccessOrder(key);
  }

  get(key) {
    const value = this.store.get(key);
    if (value !== undefined) {
      this.updateAccessOrder(key);
    }
    return value;
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  clear() {
    this.store.clear();
    this.accessOrder = [];
  }
}

// 高性能缓存Hook
export const useOptimizedCache = (maxSize = 100) => {
  const cacheRef = useRef(new MemoryOptimizedStore(maxSize));

  const getCached = useCallback((key) => {
    return cacheRef.current.get(key);
  }, []);

  const setCached = useCallback((key, value) => {
    cacheRef.current.set(key, value);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { getCached, setCached, clearCache };
};

// 防抖Hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 节流Hook
export const useThrottle = (value, delay) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};

// 高性能Portal组件
export const OptimizedPortal = React.memo(({ children, container }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, container || document.body);
});

// 性能监控组件
export const PerformanceMonitor = React.memo(({ 
  componentName, 
  onPerformanceReport,
  children 
}) => {
  const startTime = useRef(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    renderCount.current += 1;

    onPerformanceReport?.({
      componentName,
      renderTime,
      renderCount: renderCount.current,
      timestamp: new Date().toISOString()
    });

    startTime.current = performance.now();
  });

  return <>{children}</>;
});

// 懒加载组件
export const LazyComponent = React.memo(({ 
  component: Component, 
  fallback = <div>Loading...</div>,
  ...props 
}) => {
  const [ComponentState, setComponentState] = useState(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const loadedComponent = await Component();
        setComponentState(loadedComponent);
      } catch (error) {
        console.error('Failed to load component:', error);
      }
    };

    loadComponent();
  }, [Component]);

  if (!ComponentState) {
    return fallback;
  }

  return <ComponentState.default {...props} />;
});

// 错误边界组件
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 高性能上下文提供者
export const OptimizedContextProvider = React.memo(({ 
  context, 
  value, 
  children 
}) => {
  const memoizedValue = useMemo(() => value, [value]);
  
  return (
    <context.Provider value={memoizedValue}>
      {children}
    </context.Provider>
  );
});

// 导出所有组件
export default {
  VirtualizedList,
  OptimizedMessageRenderer,
  MemoryOptimizedStore,
  useOptimizedCache,
  useDebounce,
  useThrottle,
  OptimizedPortal,
  PerformanceMonitor,
  LazyComponent,
  ErrorBoundary,
  OptimizedContextProvider
};