import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useOptimizedCache, useDebounce, useThrottle } from './EnterpriseCore';

// WebSocket连接状态
export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// 消息类型
export const WSMessageType = {
  CHAT: 'Chat',
  TYPING: 'Typing',
  STATUS: 'Status',
  ONLINE_USERS: 'OnlineUsers',
  USER_JOINED: 'UserJoined',
  USER_LEFT: 'UserLeft',
  PING: 'Ping',
  PONG: 'Pong',
  ERROR: 'Error'
};

// 高性能WebSocket客户端
export class EnterpriseWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 1000,
      ...options
    };
    
    this.ws = null;
    this.status = ConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.eventListeners = new Map();
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.lastMessageTime = Date.now();
    this.messageId = 0;
    
    // 性能优化
    this.messageCache = new Map();
    this.batchTimer = null;
    this.pendingMessages = [];
  }

  // 连接WebSocket
  connect() {
    if (this.status === ConnectionStatus.CONNECTING || 
        this.status === ConnectionStatus.CONNECTED) {
      return;
    }

    this.setStatus(ConnectionStatus.CONNECTING);
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.setStatus(ConnectionStatus.ERROR);
      this.scheduleReconnect();
    }
  }

  // 设置事件处理器
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('WebSocket连接成功');
      this.setStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processMessageQueue();
      this.emit('connected');
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event.code, event.reason);
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.stopHeartbeat();
      this.emit('disconnected', event);
      
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      this.setStatus(ConnectionStatus.ERROR);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  // 处理接收到的消息
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      this.lastMessageTime = Date.now();
      
      // 缓存消息
      const messageKey = `${message.type}-${message.id || Date.now()}`;
      this.messageCache.set(messageKey, message);
      
      // 限制缓存大小
      if (this.messageCache.size > this.options.messageQueueSize) {
        const firstKey = this.messageCache.keys().next().value;
        this.messageCache.delete(firstKey);
      }
      
      // 触发事件
      this.emit(message.type, message);
      this.emit('message', message);
      
    } catch (error) {
      console.error('消息解析失败:', error);
      this.emit('error', { type: 'parse_error', error });
    }
  }

  // 发送消息
  send(message) {
    if (this.status !== ConnectionStatus.CONNECTED) {
      // 将消息加入队列
      this.messageQueue.push(message);
      if (this.messageQueue.length > this.options.messageQueueSize) {
        this.messageQueue.shift();
      }
      return false;
    }

    try {
      const messageWithId = {
        ...message,
        id: this.generateMessageId(),
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(messageWithId));
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      this.emit('error', { type: 'send_error', error });
      return false;
    }
  }

  // 批量发送消息
  sendBatch(messages) {
    if (this.status !== ConnectionStatus.CONNECTED) {
      this.pendingMessages.push(...messages);
      return false;
    }

    try {
      const batchMessage = {
        type: 'Batch',
        messages: messages.map(msg => ({
          ...msg,
          id: this.generateMessageId(),
          timestamp: new Date().toISOString()
        }))
      };
      
      this.ws.send(JSON.stringify(batchMessage));
      return true;
    } catch (error) {
      console.error('批量发送消息失败:', error);
      return false;
    }
  }

  // 生成消息ID
  generateMessageId() {
    return `msg_${Date.now()}_${++this.messageId}`;
  }

  // 设置连接状态
  setStatus(status) {
    this.status = status;
    this.emit('statusChange', status);
  }

  // 开始心跳
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.status === ConnectionStatus.CONNECTED) {
        this.send({ type: WSMessageType.PING });
      }
    }, this.options.heartbeatInterval);
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 处理消息队列
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // 安排重连
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('达到最大重连次数');
      return;
    }

    this.setStatus(ConnectionStatus.RECONNECTING);
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, '正常关闭');
      this.ws = null;
    }
    
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  // 事件监听
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  // 获取连接状态
  getStatus() {
    return this.status;
  }

  // 获取统计信息
  getStats() {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueSize: this.messageQueue.length,
      cacheSize: this.messageCache.size,
      lastMessageTime: this.lastMessageTime
    };
  }
}

// React Hook for WebSocket
export const useEnterpriseWebSocket = (url, options = {}) => {
  const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  
  const clientRef = useRef(null);
  const { getCached, setCached } = useOptimizedCache(100);

  // 创建WebSocket客户端
  useEffect(() => {
    if (!url) return;

    clientRef.current = new EnterpriseWebSocketClient(url, options);
    
    // 设置事件监听
    clientRef.current.on('statusChange', setStatus);
    clientRef.current.on('message', setLastMessage);
    clientRef.current.on('error', setError);
    
    // 定期更新统计信息
    const statsInterval = setInterval(() => {
      if (clientRef.current) {
        setStats(clientRef.current.getStats());
      }
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [url]);

  // 连接
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  // 发送消息
  const send = useCallback((message) => {
    if (clientRef.current) {
      return clientRef.current.send(message);
    }
    return false;
  }, []);

  // 批量发送
  const sendBatch = useCallback((messages) => {
    if (clientRef.current) {
      return clientRef.current.sendBatch(messages);
    }
    return false;
  }, []);

  // 事件监听
  const on = useCallback((event, callback) => {
    if (clientRef.current) {
      clientRef.current.on(event, callback);
    }
  }, []);

  // 移除事件监听
  const off = useCallback((event, callback) => {
    if (clientRef.current) {
      clientRef.current.off(event, callback);
    }
  }, []);

  return {
    status,
    lastMessage,
    error,
    stats,
    connect,
    disconnect,
    send,
    sendBatch,
    on,
    off,
    client: clientRef.current
  };
};

// 消息队列管理器
export class MessageQueueManager {
  constructor(maxSize = 1000) {
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
    this.batchSize = 10;
    this.batchDelay = 100;
  }

  // 添加消息到队列
  add(message) {
    this.queue.push({
      ...message,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    });

    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
  }

  // 处理队列
  async process(sendFunction) {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        await sendFunction(batch);
      } catch (error) {
        console.error('处理消息队列失败:', error);
        // 将失败的消息重新加入队列
        this.queue.unshift(...batch);
        break;
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }

  // 清空队列
  clear() {
    this.queue = [];
  }

  // 获取队列状态
  getStatus() {
    return {
      size: this.queue.length,
      processing: this.processing,
      maxSize: this.maxSize
    };
  }
}

// 导出所有组件和类
export default {
  EnterpriseWebSocketClient,
  useEnterpriseWebSocket,
  MessageQueueManager,
  ConnectionStatus,
  WSMessageType
};