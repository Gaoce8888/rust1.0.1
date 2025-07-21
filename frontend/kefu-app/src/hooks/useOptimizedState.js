/**
 * 优化状态管理Hook
 * 从企业级客服端案例移植的高性能状态管理
 */
import { useReducer, useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * 优化的状态管理Hook - 使用useReducer管理复杂状态
 * @param {Function} reducer 状态更新函数
 * @param {any} initialState 初始状态
 * @param {Function} init 初始化函数
 * @returns {Array} [state, dispatch, actions]
 */
export const useOptimizedReducer = (reducer, initialState, init) => {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  
  // 缓存actions以避免重复创建
  const actionsRef = useRef(new Map());
  
  const createAction = useCallback((type, payloadCreator) => {
    if (!actionsRef.current.has(type)) {
      actionsRef.current.set(type, (payload) => {
        const action = { type };
        if (payloadCreator) {
          action.payload = payloadCreator(payload);
        } else if (payload !== undefined) {
          action.payload = payload;
        }
        dispatch(action);
      });
    }
    return actionsRef.current.get(type);
  }, []);
  
  return [state, dispatch, createAction];
};

/**
 * 防抖状态Hook
 * @param {any} initialValue 初始值
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Array} [value, setValue, debouncedValue]
 */
export const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);
  
  return [value, setValue, debouncedValue];
};

/**
 * 节流状态Hook
 * @param {any} initialValue 初始值
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Array} [value, setValue, throttledValue]
 */
export const useThrottledState = (initialValue, delay = 100) => {
  const [value, setValue] = useState(initialValue);
  const [throttledValue, setThrottledValue] = useState(initialValue);
  const lastUpdateRef = useRef(0);
  
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= delay) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    }
  }, [value, delay]);
  
  return [value, setValue, throttledValue];
};

/**
 * 优化的列表状态Hook
 * @param {Array} initialItems 初始列表
 * @returns {Object} 列表操作方法
 */
export const useOptimizedList = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  
  const addItem = useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);
  
  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const updateItem = useCallback((index, updater) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? (typeof updater === 'function' ? updater(item) : updater) : item
    ));
  }, []);
  
  const clearItems = useCallback(() => {
    setItems([]);
  }, []);
  
  const sortItems = useCallback((comparator) => {
    setItems(prev => [...prev].sort(comparator));
  }, []);
  
  const filterItems = useCallback((predicate) => {
    setItems(prev => prev.filter(predicate));
  }, []);
  
  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    sortItems,
    filterItems,
    setItems,
  };
};

/**
 * 优化的表单状态Hook
 * @param {Object} initialValues 初始表单值
 * @param {Object} validationSchema 验证规则
 * @returns {Object} 表单状态和方法
 */
export const useOptimizedForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);
  
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);
  
  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);
  
  const validateField = useCallback((name, value) => {
    const validator = validationSchema[name];
    if (validator) {
      const error = validator(value, values);
      setFieldError(name, error);
      return error;
    }
    return null;
  }, [validationSchema, values, setFieldError]);
  
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [validationSchema, values, validateField]);
  
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  const handleSubmit = useCallback(async (onSubmit) => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    handleSubmit,
  };
};

/**
 * 优化的异步数据Hook
 * @param {Function} fetcher 数据获取函数
 * @param {Array} deps 依赖数组
 * @param {Object} options 配置选项
 * @returns {Object} 异步数据状态
 */
export const useOptimizedAsync = (fetcher, deps = [], options = {}) => {
  const {
    initialData = null,
    cacheKey = null,
    cacheTime = 5 * 60 * 1000, // 5分钟
    retryCount = 3,
    retryDelay = 1000,
  } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const cacheRef = useRef(new Map());
  
  const fetchData = useCallback(async (force = false) => {
    if (loading && !force) return;
    
    // 检查缓存
    if (cacheKey && !force) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setData(result);
      
      // 缓存结果
      if (cacheKey) {
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
      
      setRetryCount(0);
    } catch (err) {
      setError(err);
      
      // 重试逻辑
      if (retryCount < retryCount) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData(true);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, cacheKey, cacheTime, retryCount, retryDelay, loading]);
  
  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);
  
  const clearCache = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [cacheKey]);
  
  useEffect(() => {
    fetchData();
  }, deps);
  
  return {
    data,
    loading,
    error,
    retryCount,
    refetch,
    clearCache,
  };
};

/**
 * 优化的本地存储Hook
 * @param {string} key 存储键
 * @param {any} initialValue 初始值
 * @param {Object} options 配置选项
 * @returns {Array} [value, setValue, removeValue]
 */
export const useOptimizedStorage = (key, initialValue, options = {}) => {
  const {
    storage = localStorage,
    serializer = JSON,
    deserializer = JSON,
  } = options;
  
  const [value, setValue] = useState(() => {
    try {
      const item = storage.getItem(key);
      return item ? deserializer.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      storage.setItem(key, serializer.stringify(newValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storage, serializer]);
  
  const removeStoredValue = useCallback(() => {
    try {
      setValue(initialValue);
      storage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, storage, initialValue]);
  
  return [value, setStoredValue, removeStoredValue];
};

// 计算用户差异
export const calculateUserDiffs = (prevUsers, newUsers) => {
  const prevMap = new Map(prevUsers.map(user => [user.user_id, user]));
  const newMap = new Map(newUsers.map(user => [user.user_id, user]));
  
  const added = [];
  const modified = [];
  const removed = [];
  
  // 检查新增和修改
  newUsers.forEach(user => {
    const prevUser = prevMap.get(user.user_id);
    if (!prevUser) {
      added.push(user);
    } else {
      // 检查是否有变化
      const hasChanges = Object.keys(user).some(key => 
        user[key] !== prevUser[key]
      );
      if (hasChanges) {
        modified.push({ old: prevUser, new: user });
      }
    }
  });
  
  // 检查删除
  prevUsers.forEach(user => {
    if (!newMap.has(user.user_id)) {
      removed.push(user);
    }
  });
  
  return { added, modified, removed };
};

// 优化的用户状态管理
export const useOptimizedUserState = (initialUsers = []) => {
  const [onlineUsers, setOnlineUsers] = useState(initialUsers);
  const detectorRef = useRef(new StateChangeDetector(50));
  const previousUsersRef = useRef([]);
  
  // 细粒度用户更新
  const updateUsersOptimized = useCallback((newUsers) => {
    const diffs = calculateUserDiffs(previousUsersRef.current, newUsers);
    
    if (diffs.added.length > 0 || diffs.modified.length > 0 || diffs.removed.length > 0) {
      setOnlineUsers(newUsers);
      previousUsersRef.current = [...newUsers];
      
      return {
        hasChanges: true,
        added: diffs.added,
        modified: diffs.modified,
        removed: diffs.removed,
        summary: {
          addedCount: diffs.added.length,
          modifiedCount: diffs.modified.length,
          removedCount: diffs.removed.length
        }
      };
    }
    
    return { hasChanges: false, added: [], modified: [], removed: [], summary: null };
  }, []);
  
  // 单个用户状态更新
  const updateSingleUser = useCallback((updatedUser) => {
    const currentUsers = [...onlineUsers];
    const userIndex = currentUsers.findIndex(u => u.user_id === updatedUser.user_id);
    
    if (userIndex >= 0) {
      const oldUser = currentUsers[userIndex];
      const changes = detectorRef.current.detectChanges(updatedUser);
      
      if (changes.length > 0) {
        currentUsers[userIndex] = updatedUser;
        setOnlineUsers(currentUsers);
        
        return {
          type: 'modified',
          user: updatedUser,
          changes,
          previousUser: oldUser
        };
      }
    } else {
      currentUsers.push(updatedUser);
      setOnlineUsers(currentUsers);
      
      return {
        type: 'added',
        user: updatedUser,
        changes: [],
        previousUser: null
      };
    }
    
    return null;
  }, [onlineUsers]);
  
  // 批量状态更新
  const batchUpdateUsers = useCallback((userUpdates) => {
    const currentUsers = [...onlineUsers];
    const modifiedUsers = [];
    let hasChanges = false;
    
    for (const { user_id, updates } of userUpdates) {
      const userIndex = currentUsers.findIndex(u => u.user_id === user_id);
      if (userIndex >= 0) {
        const oldUser = currentUsers[userIndex];
        const newUser = { ...oldUser, ...updates };
        
        const changes = detectorRef.current.detectChanges(newUser);
        if (changes.length > 0) {
          currentUsers[userIndex] = newUser;
          modifiedUsers.push({ user: newUser, changes });
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      setOnlineUsers(currentUsers);
    }
    
    return {
      hasChanges,
      modifiedUsers,
      totalUpdates: userUpdates.length,
      successfulUpdates: modifiedUsers.length
    };
  }, [onlineUsers]);
  
  return {
    users: onlineUsers,
    updateUsersOptimized,
    updateSingleUser,
    batchUpdateUsers,
    getUserById: useCallback((userId) => 
      onlineUsers.find(u => u.user_id === userId), [onlineUsers]
    ),
    getUsersCount: onlineUsers.length
  };
};

// 性能监控Hook
export const usePerformanceMonitor = () => {
  const renderCountRef = useRef(0);
  const updateCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  
  const recordRender = useCallback(() => {
    renderCountRef.current += 1;
  }, []);
  
  const recordUpdate = useCallback(() => {
    updateCountRef.current += 1;
    lastUpdateTimeRef.current = Date.now();
  }, []);
  
  const getMetrics = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    return {
      renderCount: renderCountRef.current,
      updateCount: updateCountRef.current,
      timeSinceLastUpdate,
      lastUpdateTime: lastUpdateTimeRef.current,
      averageUpdateInterval: updateCountRef.current > 0 ? 
        (now - lastUpdateTimeRef.current) / updateCountRef.current : 0
    };
  }, []);
  
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    updateCountRef.current = 0;
    lastUpdateTimeRef.current = Date.now();
  }, []);
  
  return {
    recordRender,
    recordUpdate,
    getMetrics,
    resetMetrics
  };
};

// 智能缓存Hook
export const useSmartCache = (
  key,
  computation,
  dependencies,
  cacheTime = 5000 // 5秒缓存
) => {
  const cacheRef = useRef(new Map());
  
  const cachedValue = useMemo(() => {
    const cache = cacheRef.current;
    const cached = cache.get(key);
    const now = Date.now();
    
    // 检查缓存是否有效
    if (cached && (now - cached.timestamp) < cacheTime) {
      return cached.value;
    }
    
    // 计算新值
    const newValue = computation();
    cache.set(key, { value: newValue, timestamp: now });
    
    // 清理过期缓存
    for (const [cacheKey, cacheEntry] of cache.entries()) {
      if ((now - cacheEntry.timestamp) >= cacheTime) {
        cache.delete(cacheKey);
      }
    }
    
    return newValue;
  }, [key, cacheTime, ...dependencies]);
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  const invalidateKey = useCallback((targetKey) => {
    cacheRef.current.delete(targetKey);
  }, []);
  
  return {
    value: cachedValue,
    clearCache,
    invalidateKey,
    cacheSize: cacheRef.current.size
  };
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
export const useThrottle = (value, interval) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(0);

  useEffect(() => {
    const now = Date.now();
    
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
};

// 虚拟滚动Hook
export const useVirtualScroll = (itemCount, options) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const result = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleEndIndex = Math.min(
      itemCount - 1,
      visibleStartIndex + visibleCount + overscan * 2
    );

    return {
      visibleStartIndex,
      visibleEndIndex,
      totalHeight: itemCount * itemHeight,
      offsetY: visibleStartIndex * itemHeight
    };
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan]);

  return [result, setScrollTop];
};

// 组合Hook：完整的优化状态管理
export const useOptimizedAppState = (initialUsers = []) => {
  const userState = useOptimizedUserState(initialUsers);
  const performance = usePerformanceMonitor();
  
  // 记录每次状态变化
  useEffect(() => {
    performance.recordUpdate();
  }, [userState.users, performance]);
  
  return {
    users: userState,
    performance,
    
    // 组合操作
    refreshAll: useCallback(() => {
      performance.recordUpdate();
    }, [performance])
  };
};