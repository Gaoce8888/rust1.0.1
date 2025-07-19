/**
 * 企业级WebSocket Hook - 高性能实时更新
 * 
 * 特性：
 * - 智能批量更新策略
 * - 差量更新算法
 * - 内存优化和垃圾回收
 * - 自动重连和故障恢复
 * - 性能监控和指标收集
 * - 消息去重和顺序保证
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// 配置常量
const CONFIG = {
  RECONNECT_INTERVAL: 1000,
  MAX_RECONNECT_ATTEMPTS: 10,
  BATCH_UPDATE_INTERVAL: 16,     // 60fps
  BATCH_SIZE: 100,
  HEARTBEAT_INTERVAL: 30000,
  MESSAGE_BUFFER_SIZE: 1000,
  PERFORMANCE_SAMPLE_SIZE: 100,
  DIFF_UPDATE_THRESHOLD: 50,
  MEMORY_CLEANUP_INTERVAL: 60000
};

// 消息类型
const MESSAGE_TYPES = {
  ONLINE_USERS: 'OnlineUsers',
  USER_JOINED: 'UserJoined', 
  USER_LEFT: 'UserLeft',
  USER_STATUS_CHANGE: 'UserStatusChange',
  MESSAGE: 'Chat',
  TYPING: 'Typing',
  REALTIME_STATUS: 'realtime_status_change',
  HEARTBEAT: 'Heartbeat',
  SYSTEM: 'System'
};

// 用户状态管理器
class UserStateManager {
  constructor() {
    this.users = new Map();
    this.pendingUpdates = new Map();
    this.lastUpdateTime = Date.now();
    this.updateQueue = [];
    this.isProcessing = false;
  }

  // 批量更新用户列表
  batchUpdateUsers(users) {
    const startTime = performance.now();
    const changes = { added: [], updated: [], removed: [] };
    const currentUserIds = new Set(this.users.keys());
    const newUserIds = new Set(users.map(u => u.user_id));

    // 处理新增和更新
    for (const user of users) {
      const existing = this.users.get(user.user_id);
      if (!existing) {
        changes.added.push(user);
        this.users.set(user.user_id, { ...user, _lastUpdate: Date.now() });
      } else if (this.hasUserChanged(existing, user)) {
        changes.updated.push(user);
        this.users.set(user.user_id, { ...existing, ...user, _lastUpdate: Date.now() });
      }
    }

    // 处理移除
    for (const userId of currentUserIds) {
      if (!newUserIds.has(userId)) {
        changes.removed.push(userId);
        this.users.delete(userId);
      }
    }

    const endTime = performance.now();
    console.log(`批量更新用户耗时: ${endTime - startTime}ms, 变化: ${JSON.stringify({
      added: changes.added.length,
      updated: changes.updated.length,
      removed: changes.removed.length
    })}`);

    return {
      users: Array.from(this.users.values()),
      changes,
      hasChanges: changes.added.length > 0 || changes.updated.length > 0 || changes.removed.length > 0
    };
  }

  // 单个用户更新
  updateSingleUser(user) {
    const existing = this.users.get(user.user_id);
    let hasChange = false;

    if (!existing) {
      this.users.set(user.user_id, { ...user, _lastUpdate: Date.now() });
      hasChange = true;
    } else if (this.hasUserChanged(existing, user)) {
      this.users.set(user.user_id, { ...existing, ...user, _lastUpdate: Date.now() });
      hasChange = true;
    }

    return {
      users: Array.from(this.users.values()),
      hasChange,
      user: this.users.get(user.user_id)
    };
  }

  // 检查用户是否有变化
  hasUserChanged(existing, updated) {
    const checkFields = ['status', 'user_name', 'lastMessage', 'lastMessageTime', 'unreadCount'];
    return checkFields.some(field => existing[field] !== updated[field]);
  }

  // 获取用户列表
  getUsers() {
    return Array.from(this.users.values());
  }

  // 获取用户数量
  getUserCount() {
    return this.users.size;
  }

  // 清理过期用户
  cleanup() {
    const now = Date.now();
    const EXPIRE_TIME = 5 * 60 * 1000; // 5分钟
    
    for (const [userId, user] of this.users) {
      if (now - user._lastUpdate > EXPIRE_TIME) {
        this.users.delete(userId);
      }
    }
  }
}

// 性能监控器
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      messageCount: 0,
      updateCount: 0,
      errorCount: 0,
      reconnectCount: 0,
      averageLatency: 0,
      memoryUsage: 0,
      renderTime: 0,
      updateTime: 0
    };
    
    this.latencyHistory = [];
    this.renderTimeHistory = [];
    this.lastUpdateTime = Date.now();
  }

  recordMessage(type, latency = 0) {
    this.metrics.messageCount++;
    
    if (latency > 0) {
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > CONFIG.PERFORMANCE_SAMPLE_SIZE) {
        this.latencyHistory.shift();
      }
      this.metrics.averageLatency = this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
    }
  }

  recordUpdate(renderTime = 0) {
    this.metrics.updateCount++;
    this.lastUpdateTime = Date.now();
    
    if (renderTime > 0) {
      this.renderTimeHistory.push(renderTime);
      if (this.renderTimeHistory.length > CONFIG.PERFORMANCE_SAMPLE_SIZE) {
        this.renderTimeHistory.shift();
      }
      this.metrics.renderTime = this.renderTimeHistory.reduce((sum, time) => sum + time, 0) / this.renderTimeHistory.length;
    }
  }

  recordError() {
    this.metrics.errorCount++;
  }

  recordReconnect() {
    this.metrics.reconnectCount++;
  }

  updateMemoryUsage() {
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      messageCount: 0,
      updateCount: 0,
      errorCount: 0,
      reconnectCount: 0,
      averageLatency: 0,
      memoryUsage: 0,
      renderTime: 0,
      updateTime: 0
    };
    this.latencyHistory = [];
    this.renderTimeHistory = [];
  }
}

// 消息缓冲区
class MessageBuffer {
  constructor(size = CONFIG.MESSAGE_BUFFER_SIZE) {
    this.buffer = [];
    this.maxSize = size;
    this.processedIds = new Set();
  }

  add(message) {
    // 去重
    if (message.id && this.processedIds.has(message.id)) {
      return false;
    }

    this.buffer.push({
      ...message,
      _timestamp: Date.now()
    });

    if (message.id) {
      this.processedIds.add(message.id);
    }

    // 清理旧消息
    if (this.buffer.length > this.maxSize) {
      const removed = this.buffer.shift();
      if (removed.id) {
        this.processedIds.delete(removed.id);
      }
    }

    return true;
  }

  getBatch(count = CONFIG.BATCH_SIZE) {
    const batch = this.buffer.splice(0, count);
    return batch;
  }

  clear() {
    this.buffer = [];
    this.processedIds.clear();
  }

  size() {
    return this.buffer.length;
  }
}

// 主Hook
export function useEnterpriseWebSocket(url, options = {}) {
  const {
    userId,
    userType = 'kefu',
    enableBatchUpdates = true,
    enablePerformanceMonitor = true,
    enableAutoReconnect = true,
    onMessage,
    onUserUpdate,
    onConnectionChange,
    onError,
    onPerformanceUpdate
  } = options;

  // 状态管理
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({});

  // 引用管理
  const wsRef = useRef(null);
  const userStateManager = useRef(new UserStateManager());
  const performanceMonitor = useRef(new PerformanceMonitor());
  const messageBuffer = useRef(new MessageBuffer());
  const updateTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const memoryCleanupIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // 批量更新处理
  const processBatchUpdates = useCallback(() => {
    if (messageBuffer.current.size() === 0) return;

    const startTime = performance.now();
    const batch = messageBuffer.current.getBatch();
    
    let hasUserChanges = false;
    const userUpdates = [];

    for (const message of batch) {
      performanceMonitor.current.recordMessage(message.type, message._latency);

      switch (message.type) {
        case MESSAGE_TYPES.ONLINE_USERS:
          if (message.users) {
            const result = userStateManager.current.batchUpdateUsers(message.users);
            if (result.hasChanges) {
              hasUserChanges = true;
              userUpdates.push({ type: 'batch_update', data: result });
            }
          }
          break;

        case MESSAGE_TYPES.USER_JOINED:
          if (message.user_data) {
            const result = userStateManager.current.updateSingleUser(message.user_data);
            if (result.hasChange) {
              hasUserChanges = true;
              userUpdates.push({ type: 'user_joined', data: result });
            }
          }
          break;

        case MESSAGE_TYPES.USER_LEFT:
          if (message.user_id) {
            const result = userStateManager.current.updateSingleUser({
              user_id: message.user_id,
              status: 'offline',
              _removed: true
            });
            if (result.hasChange) {
              hasUserChanges = true;
              userUpdates.push({ type: 'user_left', data: result });
            }
          }
          break;

        case MESSAGE_TYPES.REALTIME_STATUS:
          if (message.user_data) {
            const result = userStateManager.current.updateSingleUser(message.user_data);
            if (result.hasChange) {
              hasUserChanges = true;
              userUpdates.push({ type: 'status_change', data: result });
            }
          }
          break;

        default:
          onMessage?.(message);
          break;
      }
    }

    // 统一更新UI
    if (hasUserChanges) {
      const newUsers = userStateManager.current.getUsers();
      setUsers(newUsers);
      
      for (const update of userUpdates) {
        onUserUpdate?.(update);
      }
    }

    const endTime = performance.now();
    const updateTime = endTime - startTime;
    
    performanceMonitor.current.recordUpdate(updateTime);
    performanceMonitor.current.updateMemoryUsage();
    
    // 更新性能指标
    if (enablePerformanceMonitor) {
      const newMetrics = performanceMonitor.current.getMetrics();
      setMetrics(newMetrics);
      onPerformanceUpdate?.(newMetrics);
    }

    console.log(`批量更新处理耗时: ${updateTime}ms, 消息数: ${batch.length}, 用户变化: ${hasUserChanges}`);
  }, [onMessage, onUserUpdate, onPerformanceUpdate, enablePerformanceMonitor]);

  // 调度批量更新
  const scheduleBatchUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      processBatchUpdates();
    }, CONFIG.BATCH_UPDATE_INTERVAL);
  }, [processBatchUpdates]);

  // 处理WebSocket消息
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      const message = {
        ...data,
        _timestamp: Date.now(),
        _latency: Date.now() - (data.timestamp ? new Date(data.timestamp).getTime() : Date.now())
      };

      if (enableBatchUpdates) {
        messageBuffer.current.add(message);
        scheduleBatchUpdate();
      } else {
        // 立即处理
        onMessage?.(message);
      }
    } catch (error) {
      console.error('消息解析错误:', error);
      performanceMonitor.current.recordError();
      setError(error.message);
    }
  }, [enableBatchUpdates, scheduleBatchUpdate, onMessage]);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    const wsUrl = `${url}?user_id=${userId}&user_type=${userType}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ 企业级WebSocket连接成功');
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      
      // 启动心跳
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'Heartbeat',
            user_id: userId,
            timestamp: new Date().toISOString()
          }));
        }
      }, CONFIG.HEARTBEAT_INTERVAL);

      onConnectionChange?.('connected');
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      console.error('❌ WebSocket错误:', error);
      performanceMonitor.current.recordError();
      setError('连接错误');
      onError?.(error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket连接关闭');
      setConnectionStatus('disconnected');
      
      // 清理心跳
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // 自动重连
      if (enableAutoReconnect && reconnectAttemptsRef.current < CONFIG.MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        performanceMonitor.current.recordReconnect();
        
        console.log(`🔄 尝试重连 (${reconnectAttemptsRef.current}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, CONFIG.RECONNECT_INTERVAL * reconnectAttemptsRef.current);
      }

      onConnectionChange?.('disconnected');
    };

    wsRef.current = ws;
  }, [url, userId, userType, enableAutoReconnect, handleMessage, onConnectionChange, onError]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 清理定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (memoryCleanupIntervalRef.current) {
      clearInterval(memoryCleanupIntervalRef.current);
      memoryCleanupIntervalRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  // 发送消息
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    return false;
  }, []);

  // 请求在线用户
  const requestOnlineUsers = useCallback(() => {
    return sendMessage({
      type: 'RequestOnlineUsers',
      user_id: userId
    });
  }, [sendMessage, userId]);

  // 内存清理
  useEffect(() => {
    memoryCleanupIntervalRef.current = setInterval(() => {
      userStateManager.current.cleanup();
      performanceMonitor.current.updateMemoryUsage();
    }, CONFIG.MEMORY_CLEANUP_INTERVAL);

    return () => {
      if (memoryCleanupIntervalRef.current) {
        clearInterval(memoryCleanupIntervalRef.current);
      }
    };
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect();
      messageBuffer.current.clear();
    };
  }, [disconnect]);

  // 返回状态和方法
  return {
    connectionStatus,
    users,
    error,
    metrics,
    connect,
    disconnect,
    sendMessage,
    requestOnlineUsers,
    userCount: userStateManager.current.getUserCount(),
    bufferSize: messageBuffer.current.size(),
    isConnected: connectionStatus === 'connected'
  };
}