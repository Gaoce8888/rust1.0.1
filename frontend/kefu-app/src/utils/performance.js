/**
 * 性能优化工具
 */

import React from 'react';

// 防抖Hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
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
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRun = React.useRef(Date.now());

  React.useEffect(() => {
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

// 虚拟滚动Hook
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    containerRef,
  };
};

// 图片懒加载Hook
export const useLazyImage = (src, placeholder = '') => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
      setError(false);
    };

    img.onerror = () => {
      setImageSrc(placeholder);
      setLoading(false);
      setError(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholder]);

  return { imageSrc, loading, error };
};

// 内存泄漏防护Hook
export const useCleanup = (cleanupFn) => {
  React.useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// 定时器管理Hook
export const useInterval = (callback, delay) => {
  const savedCallback = React.useRef();

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// 事件监听器管理Hook
export const useEventListener = (eventName, handler, element = window) => {
  const savedHandler = React.useRef();

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};

// 本地存储Hook
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('读取本地存储失败:', error);
      return initialValue;
    }
  });

  const setValue = React.useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('写入本地存储失败:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// 会话存储Hook
export const useSessionStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('读取会话存储失败:', error);
      return initialValue;
    }
  });

  const setValue = React.useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('写入会话存储失败:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// 网络状态Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// 媒体查询Hook
export const useMediaQuery = (query) => {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

// 窗口尺寸Hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// 滚动位置Hook
export const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset,
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollPosition;
};

// 性能优化的memo组件
export const memo = React.memo;

// 性能优化的回调Hook
export const useCallback = React.useCallback;

// 性能优化的值Hook
export const useMemo = React.useMemo;

// 批量更新Hook
export const useBatchUpdate = () => {
  const [updates, setUpdates] = React.useState([]);
  const batchRef = React.useRef([]);

  const addUpdate = React.useCallback((update) => {
    batchRef.current.push(update);
  }, []);

  const flushUpdates = React.useCallback(() => {
    if (batchRef.current.length > 0) {
      setUpdates(batchRef.current);
      batchRef.current = [];
    }
  }, []);

  React.useEffect(() => {
    const interval = setInterval(flushUpdates, 16); // 60fps
    return () => clearInterval(interval);
  }, [flushUpdates]);

  return { addUpdate, flushUpdates, updates };
};

// 资源预加载Hook
export const usePreload = (resources) => {
  React.useEffect(() => {
    if (!Array.isArray(resources)) return;

    resources.forEach((resource) => {
      if (resource.type === 'image') {
        const img = new Image();
        img.src = resource.src;
      } else if (resource.type === 'script') {
        const script = document.createElement('script');
        script.src = resource.src;
        script.async = true;
        document.head.appendChild(script);
      } else if (resource.type === 'style') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resource.src;
        document.head.appendChild(link);
      }
    });
  }, [resources]);
};

// 组件渲染性能监控
export const withPerformanceMonitoring = (Component, componentName) => {
  return React.memo((props) => {
    const renderCount = React.useRef(0);
    const startTime = React.useRef(performance.now());

    React.useEffect(() => {
      renderCount.current += 1;
      const endTime = performance.now();
      const duration = endTime - startTime.current;

      console.log(`组件 ${componentName} 渲染:`, {
        renderCount: renderCount.current,
        duration: `${duration.toFixed(2)}ms`,
        props: Object.keys(props),
      });

      startTime.current = performance.now();
    });

    // 注意：这个函数需要在React组件中使用，这里只是返回一个函数
    // 实际的JSX渲染应该在组件中进行
    return function renderComponent() {
      return Component(props);
    };
  });
};