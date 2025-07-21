/**
 * 内存优化Hook
 * 用于防止内存泄漏和优化性能
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * 清理Hook - 自动清理副作用
 * @param {Function} cleanupFn - 清理函数
 * @param {Array} deps - 依赖数组
 */
export const useCleanup = (cleanupFn, deps = []) => {
  const cleanupRef = useRef(cleanupFn);
  cleanupRef.current = cleanupFn;

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, deps);
};

/**
 * 防抖Hook - 防止频繁调用
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间(ms)
 * @param {Array} deps - 依赖数组
 */
export const useDebounce = (callback, delay, deps = []) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * 节流Hook - 限制调用频率
 * @param {Function} callback - 回调函数
 * @param {number} limit - 限制时间(ms)
 */
export const useThrottle = (callback, limit) => {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const throttledCallback = useCallback((...args) => {
    if (!inThrottle.current) {
      callbackRef.current(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [limit]);

  return throttledCallback;
};

/**
 * 安全的状态更新Hook
 * @param {*} initialState - 初始状态
 */
export const useSafeState = (initialState) => {
  const [state, setState] = React.useState(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState) => {
    if (mountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, safeSetState];
};

/**
 * 内存监控Hook
 * @param {string} componentName - 组件名称
 */
export const useMemoryMonitor = (componentName) => {
  const renderCountRef = useRef(0);
  const memoryRef = useRef(new Map());

  useEffect(() => {
    renderCountRef.current++;
    
    // 记录内存使用情况
    if (performance.memory) {
      const memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      memoryRef.current.set(renderCountRef.current, memory);
      
      // 保留最近10次记录
      if (memoryRef.current.size > 10) {
        const firstKey = memoryRef.current.keys().next().value;
        memoryRef.current.delete(firstKey);
      }
      
      // 内存使用警告
      if (memory.used > memory.limit * 0.8) {
        console.warn(`⚠️ 内存使用过高 (${componentName}):`, {
          used: `${(memory.used / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memory.total / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memory.limit / 1024 / 1024).toFixed(2)}MB`,
          renderCount: renderCountRef.current
        });
      }
    }
  });

  const getMemoryStats = useCallback(() => {
    const records = Array.from(memoryRef.current.values());
    if (records.length === 0) return null;

    const latest = records[records.length - 1];
    const growth = records.length > 1 
      ? latest.used - records[0].used 
      : 0;

    return {
      currentUsed: latest.used,
      memoryGrowth: growth,
      renderCount: renderCountRef.current,
      records
    };
  }, []);

  return { getMemoryStats };
};

/**
 * 列表优化Hook - 虚拟滚动支持
 * @param {Array} items - 列表项
 * @param {number} itemHeight - 项目高度
 * @param {number} containerHeight - 容器高度
 */
export const useVirtualList = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useThrottle((e) => {
    setScrollTop(e.target.scrollTop);
  }, 16); // 60fps

  return {
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll
  };
};

export default {
  useCleanup,
  useDebounce,
  useThrottle,
  useSafeState,
  useMemoryMonitor,
  useVirtualList
};