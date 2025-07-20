import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useOptimizedCache, useDebounce, useThrottle } from './EnterpriseCore';
import { notificationManager } from './EnterpriseNotifications';

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
    this.messageQueue = new MessageQueueManager(this.options.messageQueueSize);
    this.heartbeatInterval = null;
    this.listeners = new Map();
    this.lastMessageTime = Date.now();
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      connectionTime: 0,
      lastMessageTime: 0
    };
    
    // 设置通知管理器
    notificationManager.setWebSocketClient(this, options.userId);
  }

  // 连接方法
  async connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
      this.status = ConnectionStatus.CONNECTING;
      
      // 发送连接通知
      notificationManager.add({
        type: 'info',
        priority: 'normal',
        title: '连接中',
        message: '正在连接到服务器...',
        autoDismiss: true,
        dismissDelay: 2000
      });
      
      return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          this.status = ConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.stats.connectionTime = Date.now();
          
          // 发送连接成功通知
          notificationManager.add({
            type: 'success',
            priority: 'normal',
            title: '连接成功',
            message: 'WebSocket连接已建立',
            autoDismiss: true,
            dismissDelay: 3000
          });
          
          this.emit('connected');
          resolve();
        };
        
        this.ws.onerror = (error) => {
          this.status = ConnectionStatus.ERROR;
          
          // 发送连接错误通知
          notificationManager.add({
            type: 'error',
            priority: 'high',
            title: '连接错误',
            message: 'WebSocket连接失败',
            autoDismiss: false,
            actions: [
              {
                label: '重试',
                type: 'primary',
                handler: () => this.reconnect()
              }
            ]
          });
          
          reject(error);
        };
      });
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.status = ConnectionStatus.ERROR;
      throw error;
    }
  }

  // 设置事件处理器
  setupEventHandlers() {
    this.ws.onmessage = (event) => {
      try {
        this.stats.messagesReceived++;
        this.stats.lastMessageTime = Date.now();
        
        const message = JSON.parse(event.data);
        
        // 处理后端消息并发送通知
        notificationManager.handleBackendMessage(message);
        
        // 触发消息事件
        this.emit('message', message);
        
        // 处理特定消息类型
        this.handleMessageType(message);
        
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
        
        // 发送解析错误通知
        notificationManager.add({
          type: 'error',
          priority: 'normal',
          title: '消息解析错误',
          message: '无法解析服务器消息',
          autoDismiss: true,
          dismissDelay: 5000
        });
      }
    };

    this.ws.onclose = (event) => {
      this.status = ConnectionStatus.DISCONNECTED;
      this.stopHeartbeat();
      
      // 发送连接断开通知
      notificationManager.add({
        type: 'warning',
        priority: 'high',
        title: '连接断开',
        message: 'WebSocket连接已断开，正在尝试重连...',
        autoDismiss: false,
        actions: [
          {
            label: '手动重连',
            type: 'primary',
            handler: () => this.reconnect()
          }
        ]
      });
      
      this.emit('disconnected', event);
      
      // 自动重连
      if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.reconnect();
      } else {
        // 重连失败通知
        notificationManager.add({
          type: 'error',
          priority: 'urgent',
          title: '重连失败',
          message: '无法重新连接到服务器，请检查网络连接',
          autoDismiss: false,
          actions: [
            {
              label: '重试',
              type: 'primary',
              handler: () => {
                this.reconnectAttempts = 0;
                this.reconnect();
              }
            }
          ]
        });
      }
    };

    this.ws.onerror = (error) => {
      this.status = ConnectionStatus.ERROR;
      console.error('WebSocket错误:', error);
      
      // 发送WebSocket错误通知
      notificationManager.add({
        type: 'error',
        priority: 'high',
        title: 'WebSocket错误',
        message: '连接发生错误',
        autoDismiss: false,
        data: { error }
      });
      
      this.emit('error', error);
    };
  }

  // 处理特定消息类型
  handleMessageType(message) {
    switch (message.type) {
      case 'Chat':
        this.emit('chat', message);
        break;
      case 'System':
        this.emit('system', message);
        break;
      case 'Status':
        this.emit('status', message);
        break;
      case 'UserJoined':
        this.emit('userJoined', message);
        break;
      case 'UserLeft':
        this.emit('userLeft', message);
        break;
      case 'Error':
        this.emit('error', message);
        break;
      case 'Welcome':
        this.emit('welcome', message);
        break;
      case 'OnlineUsers':
        this.emit('onlineUsers', message);
        break;
      case 'History':
        this.emit('history', message);
        break;
      case 'Typing':
        this.emit('typing', message);
        break;
      case 'Heartbeat':
        this.emit('heartbeat', message);
        break;
      default:
        this.emit('unknown', message);
    }
  }

  // 重连方法
  async reconnect() {
    if (this.status === ConnectionStatus.CONNECTING) return;
    
    this.reconnectAttempts++;
    this.status = ConnectionStatus.RECONNECTING;
    
    // 发送重连通知
    notificationManager.add({
      type: 'info',
      priority: 'normal',
      title: '重新连接',
      message: `正在尝试重新连接... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
      autoDismiss: true,
      dismissDelay: 3000
    });
    
    this.emit('reconnecting', this.reconnectAttempts);
    
    try {
      await new Promise(resolve => setTimeout(resolve, this.options.reconnectInterval));
      await this.connect();
      
      // 发送重连成功通知
      notificationManager.add({
        type: 'success',
        priority: 'normal',
        title: '重连成功',
        message: 'WebSocket连接已恢复',
        autoDismiss: true,
        dismissDelay: 3000
      });
      
      this.emit('reconnected');
    } catch (error) {
      console.error('重连失败:', error);
      
      if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
        // 继续重连
        setTimeout(() => this.reconnect(), this.options.reconnectInterval);
      }
    }
  }

  // 发送消息
  send(message) {
    if (this.status !== ConnectionStatus.CONNECTED) {
      // 消息加入队列
      this.messageQueue.add(message);
      
      // 发送离线通知
      notificationManager.add({
        type: 'warning',
        priority: 'normal',
        title: '消息已缓存',
        message: '连接断开，消息已加入发送队列',
        autoDismiss: true,
        dismissDelay: 3000
      });
      
      return false;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
      this.stats.messagesSent++;
      this.lastMessageTime = Date.now();
      
      this.emit('sent', message);
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 发送发送失败通知
      notificationManager.add({
        type: 'error',
        priority: 'normal',
        title: '发送失败',
        message: '消息发送失败',
        autoDismiss: true,
        dismissDelay: 5000
      });
      
      return false;
    }
  }

  // 批量发送
  sendBatch(messages) {
    const results = messages.map(message => this.send(message));
    const successCount = results.filter(Boolean).length;
    
    if (successCount < messages.length) {
      // 发送批量发送结果通知
      notificationManager.add({
        type: 'info',
        priority: 'normal',
        title: '批量发送',
        message: `成功发送 ${successCount}/${messages.length} 条消息`,
        autoDismiss: true,
        dismissDelay: 4000
      });
    }
    
    return results;
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.status = ConnectionStatus.DISCONNECTED;
      
      // 发送断开连接通知
      notificationManager.add({
        type: 'info',
        priority: 'normal',
        title: '连接断开',
        message: 'WebSocket连接已手动断开',
        autoDismiss: true,
        dismissDelay: 3000
      });
      
      this.emit('disconnected');
    }
  }

  // 开始心跳
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.status === ConnectionStatus.CONNECTED) {
        this.send({
          type: 'Heartbeat',
          timestamp: new Date().toISOString()
        });
      }
    }, this.options.heartbeatInterval);
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 获取连接状态
  getStatus() {
    return this.status;
  }

  // 获取统计信息
  getStats() {
    return {
      ...this.stats,
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.size()
    };
  }

  // 事件监听
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`WebSocket事件处理器错误 (${event}):`, error);
        }
      });
    }
  }
}

// React Hook for WebSocket
export const useEnterpriseWebSocket = (url, options = {}) => {
  const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const ws = new EnterpriseWebSocketClient(url, options);
    wsRef.current = ws;

    // 设置状态监听
    const handleStatusChange = () => {
      setStatus(ws.getStatus());
      setStats(ws.getStats());
    };

    // 设置消息监听
    const handleMessage = (message) => {
      setLastMessage(message);
      setError(null);
    };

    // 设置错误监听
    const handleError = (error) => {
      setError(error);
    };

    // 监听事件
    ws.on('statusChange', handleStatusChange);
    ws.on('message', handleMessage);
    ws.on('error', handleError);

    // 连接
    ws.connect().catch(setError);

    // 清理函数
    return () => {
      ws.off('statusChange', handleStatusChange);
      ws.off('message', handleMessage);
      ws.off('error', handleError);
      ws.disconnect();
    };
  }, [url, JSON.stringify(options)]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      return wsRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current) {
      return wsRef.current.send(message);
    }
    return false;
  }, []);

  const sendBatch = useCallback((messages) => {
    if (wsRef.current) {
      return wsRef.current.sendBatch(messages);
    }
    return [];
  }, []);

  const on = useCallback((event, callback) => {
    if (wsRef.current) {
      wsRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (wsRef.current) {
      wsRef.current.off(event, callback);
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
    off
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

// 导出所有组件和工具
export default {
  EnterpriseWebSocketClient,
  useEnterpriseWebSocket,
  MessageQueueManager,
  ConnectionStatus,
  WSMessageType
};