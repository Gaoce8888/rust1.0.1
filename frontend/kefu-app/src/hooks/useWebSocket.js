import { useEffect, useRef, useState, useCallback } from 'react';
import { message } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { EventEmitter } from 'events';

// WebSocket 状态枚举
const WS_STATE = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// 消息类型枚举
const MESSAGE_TYPE = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING: 'typing',
  ONLINE_STATUS: 'online_status',
  SESSION_UPDATE: 'session_update',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat'
};

// WebSocket管理类
class WebSocketManager extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.isReconnecting = false;
  }

  connect(url, token) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(`${url}?token=${token}`);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.emit('error', error);
    }
  }

  setupEventListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.emit('stateChange', WS_STATE.CONNECTED);
      this.startHeartbeat();
      this.flushMessageQueue();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event);
      this.emit('stateChange', WS_STATE.DISCONNECTED);
      this.stopHeartbeat();
      
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
      this.emit('stateChange', WS_STATE.ERROR);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case MESSAGE_TYPE.MESSAGE:
        this.emit('message', payload);
        break;
      case MESSAGE_TYPE.TYPING:
        this.emit('typing', payload);
        break;
      case MESSAGE_TYPE.ONLINE_STATUS:
        this.emit('onlineStatus', payload);
        break;
      case MESSAGE_TYPE.SESSION_UPDATE:
        this.emit('sessionUpdate', payload);
        break;
      case MESSAGE_TYPE.ERROR:
        this.emit('error', payload);
        message.error(payload.message || '操作失败');
        break;
      case MESSAGE_TYPE.HEARTBEAT:
        // 心跳响应
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  send(type, payload) {
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    } else {
      // 添加到消息队列
      this.messageQueue.push(message);
      return false;
    }
  }

  reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.emit('stateChange', WS_STATE.RECONNECTING);

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect(this.url, this.token);
    }, delay);
  }

  disconnect() {
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.maxReconnectAttempts; // 防止自动重连
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.emit('stateChange', WS_STATE.DISCONNECTED);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(MESSAGE_TYPE.HEARTBEAT, {});
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }
}

// 单例WebSocket管理器
let wsManager = null;

// WebSocket Hook
export const useWebSocket = () => {
  const [connectionState, setConnectionState] = useState(WS_STATE.DISCONNECTED);
  const { token, user } = useAuthStore();
  const wsManagerRef = useRef(null);
  const handlersRef = useRef({});

  // 初始化WebSocket连接
  useEffect(() => {
    if (!token || !user) return;

    // 创建或获取WebSocket管理器实例
    if (!wsManager) {
      wsManager = new WebSocketManager();
    }
    wsManagerRef.current = wsManager;

    // 设置事件监听
    const handleStateChange = (state) => setConnectionState(state);
    const handleError = (error) => console.error('WebSocket error:', error);

    wsManager.on('stateChange', handleStateChange);
    wsManager.on('error', handleError);

    // 连接WebSocket
    const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    wsManager.connect(wsUrl, token);

    // 清理函数
    return () => {
      wsManager.off('stateChange', handleStateChange);
      wsManager.off('error', handleError);
      
      // 如果没有其他组件使用，断开连接
      if (wsManager.listenerCount('stateChange') === 0) {
        wsManager.disconnect();
        wsManager = null;
      }
    };
  }, [token, user]);

  // 发送消息
  const sendMessage = useCallback(async (messageData) => {
    if (!wsManagerRef.current) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 设置超时
      const timeout = setTimeout(() => {
        delete handlersRef.current[messageId];
        reject(new Error('Message send timeout'));
      }, 10000);

      // 设置响应处理器
      handlersRef.current[messageId] = (response) => {
        clearTimeout(timeout);
        delete handlersRef.current[messageId];
        
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Send failed'));
        }
      };

      // 发送消息
      const sent = wsManagerRef.current.send(MESSAGE_TYPE.MESSAGE, {
        ...messageData,
        messageId
      });

      if (!sent) {
        clearTimeout(timeout);
        delete handlersRef.current[messageId];
        reject(new Error('WebSocket not ready'));
      }
    });
  }, []);

  // 发送输入状态
  const sendTyping = useCallback((sessionId, isTyping) => {
    if (!wsManagerRef.current) return;

    wsManagerRef.current.send(MESSAGE_TYPE.TYPING, {
      sessionId,
      isTyping,
      userId: user?.id
    });
  }, [user]);

  // 订阅消息
  const subscribe = useCallback((event, handler) => {
    if (!wsManagerRef.current) return () => {};

    wsManagerRef.current.on(event, handler);
    return () => wsManagerRef.current.off(event, handler);
  }, []);

  // 输入状态管理
  const typing = {
    start: (sessionId) => sendTyping(sessionId, true),
    stop: (sessionId) => sendTyping(sessionId, false)
  };

  return {
    connectionState,
    sendMessage,
    typing,
    subscribe,
    isConnected: connectionState === WS_STATE.CONNECTED,
    isReconnecting: connectionState === WS_STATE.RECONNECTING
  };
};