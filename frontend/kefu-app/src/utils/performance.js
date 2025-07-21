import { debounce, throttle } from 'lodash.debounce';

// 防抖Hook
export const useDebounce = (func, wait = 300, options = {}) => {
  return useCallback(
    debounce(func, wait, options),
    [func, wait]
  );
};

// 节流Hook
export const useThrottle = (func, wait = 100, options = {}) => {
  return useCallback(
    throttle(func, wait, options),
    [func, wait]
  );
};

// 内存缓存类
export class MemoryCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value, ttl = 60000) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// 图片懒加载
export const lazyLoadImage = (src, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YWFhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+') => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(placeholder);
    img.src = src;
  });
};

// 批量更新
export const batchUpdate = (updater, delay = 16) => {
  let timeoutId = null;
  let pendingUpdates = [];
  
  return (...args) => {
    pendingUpdates.push(args);
    
    if (timeoutId) return;
    
    timeoutId = setTimeout(() => {
      updater(pendingUpdates);
      pendingUpdates = [];
      timeoutId = null;
    }, delay);
  };
};

// 性能监控类
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
    this.metrics = new Map();
  }

  startTimer(name) {
    this.marks.set(name, performance.now());
  }

  endTimer(name) {
    const startTime = this.marks.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.measures.set(name, duration);
      this.marks.delete(name);
      return duration;
    }
    return 0;
  }

  measure(name, startMark, endMark) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      this.measures.set(name, measure.duration);
      return measure.duration;
    } catch (error) {
      console.warn('Performance measure failed:', error);
      return 0;
    }
  }

  getMetrics() {
    return Object.fromEntries(this.measures);
  }

  clear() {
    this.marks.clear();
    this.measures.clear();
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// 性能测量装饰器
export const measurePerformance = (name) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args) {
      performanceMonitor.startTimer(name);
      const result = originalMethod.apply(this, args);
      performanceMonitor.endTimer(name);
      return result;
    };
    
    return descriptor;
  };
};

// 视口检测
export const isInViewport = (element) => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

// 创建Intersection Observer
export const createIntersectionObserver = (callback, options = {}) => {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target, entry);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  });
};

// 导入React hooks
import { useCallback } from 'react';