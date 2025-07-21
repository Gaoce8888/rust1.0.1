import { MemoryCache, useDebounce, useThrottle } from '@utils/performance';

/**
 * 优化的API请求服务
 * 包含缓存、去重、优先级管理、重试等功能
 */
class OptimizedApiService {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 10000;
    this.retryCount = options.retryCount || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.cache = new MemoryCache(options.cacheSize || 100);
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.maxConcurrent = options.maxConcurrent || 5;
    this.currentConcurrent = 0;
  }

  /**
   * 生成请求键
   * @param {string} url 请求URL
   * @param {Object} params 请求参数
   * @returns {string} 请求键
   */
  generateRequestKey(url, params = {}) {
    return `${url}:${JSON.stringify(params)}`;
  }

  /**
   * 延迟函数
   * @param {number} ms 延迟时间
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的请求
   * @param {Function} requestFn 请求函数
   * @param {number} retries 重试次数
   * @returns {Promise} 请求结果
   */
  async withRetry(requestFn, retries = this.retryCount) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        
        // 指数退避
        const delay = this.retryDelay * Math.pow(2, i);
        await this.delay(delay);
      }
    }
  }

  /**
   * 处理请求队列
   */
  async processQueue() {
    if (this.currentConcurrent >= this.maxConcurrent || this.requestQueue.length === 0) {
      return;
    }

    const request = this.requestQueue.shift();
    this.currentConcurrent++;

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.currentConcurrent--;
      this.processQueue();
    }
  }

  /**
   * 添加请求到队列
   * @param {Function} execute 执行函数
   * @param {number} priority 优先级
   * @returns {Promise} Promise对象
   */
  async queueRequest(execute, priority = 0) {
    return new Promise((resolve, reject) => {
      const request = { execute, resolve, reject, priority };
      
      // 按优先级插入队列
      const insertIndex = this.requestQueue.findIndex(r => r.priority < priority);
      if (insertIndex === -1) {
        this.requestQueue.push(request);
      } else {
        this.requestQueue.splice(insertIndex, 0, request);
      }
      
      this.processQueue();
    });
  }

  /**
   * 发送GET请求
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  async get(url, options = {}) {
    const {
      params = {},
      cache = true,
      cacheTime = 5 * 60 * 1000, // 5分钟
      priority = 0,
      retry = true,
      timeout = this.timeout,
    } = options;

    const requestKey = this.generateRequestKey(url, params);
    
    // 检查缓存
    if (cache) {
      const cached = this.cache.get(requestKey);
      if (cached) {
        return cached;
      }
    }

    // 检查重复请求
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const requestPromise = this.queueRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = `${this.baseURL}${url}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(fullUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 缓存结果
        if (cache) {
          this.cache.set(requestKey, data, cacheTime);
        }

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, priority);

    this.pendingRequests.set(requestKey, requestPromise);
    
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  /**
   * 发送POST请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  async post(url, data = {}, options = {}) {
    const {
      priority = 0,
      retry = true,
      timeout = this.timeout,
    } = options;

    return this.queueRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(data),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, priority);
  }

  /**
   * 发送PUT请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  async put(url, data = {}, options = {}) {
    const {
      priority = 0,
      retry = true,
      timeout = this.timeout,
    } = options;

    return this.queueRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          method: 'PUT',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(data),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, priority);
  }

  /**
   * 发送DELETE请求
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  async delete(url, options = {}) {
    const {
      priority = 0,
      retry = true,
      timeout = this.timeout,
    } = options;

    return this.queueRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          method: 'DELETE',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, priority);
  }

  /**
   * 清除缓存
   * @param {string} pattern 缓存键模式
   */
  clearCache(pattern = null) {
    if (pattern) {
      // 清除匹配模式的缓存
      const keys = Array.from(this.cache.cache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.cache.delete(key);
        }
      });
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size(),
      maxSize: this.cache.maxSize,
      hitRate: this.cache.hitCount / (this.cache.hitCount + this.cache.missCount) || 0,
    };
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAllRequests() {
    this.pendingRequests.clear();
    this.requestQueue.length = 0;
    this.currentConcurrent = 0;
  }
}

// 创建全局API服务实例
export const apiService = new OptimizedApiService({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:6006',
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
  cacheSize: 100,
  maxConcurrent: 5,
});

/**
 * 优化的API Hook
 * 提供缓存、去重、自动重试等功能
 */
export const useOptimizedApi = (fetcher, deps = [], options = {}) => {
  const {
    cache = true,
    cacheTime = 5 * 60 * 1000,
    retry = true,
    retryCount = 3,
    retryDelay = 1000,
    priority = 0,
    debounce = 0,
    throttle = 0,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  const executeRequest = useCallback(async (force = false) => {
    if (loading && !force) return;

    // 检查缓存
    if (cache && !force) {
      const cacheKey = JSON.stringify(deps);
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        return;
      }
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(abortControllerRef.current.signal);
      setData(result);

      // 缓存结果
      if (cache) {
        const cacheKey = JSON.stringify(deps);
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      setRetryCount(0);
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // 请求被取消
      }

      setError(err);

      // 重试逻辑
      if (retry && retryCount < retryCount) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          executeRequest(true);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, deps, cache, cacheTime, retry, retryCount, retryDelay, loading]);

  // 防抖处理
  const debouncedExecute = useDebounce(executeRequest, debounce);
  
  // 节流处理
  const throttledExecute = useThrottle(executeRequest, throttle);

  const refetch = useCallback(() => {
    executeRequest(true);
  }, [executeRequest]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    if (debounce > 0) {
      debouncedExecute();
    } else if (throttle > 0) {
      throttledExecute();
    } else {
      executeRequest();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, deps);

  return {
    data,
    loading,
    error,
    retryCount,
    refetch,
    cancel,
  };
};

/**
 * 批量请求Hook
 * 用于同时发送多个请求
 */
export const useBatchApi = (requests = [], options = {}) => {
  const {
    parallel = true,
    maxConcurrent = 5,
    retry = true,
    retryCount = 3,
  } = options;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let results;
      
      if (parallel) {
        // 并行执行
        results = await Promise.allSettled(requests.map(req => req()));
      } else {
        // 串行执行
        results = [];
        for (const req of requests) {
          try {
            const result = await req();
            results.push({ status: 'fulfilled', value: result });
          } catch (err) {
            results.push({ status: 'rejected', reason: err });
          }
        }
      }

      setResults(results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [requests, parallel]);

  useEffect(() => {
    if (requests.length > 0) {
      executeBatch();
    }
  }, [executeBatch]);

  return {
    results,
    loading,
    error,
    refetch: executeBatch,
  };
};