/**
 * 优化状态管理Hook
 * 从企业级客服端案例移植的高性能状态管理
 */
import { useReducer, useCallback, useMemo, useRef, useEffect, useState } from 'react';

// 优化的useReducer Hook
export const useOptimizedReducer = (reducer, initialState, init) => {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  
  const optimizedDispatch = useCallback(dispatch, []);
  
  return [state, optimizedDispatch];
};

// 防抖状态Hook
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

// 节流状态Hook
export const useThrottledState = (initialValue, delay = 100) => {
  const [value, setValue] = useState(initialValue);
  const [throttledValue, setThrottledValue] = useState(initialValue);
  const lastUpdateRef = useRef(0);

  const setThrottledValueCallback = useCallback((newValue) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= delay) {
      setThrottledValue(newValue);
      lastUpdateRef.current = now;
    }
  }, [delay]);

  useEffect(() => {
    setThrottledValueCallback(value);
  }, [value, setThrottledValueCallback]);

  return [value, setValue, throttledValue];
};

// 优化的列表状态Hook
export const useOptimizedList = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // 过滤和排序的缓存结果
  const processedItems = useMemo(() => {
    let result = [...items];

    // 应用过滤器
    if (Object.keys(filters).length > 0) {
      result = result.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return item[key]?.toString().toLowerCase().includes(value.toLowerCase());
        });
      });
    }

    // 应用排序
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, filters, sortBy, sortDirection]);

  const addItem = useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items: processedItems,
    originalItems: items,
    filters,
    sortBy,
    sortDirection,
    setFilters,
    setSortBy,
    setSortDirection,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    setItems
  };
};

// 优化的表单状态Hook
export const useOptimizedForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 验证函数
  const validate = useCallback((fieldValues = values) => {
    const newErrors = {};
    
    Object.keys(validationSchema).forEach(field => {
      const value = fieldValues[field];
      const rules = validationSchema[field];
      
      if (rules.required && !value) {
        newErrors[field] = rules.required;
      } else if (rules.pattern && !rules.pattern.test(value)) {
        newErrors[field] = rules.pattern.message;
      } else if (rules.minLength && value.length < rules.minLength) {
        newErrors[field] = `最少需要 ${rules.minLength} 个字符`;
      } else if (rules.maxLength && value.length > rules.maxLength) {
        newErrors[field] = `最多允许 ${rules.maxLength} 个字符`;
      }
    });
    
    return newErrors;
  }, [values, validationSchema]);

  // 设置字段值
  const setFieldValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // 如果字段已被触摸，立即验证
    if (touched[field]) {
      const fieldErrors = validate({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [touched, validate]);

  // 设置字段触摸状态
  const setFieldTouched = useCallback((field, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
    
    if (isTouched) {
      const fieldErrors = validate({ [field]: values[field] });
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [values, validate]);

  // 提交表单
  const handleSubmit = useCallback(async (onSubmit) => {
    const formErrors = validate();
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validate]);

  // 重置表单
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
    setTouched
  };
};

// 优化的异步数据Hook
export const useOptimizedAsync = (fetcher, deps = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const {
    immediate = true,
    cacheTime = 60000, // 1分钟缓存
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const execute = useCallback(async (...args) => {
    // 检查缓存
    const now = Date.now();
    if (cacheTime > 0 && lastFetchTime > 0 && (now - lastFetchTime) < cacheTime) {
      return data;
    }

    setLoading(true);
    setError(null);

    let lastError;
    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await fetcher(...args);
        setData(result);
        setLastFetchTime(now);
        setLoading(false);
        return result;
      } catch (err) {
        lastError = err;
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }

    setError(lastError);
    setLoading(false);
    throw lastError;
  }, [fetcher, cacheTime, lastFetchTime, data, retryCount, retryDelay]);

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

// 优化的本地存储Hook
export const useOptimizedStorage = (key, initialValue, options = {}) => {
  const {
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError = console.error
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = storage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      onError(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.setItem(key, serialize(valueToStore));
    } catch (error) {
      onError(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, storage, serialize, onError]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      storage.removeItem(key);
    } catch (error) {
      onError(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storage, onError]);

  return [storedValue, setValue, removeValue];
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