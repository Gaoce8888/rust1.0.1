/**
 * WebSocket 客户端 - 升级版 (保持向后兼容)
 * 用于处理与后端的实时通信
 * 集成企业级高稳定性通信功能
 * 
 * 功能特点：
 * - 自动重连机制
 * - 消息队列和离线缓存
 * - 心跳检测
 * - 性能监控
 * - 企业级功能扩展
 */

import { enterpriseWSManager } from './services/enterprise-websocket.js';

/**
 * WebSocket客户端类
 * 提供可靠的实时通信功能
 */
export class WebSocketClient {
    /**
     * 构造函数
     * @param {string} url - WebSocket服务器URL
     * @param {Object} options - 配置选项
     * @param {number} options.reconnectInterval - 重连间隔时间（毫秒）
     * @param {number} options.maxReconnectAttempts - 最大重连尝试次数
     * @param {string} options.userId - 用户ID
     * @param {string} options.userType - 用户类型（kefu/kehu）
     * @param {string} options.sessionToken - 会话令牌
     * @param {boolean} options.enableEnterpriseFeatures - 是否启用企业级功能
     */
    constructor(url, options = {}) {
      this.baseUrl = url;
      this.ws = null;  // WebSocket实例
      this.reconnectInterval = options.reconnectInterval || 5000;  // 重连间隔（默认5秒）
      this.maxReconnectAttempts = options.maxReconnectAttempts || 5;  // 最大重连次数
      this.reconnectAttempts = 0;  // 当前重连次数
      this.isConnecting = false;  // 是否正在连接
      this.handlers = new Map();  // 事件处理器映射
      this.messageQueue = [];  // 消息队列（离线时缓存消息）
      this.heartbeatInterval = null;  // 心跳定时器
      this.userId = options.userId;  // 用户ID
      this.userType = options.userType || 'kefu';  // 用户类型
      this.sessionToken = options.sessionToken;  // 会话令牌
      
      // 企业级功能开关
      this.enableEnterpriseFeatures = options.enableEnterpriseFeatures !== false;
      this.enterpriseManager = null;
      
      // 性能监控指标
      this.performanceMetrics = {
        messagesReceived: 0,  // 接收消息数
        messagesSent: 0,  // 发送消息数
        reconnectCount: 0,  // 重连次数
        avgResponseTime: 0,  // 平均响应时间
        lastHeartbeat: null  // 最后心跳时间
      };
      
      // 如果启用企业级功能，初始化企业级管理器
      if (this.enableEnterpriseFeatures) {
        this.initializeEnterpriseFeatures();
      }
    }
  
    /**
     * 初始化企业级功能
     * 包括高级监控、负载均衡等
     */
    initializeEnterpriseFeatures() {
      console.log('🚀 初始化企业级WebSocket功能');
      this.enterpriseManager = enterpriseWSManager;
      
      // 监听企业级事件
      this.enterpriseManager.onRealtimeStatusChange((event) => {
        this.emit('realtime_status_change', event);
      });
    }
    
    // 连接WebSocket
    connect() {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        return;
      }
      
      // 如果启用企业级功能，使用企业级连接
      if (this.enableEnterpriseFeatures && this.enterpriseManager) {
        return this.connectWithEnterpriseFeatures();
      }
  
      this.isConnecting = true;
      console.log('正在连接WebSocket...');
      
      // 记录连接尝试
      this.performanceMetrics.reconnectCount++;
  
      try {
        // 构建带参数的WebSocket URL
        const params = new URLSearchParams({
          user_id: this.userId,
          user_type: this.userType,
          user_name: this.userId,
          session_id: `session_${Date.now()}`,
          timestamp: new Date().toISOString()
        });
        
        // 客服类型需要添加session_token
        if (this.userType === 'kefu' && this.sessionToken) {
          params.set('session_token', this.sessionToken);
        }
        
        const wsUrl = `${this.baseUrl}?${params.toString()}`;
        console.log('WebSocket URL:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // 发送队列中的消息
          this.flushMessageQueue();
          
          // 开始心跳
          this.startHeartbeat();
          
          // 触发连接成功事件
          this.emit('connected');
        };
  
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.performanceMetrics.messagesReceived++;
            this.handleMessage(data);
          } catch (error) {
            console.error('解析消息失败:', error);
          }
        };
  
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.emit('error', error);
        };
  
        this.ws.onclose = () => {
          console.log('WebSocket连接关闭');
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          
          // 尝试重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`将在${this.reconnectInterval}ms后尝试第${this.reconnectAttempts}次重连`);
            setTimeout(() => this.connect(), this.reconnectInterval);
          }
        };
      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        this.isConnecting = false;
      }
    }
  
    // 断开连接
    disconnect() {
      if (this.ws) {
        this.reconnectAttempts = this.maxReconnectAttempts; // 防止自动重连
        this.ws.close();
        this.ws = null;
      }
      this.stopHeartbeat();
    }
  
    // 企业级连接方法
    async connectWithEnterpriseFeatures() {
      console.log('🚀 使用企业级连接');
      
      try {
        await this.enterpriseManager.connect({
          user_id: this.userId,
          user_name: this.userId,
          user_type: this.userType,
          priority: 'high',
          quality: 'high_performance',
          sessionToken: this.sessionToken
        });
        
        // 设置企业级事件监听
        this.enterpriseManager.on('message', (data) => {
          this.performanceMetrics.messagesReceived++;
          this.handleMessage(data);
        });
        
        this.enterpriseManager.on('connected', () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connected');
        });
        
        this.enterpriseManager.on('disconnected', () => {
          this.emit('disconnected');
        });
        
        this.enterpriseManager.on('error', (error) => {
          this.emit('error', error);
        });
        
        return true;
      } catch (error) {
        console.error('企业级连接失败:', error);
        // 回退到标准连接
        this.enableEnterpriseFeatures = false;
        return this.connect();
      }
    }
    
    // 发送消息
    send(data) {
      // 如果使用企业级功能
      if (this.enableEnterpriseFeatures && this.enterpriseManager?.isConnected()) {
        this.enterpriseManager.sendMessage(JSON.stringify(data));
        this.performanceMetrics.messagesSent++;
        return;
      }
      
      // 标准发送
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(data));
        this.performanceMetrics.messagesSent++;
      } else {
        // 加入消息队列
        this.messageQueue.push(data);
      }
    }
  
    // 发送聊天消息
    sendMessage(message) {
      // 转换 content_type 为首字母大写格式
      let contentType = message.messageType || message.content_type || 'text';
      contentType = contentType.charAt(0).toUpperCase() + contentType.slice(1).toLowerCase();
      
      const messageData = {
        type: 'Chat',
        id: Date.now().toString(),
        from: this.userId,
        to: message.receiverId || message.to,
        content: message.content,
        content_type: contentType,
        timestamp: new Date().toISOString(),
        ...message
      };
      
      // 删除冗余字段
      delete messageData.messageType;
      
      this.send(messageData);
      return messageData;
    }
  
    // 发送文件
    async sendFile(file, type = 'file') {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      try {
        // 上传文件到服务器
        const response = await fetch('/api/file/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('文件上传失败');
        }
        
        const result = await response.json();
        
        // 发送文件消息
        const messageData = {
          content: result.url,
          content_type: type,
          fileUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
          thumbnailUrl: result.thumbnailUrl,
        };
        
        return this.sendMessage(messageData);
      } catch (error) {
        console.error('文件上传失败:', error);
        throw error;
      }
    }
  
    // 发送正在输入状态
    sendTyping(receiverId, isTyping = true) {
      this.send({
        type: 'Typing',
        from_user_id: this.userId,
        to_user_id: receiverId,
        is_typing: isTyping,
        timestamp: new Date().toISOString()
      });
    }
  
    // 处理接收到的消息
    handleMessage(data) {
      const { type } = data;
      
      // 对于Chat消息，需要转换格式
      if (type === 'Chat') {
        const chatData = {
          id: data.id,
          messageType: data.content_type?.toLowerCase() || 'text',
          content: data.content,
          senderId: data.from,
          senderName: data.from,
          receiverId: data.to,
          timestamp: data.timestamp,
          // 文件相关
          fileName: data.filename,
          fileUrl: data.url,
          // 其他字段
          ...data
        };
        this.emit('Chat', chatData);
      } else {
        // 触发对应的事件处理器
        this.emit(type, data);
      }
      
      // 触发通用消息事件
      this.emit('message', data);
    }
  
    // 事件监听
    on(event, handler) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, []);
      }
      this.handlers.get(event).push(handler);
    }
  
    // 移除事件监听
    off(event, handler) {
      if (this.handlers.has(event)) {
        const handlers = this.handlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  
    // 触发事件
    emit(event, data) {
      if (this.handlers.has(event)) {
        this.handlers.get(event).forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`事件处理器错误 (${event}):`, error);
          }
        });
      }
    }
  
    // 发送队列中的消息
    flushMessageQueue() {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
    }
  
    // 开始心跳
    startHeartbeat() {
      this.heartbeatInterval = setInterval(() => {
        this.send({ 
          type: 'Heartbeat',
          user_id: this.userId,
          timestamp: new Date().toISOString()
        });
      }, 30000); // 30秒一次心跳
    }
  
    // 停止心跳
    stopHeartbeat() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  
    // 获取连接状态
    get isConnected() {
      return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
  
    // 获取连接状态文本
    get connectionState() {
      // 企业级连接状态
      if (this.enableEnterpriseFeatures && this.enterpriseManager) {
        return this.enterpriseManager.isConnected() ? 'connected' : 'disconnected';
      }
      
      // 标准连接状态
      if (!this.ws) return 'disconnected';
      switch (this.ws.readyState) {
        case WebSocket.CONNECTING:
          return 'connecting';
        case WebSocket.OPEN:
          return 'connected';
        case WebSocket.CLOSING:
          return 'closing';
        case WebSocket.CLOSED:
          return 'closed';
        default:
          return 'unknown';
      }
    }
    
    // 获取性能指标
    getPerformanceMetrics() {
      const baseMetrics = { ...this.performanceMetrics };
      
      // 如果启用企业级功能，合并企业级指标
      if (this.enableEnterpriseFeatures && this.enterpriseManager) {
        const enterpriseMetrics = this.enterpriseManager.getPerformanceMetrics();
        return {
          ...baseMetrics,
          enterprise: enterpriseMetrics,
          connectionType: 'enterprise'
        };
      }
      
      return {
        ...baseMetrics,
        connectionType: 'standard'
      };
    }
    
    // 请求在线用户（企业级优化）
    requestOnlineUsers() {
      if (this.enableEnterpriseFeatures && this.enterpriseManager) {
        this.enterpriseManager.requestOnlineUsersInstantly();
      } else {
        // 标准请求
        this.send({
          type: 'GetOnlineUsers',
          user_id: this.userId,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // 创建单例实例
  let wsClient = null;
  
  export function getWebSocketClient(url, options) {
    if (!wsClient || wsClient.ws?.readyState === WebSocket.CLOSED) {
      wsClient = new WebSocketClient(url, options);
    }
    return wsClient;
  }
  
  export function disconnectWebSocket() {
    if (wsClient) {
      wsClient.disconnect();
      wsClient = null;
    }
  }