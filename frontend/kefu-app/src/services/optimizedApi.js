import { MemoryCache, useDebounce, useThrottle } from '@utils/performance';

// 优化的API服务类
class OptimizedApiService {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = options.defaultHeaders || {};
    this.cache = new MemoryCache(options.cacheSize || 100);
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.maxConcurrent = options.maxConcurrent || 6;
    this.activeRequests = 0;
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      retryBackoff: options.retryBackoff || 2,
      ...options.retryConfig
    };
  }

  // 创建请求键
  createRequestKey(method, url, params, data) {
    const key = `${method}:${url}`;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${key}:${paramsStr}:${dataStr}`;
  }

  // 检查缓存
  getCachedResponse(key) {
    return this.cache.get(key);
  }

  // 设置缓存
  setCachedResponse(key, response, ttl = 60000) {
    this.cache.set(key, response, ttl);
  }

  // 请求去重
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }

  // 设置待处理请求
  setPendingRequest(key, promise) {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  // 队列管理
  addToQueue(request) {
    this.requestQueue.push(request);
    this.processQueue();
  }

  // 处理队列
  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.requestQueue.length === 0) {
      return;
    }

    const request = this.requestQueue.shift();
    this.activeRequests++;

    try {
      await request();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  // 重试机制
  async retryRequest(requestFn, retryCount = 0) {
    try {
      return await requestFn();
    } catch (error) {
      if (retryCount < this.retryConfig.maxRetries && this.shouldRetry(error)) {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryBackoff, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(requestFn, retryCount + 1);
      }
      throw error;
    }
  }

  // 判断是否应该重试
  shouldRetry(error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || error.code === 'NETWORK_ERROR';
  }

  // 构建请求URL
  buildURL(url, params) {
    if (!params || Object.keys(params).length === 0) {
      return this.baseURL + url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });

    const queryString = searchParams.toString();
    return `${this.baseURL}${url}${queryString ? '?' + queryString : ''}`;
  }

  // 构建请求配置
  buildRequestConfig(method, data, headers = {}) {
    const config = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...headers
      }
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    return config;
  }

  // 执行请求
  async executeRequest(method, url, data = null, params = null, options = {}) {
    const requestKey = this.createRequestKey(method, url, params, data);
    const { cache = true, ttl = 60000, priority = 'normal', ...requestOptions } = options;

    // 检查缓存
    if (cache && method === 'GET') {
      const cached = this.getCachedResponse(requestKey);
      if (cached) {
        return cached;
      }
    }

    // 检查重复请求
    const pending = this.getPendingRequest(requestKey);
    if (pending) {
      return pending;
    }

    // 创建请求函数
    const requestFn = async () => {
      const fullURL = this.buildURL(url, params);
      const config = this.buildRequestConfig(method, data, requestOptions.headers);

      const response = await fetch(fullURL, config);
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      const result = await response.json();

      // 缓存响应
      if (cache && method === 'GET') {
        this.setCachedResponse(requestKey, result, ttl);
      }

      return result;
    };

    // 创建请求Promise
    const requestPromise = this.retryRequest(requestFn);

    // 设置待处理请求
    this.setPendingRequest(requestKey, requestPromise);

    // 根据优先级处理请求
    if (priority === 'high') {
      return requestPromise;
    } else {
      return new Promise((resolve, reject) => {
        this.addToQueue(async () => {
          try {
            const result = await requestPromise;
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }

  // GET请求
  async get(url, params = null, options = {}) {
    return this.executeRequest('GET', url, null, params, options);
  }

  // POST请求
  async post(url, data = null, options = {}) {
    return this.executeRequest('POST', url, data, null, options);
  }

  // PUT请求
  async put(url, data = null, options = {}) {
    return this.executeRequest('PUT', url, data, null, options);
  }

  // DELETE请求
  async delete(url, options = {}) {
    return this.executeRequest('DELETE', url, null, null, options);
  }

  // PATCH请求
  async patch(url, data = null, options = {}) {
    return this.executeRequest('PATCH', url, data, null, options);
  }

  // 批量请求
  async batch(requests, options = {}) {
    const { concurrency = 3, ...batchOptions } = options;
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(request => 
        this.executeRequest(request.method, request.url, request.data, request.params, {
          ...batchOptions,
          ...request.options
        }).catch(error => {
          errors.push({ index: i, error, request });
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return { results, errors };
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      size: this.cache.size(),
      pendingRequests: this.pendingRequests.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length
    };
  }
}

// 创建API服务实例
export const apiService = new OptimizedApiService({
  baseURL: process.env.REACT_APP_API_BASE_URL || '',
  maxConcurrent: 6,
  cacheSize: 100,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 2
  }
});

// 优化的API Hook
export const useOptimizedApi = (fetcher, deps = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const {
    immediate = true,
    cacheTime = 60000,
    retryCount = 3,
    retryDelay = 1000,
    cache = true,
    priority = 'normal'
  } = options;

  const execute = useCallback(async (...args) => {
    // 检查缓存
    const now = Date.now();
    if (cache && cacheTime > 0 && lastFetchTime > 0 && (now - lastFetchTime) < cacheTime) {
      return data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(...args);
      setData(result);
      setLastFetchTime(now);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetcher, cache, cacheTime, lastFetchTime, data]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...deps]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute
  };
};

// 批量API Hook
export const useBatchApi = (requests = [], options = {}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const execute = useCallback(async () => {
    if (requests.length === 0) return;

    setLoading(true);
    setErrors([]);

    try {
      const { results: batchResults, errors: batchErrors } = await apiService.batch(requests, options);
      setResults(batchResults);
      setErrors(batchErrors);
      return { results: batchResults, errors: batchErrors };
    } catch (error) {
      setErrors([{ error }]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [requests, options]);

  return {
    results,
    loading,
    errors,
    execute
  };
};

// 导入React hooks
import { useState, useCallback, useEffect } from 'react';