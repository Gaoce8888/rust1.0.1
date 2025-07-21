import { debounce, throttle } from 'lodash.debounce';

/**
 * 防抖函数 - 用于搜索、输入等场景
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @param {Object} options 配置选项
 * @returns {Function} 防抖后的函数
 */
export const useDebounce = (func, wait = 300, options = {}) => {
  return debounce(func, wait, {
    leading: false,
    trailing: true,
    ...options,
  });
};

/**
 * 节流函数 - 用于滚动、拖拽等场景
 * @param {Function} func 要节流的函数
 * @param {number} wait 等待时间（毫秒）
 * @param {Object} options 配置选项
 * @returns {Function} 节流后的函数
 */
export const useThrottle = (func, wait = 100, options = {}) => {
  return throttle(func, wait, {
    leading: true,
    trailing: true,
    ...options,
  });
};

/**
 * 内存缓存类
 */
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
      ttl,
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

/**
 * 图片懒加载工具
 * @param {string} src 图片源地址
 * @param {string} placeholder 占位图片
 * @returns {Promise<string>} 加载完成的图片地址
 */
export const lazyLoadImage = (src, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWE5YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    
    img.src = src;
  });
};

/**
 * 批量更新优化
 * @param {Function} updater 更新函数
 * @param {number} delay 延迟时间（毫秒）
 */
export const batchUpdate = (updater, delay = 16) => {
  let timeoutId = null;
  
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      updater(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  /**
   * 开始计时
   * @param {string} name 指标名称
   */
  startTimer(name) {
    this.metrics.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  }

  /**
   * 结束计时
   * @param {string} name 指标名称
   * @returns {number} 持续时间（毫秒）
   */
  endTimer(name) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Timer "${name}" not found`);
      return 0;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    return metric.duration;
  }

  /**
   * 获取指标
   * @param {string} name 指标名称
   * @returns {Object} 指标数据
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * 获取所有指标
   * @returns {Object} 所有指标数据
   */
  getAllMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = metric;
    }
    return result;
  }

  /**
   * 清除指标
   * @param {string} name 指标名称
   */
  clearMetric(name) {
    this.metrics.delete(name);
  }

  /**
   * 清除所有指标
   */
  clearAllMetrics() {
    this.metrics.clear();
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能装饰器 - 用于测量函数执行时间
 * @param {string} name 性能指标名称
 * @returns {Function} 装饰器函数
 */
export const measurePerformance = (name) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      performanceMonitor.startTimer(name);
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.endTimer(name);
        });
      } else {
        performanceMonitor.endTimer(name);
        return result;
      }
    };

    return descriptor;
  };
};

/**
 * 检查是否在视口内
 * @param {Element} element DOM元素
 * @returns {boolean} 是否在视口内
 */
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

/**
 * 创建Intersection Observer
 * @param {Function} callback 回调函数
 * @param {Object} options 配置选项
 * @returns {IntersectionObserver} Intersection Observer实例
 */
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};