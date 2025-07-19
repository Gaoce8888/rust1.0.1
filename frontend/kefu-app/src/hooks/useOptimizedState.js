/**
 * 优化状态管理Hook
 * 从企业级客服端案例移植的高性能状态管理
 */
import { useRef, useCallback, useMemo, useEffect, useState } from 'react';

// 状态变化检测器
class StateChangeDetector {
  constructor(debounceMs = 50) {
    this.debounceMs = debounceMs;
    this.lastCheck = 0;
    this.cache = new Map();
  }
  
  detectChanges(newState) {
    const now = Date.now();
    const changes = [];
    
    // 防抖处理
    if (now - this.lastCheck < this.debounceMs) {
      return changes;
    }
    
    this.lastCheck = now;
    
    // 检测变化
    if (typeof newState === 'object' && newState !== null) {
      const oldState = this.cache.get('state');
      if (oldState) {
        Object.keys(newState).forEach(key => {
          if (newState[key] !== oldState[key]) {
            changes.push({
              field: key,
              oldValue: oldState[key],
              newValue: newState[key],
              timestamp: now
            });
          }
        });
      }
      this.cache.set('state', { ...newState });
    }
    
    return changes;
  }
}

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