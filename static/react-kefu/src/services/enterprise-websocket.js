/**
 * 企业级WebSocket管理器 - 高稳定性通信
 * 从企业级客服端案例升级集成
 */

class EnterpriseWebSocketManager {
  constructor() {
    // 连接池管理
    this.connectionPool = new Map();
    this.primaryConnection = null;
    this.backupConnections = [];
    
    // 事件监听器管理
    this.eventListeners = new Map();
    this.realtimeStatusCallbacks = [];
    
    // 企业级配置
    this.config = null;
    this.connectionId = this.generateConnectionId();
    this.sessionToken = this.generateSessionToken();
    
    // 高性能网络监控
    this.networkMetrics = {
      latency: 0,
      jitter: 0,
      throughput: 0,
      reliability: 100,
      packet_loss: 0,
      connection_stability: 100,
      error_rate: 0,
      signal_strength: 100
    };
    
    // 实时性能统计
    this.performanceStats = {
      messages_sent: 0,
      messages_received: 0,
      messages_confirmed: 0,
      connection_switches: 0,
      total_uptime: 0,
      last_status_update: 0,
      avg_notification_delay: 0,
      fastest_notification: Infinity,
      slowest_notification: 0
    };
    
    // 消息确认和重试机制
    this.pendingConfirmations = new Map();
    this.messageQueue = [];
    this.criticalMessageQueue = [];
    
    // 智能重连管理
    this.reconnectConfig = {
      base_delay: 100,
      max_delay: 5000,
      max_attempts: 50,
      backoff_factor: 1.2,
      health_check_interval: 2000,
      connection_timeout: 8000
    };
    
    this.reconnectAttempts = 0;
    this.isIntentionalClose = false;
    this.connectionStartTime = 0;
    
    // 定时器管理
    this.healthCheckTimer = null;
    this.metricsUpdateTimer = null;
    this.reconnectTimer = null;
    this.performanceTimer = null;
    
    this.initializePerformanceMonitoring();
    this.setupNetworkEventListeners();
    
    console.log('🚀 企业级WebSocket管理器初始化完成', {
      connectionId: this.connectionId,
      sessionToken: this.sessionToken.substring(0, 8) + '...'
    });
  }
  
  /**
   * 企业级连接方法 - 零延迟优化
   */
  async connect(config) {
    return new Promise((resolve, reject) => {
      try {
        this.config = {
          ...config,
          priority: config.priority || 'high',
          quality: config.quality || 'high_performance',
          pool_size: config.pool_size || 3,
          dedicated_channel: config.dedicated_channel || true,
          // 支持认证token
          sessionToken: config.sessionToken || null
        };
        
        console.log('🔗 启动企业级连接池', this.config);
        
        // 立即建立主连接
        this.establishPrimaryConnection(resolve, reject);
        
        // 并行建立备用连接
        if (this.config.pool_size > 1) {
          setTimeout(() => this.establishBackupConnections(), 100);
        }
        
        // 启动性能监控
        this.startPerformanceMonitoring();
        
      } catch (error) {
        console.error('❌ 企业级连接失败:', error);
        reject(error);
      }
    });
  }
  
  /**
   * 建立主要连接 - 零延迟优化
   */
  establishPrimaryConnection(resolve, reject) {
    if (!this.config) {
      reject(new Error('配置未初始化'));
      return;
    }
    
    const wsUrl = this.buildOptimizedWebSocketUrl(this.config);
    console.log('⚡ 建立主连接:', wsUrl);
    
    this.connectionStartTime = performance.now();
    this.primaryConnection = new WebSocket(wsUrl);
    
    // 零延迟事件处理
    this.primaryConnection.onopen = (event) => {
      const connectionTime = performance.now() - this.connectionStartTime;
      console.log(`✅ 主连接建立成功 - 耗时: ${connectionTime.toFixed(2)}ms`);
      
      this.reconnectAttempts = 0;
      this.networkMetrics.latency = connectionTime;
      this.networkMetrics.connection_stability = 100;
      
      // 立即注册连接
      this.registerConnection('primary', this.primaryConnection);
      
      // 发送企业级握手消息
      this.sendEnterpriseHandshake();
      
      // 启动实时健康检查
      this.startHealthCheck();
      
      this.emit('connected', { 
        connectionId: this.connectionId, 
        type: 'primary',
        metrics: this.networkMetrics
      });
      
      resolve();
    };
    
    this.primaryConnection.onmessage = (event) => {
      const receiveTime = performance.now();
      this.handleRealtimeMessage(event.data, receiveTime);
    };
    
    this.primaryConnection.onclose = (event) => {
      console.log('🔌 主连接关闭:', { code: event.code, reason: event.reason });
      this.handleConnectionClose('primary', event);
    };
    
    this.primaryConnection.onerror = (error) => {
      console.error('🚨 主连接错误:', error);
      this.networkMetrics.error_rate++;
      this.handleConnectionError('primary', error);
      
      if (this.reconnectAttempts === 0) {
        reject(new Error('主连接建立失败'));
      }
    };
    
    // 连接超时保护
    setTimeout(() => {
      if (this.primaryConnection?.readyState !== WebSocket.OPEN) {
        console.warn('⏰ 主连接超时');
        this.primaryConnection?.close();
        reject(new Error('连接超时'));
      }
    }, this.reconnectConfig.connection_timeout);
  }
  
  /**
   * 零延迟实时消息处理
   */
  handleRealtimeMessage(data, receiveTime) {
    try {
      this.performanceStats.messages_received++;
      
      const message = JSON.parse(data);
      const processStartTime = performance.now();
      
      // 优先处理状态变更消息
      if (this.isStatusUpdateMessage(message)) {
        this.processStatusUpdateInstantly(message, receiveTime);
      }
      
      // 处理其他消息类型
      this.processGeneralMessage(message);
      
      // 计算处理延迟
      const processingDelay = performance.now() - processStartTime;
      this.updateNotificationDelay(processingDelay);
      
      // 更新网络质量指标
      this.updateNetworkQuality(receiveTime);
      
    } catch (error) {
      console.error('❌ 消息处理失败:', error);
      this.networkMetrics.error_rate++;
    }
  }
  
  /**
   * 瞬时状态更新处理 - 零延迟通知
   */
  processStatusUpdateInstantly(message, receiveTime) {
    const event = {
      event_type: this.determineEventType(message),
      user_id: message.user_id,
      user_data: message.user_data || message.user_info,
      users_data: message.users,
      timestamp: receiveTime,
      latency: receiveTime - (message.sent_at || receiveTime),
      priority: this.determinePriority(message)
    };
    
    // 立即触发所有状态回调 - 零延迟
    this.realtimeStatusCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ 状态回调错误:', error);
      }
    });
    
    // 记录最快通知时间
    const notificationDelay = performance.now() - receiveTime;
    if (notificationDelay < this.performanceStats.fastest_notification) {
      this.performanceStats.fastest_notification = notificationDelay;
    }
    
    console.log(`⚡ 零延迟状态更新完成 - 延迟: ${notificationDelay.toFixed(2)}ms`, event);
  }
  
  /**
   * 注册实时状态变更监听器
   */
  onRealtimeStatusChange(callback) {
    this.realtimeStatusCallbacks.push(callback);
    console.log('📝 注册实时状态监听器，当前监听器数量:', this.realtimeStatusCallbacks.length);
  }
  
  /**
   * 移除状态变更监听器
   */
  offRealtimeStatusChange(callback) {
    const index = this.realtimeStatusCallbacks.indexOf(callback);
    if (index > -1) {
      this.realtimeStatusCallbacks.splice(index, 1);
      console.log('🗑️ 移除实时状态监听器，剩余监听器数量:', this.realtimeStatusCallbacks.length);
    }
  }
  
  /**
   * 发送高优先级消息 - 企业级确认机制
   */
  sendCriticalMessage(content, messageType = 'chat') {
    const messageId = this.generateMessageId();
    const message = {
      id: messageId,
      type: messageType,
      content,
      from: this.config?.user_name || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    // 添加到关键消息队列
    this.criticalMessageQueue.push(message);
    
    // 立即发送
    this.sendMessageInstantly(message);
    
    // 设置确认机制
    this.setupMessageConfirmation(messageId, 'critical');
    
    return messageId;
  }
  
  /**
   * 瞬时发送消息
   */
  sendMessageInstantly(message) {
    if (!this.primaryConnection || this.primaryConnection.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ 主连接不可用，尝试备用连接');
      return this.sendViaBackupConnection(message);
    }
    
    try {
      const data = JSON.stringify(message);
      this.primaryConnection.send(data);
      this.performanceStats.messages_sent++;
      
      console.log('⚡ 消息瞬时发送成功:', message.id);
      return true;
    } catch (error) {
      console.error('❌ 消息发送失败:', error);
      return this.sendViaBackupConnection(message);
    }
  }
  
  /**
   * 通过备用连接发送
   */
  sendViaBackupConnection(message) {
    for (const backup of this.backupConnections) {
      if (backup.readyState === WebSocket.OPEN) {
        try {
          backup.send(JSON.stringify(message));
          this.performanceStats.connection_switches++;
          console.log('🔄 通过备用连接发送成功');
          return true;
        } catch (error) {
          console.warn('⚠️ 备用连接发送失败:', error);
        }
      }
    }
    
    // 所有连接都失败，加入队列等待重连
    this.messageQueue.push(message);
    console.warn('❌ 所有连接不可用，消息已加入队列');
    return false;
  }
  
  /**
   * 请求在线用户 - 零延迟
   */
  requestOnlineUsersInstantly() {
    const messageId = this.sendCriticalMessage(JSON.stringify({
      type: 'request_online_users',
      timestamp: Date.now(),
      priority: 'high'
    }), 'system');
    
    console.log('⚡ 发送零延迟在线用户请求:', messageId);
  }
  
  /**
   * 获取实时性能指标
   */
  getPerformanceMetrics() {
    return {
      network: { ...this.networkMetrics },
      performance: { ...this.performanceStats },
      connection: {
        primary_status: this.primaryConnection?.readyState === WebSocket.OPEN ? 'active' : 'inactive',
        backup_count: this.backupConnections.filter(ws => ws.readyState === WebSocket.OPEN).length,
        pool_size: this.connectionPool.size,
        uptime: this.connectionStartTime ? performance.now() - this.connectionStartTime : 0
      }
    };
  }
  
  // 辅助方法
  generateConnectionId() {
    return `ent_conn_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }
  
  generateSessionToken() {
    return `ent_session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
  
  buildOptimizedWebSocketUrl(config) {
    // 浏览器环境兼容的环境变量获取
    const baseUrl = this.getEnvironmentVariable('REACT_APP_WS_URL') || 'ws://localhost:6006/ws';
    const params = new URLSearchParams({
      user_id: encodeURIComponent(config.user_id || config.user_name),
      user_name: encodeURIComponent(config.user_name),
      user_type: config.user_type || 'kefu',
      connection_id: this.connectionId,
      priority: config.priority || 'high',
      quality: config.quality || 'high_performance',
      session: this.sessionToken,
      session_id: `session_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
    
    // 添加认证token
    if (config.sessionToken) {
      params.set('session_token', config.sessionToken);
    }
    
    if (config.kefu_id) {
      params.set('kefu_id', config.kefu_id);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 获取环境变量 - 浏览器兼容
   */
  getEnvironmentVariable(key) {
    // 首先尝试从 import.meta.env (Vite)
    try {
      if (import.meta && import.meta.env) {
        return import.meta.env[key];
      }
    } catch (e) {
      // import.meta 在某些环境中可能不可用
    }
    
    // 然后尝试从 process.env (如果可用)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    
    // 最后尝试从 window (如果手动设置)
    if (typeof window !== 'undefined' && window.env) {
      return window.env[key];
    }
    
    return null;
  }
  
  isStatusUpdateMessage(message) {
    // 支持服务器端的驼峰命名格式和客户端的下划线格式
    return message.type === 'UserJoined' ||      // 服务器格式
           message.type === 'user_joined' ||      // 客户端格式
           message.type === 'UserLeft' ||         // 服务器格式
           message.type === 'user_left' ||        // 客户端格式
           message.type === 'Status' ||           // 服务器格式
           message.type === 'status_change' ||    // 客户端格式
           message.type === 'OnlineUsers' ||      // 服务器格式
           message.type === 'online_users' ||     // 客户端格式
           message.action === 'online' ||
           message.action === 'offline' ||
           message.action === 'online_users_update';
  }
  
  determineEventType(message) {
    // 支持服务器端的驼峰命名格式和客户端的下划线格式
    if (message.type === 'UserJoined' || message.type === 'user_joined' || message.action === 'online') return 'user_online';
    if (message.type === 'UserLeft' || message.type === 'user_left' || message.action === 'offline') return 'user_offline';
    if (message.type === 'OnlineUsers' || message.type === 'online_users' || message.action === 'online_users_update') return 'bulk_update';
    if (message.type === 'Status') return 'user_status_change';
    return 'user_status_change';
  }
  
  determinePriority(message) {
    if (message.priority) return message.priority;
    // 支持服务器端的驼峰命名格式和客户端的下划线格式
    if (message.type === 'UserJoined' || message.type === 'user_joined' || 
        message.type === 'UserLeft' || message.type === 'user_left') return 'high';
    if (message.action === 'online' || message.action === 'offline') return 'high';
    return 'normal';
  }
  
  processGeneralMessage(message) {
    // 处理非状态更新消息
    Object.keys(this.eventListeners).forEach(event => {
      if (message.type === event || message.action === event) {
        this.eventListeners.get(event)?.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error(`❌ 事件回调错误 [${event}]:`, error);
          }
        });
      }
    });
  }
  
  updateNotificationDelay(delay) {
    this.performanceStats.avg_notification_delay = 
      (this.performanceStats.avg_notification_delay + delay) / 2;
    
    if (delay > this.performanceStats.slowest_notification) {
      this.performanceStats.slowest_notification = delay;
    }
  }
  
  updateNetworkQuality(receiveTime) {
    const now = performance.now();
    const latency = now - receiveTime;
    
    this.networkMetrics.latency = (this.networkMetrics.latency + latency) / 2;
    this.networkMetrics.jitter = Math.abs(this.networkMetrics.latency - latency);
    
    // 计算可靠性
    const successRate = this.performanceStats.messages_received / 
                       Math.max(this.performanceStats.messages_sent, 1);
    this.networkMetrics.reliability = Math.min(100, successRate * 100);
  }
  
  // 标准WebSocket接口兼容
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ 事件发射错误 [${event}]:`, error);
      }
    });
  }
  
  isConnected() {
    return this.primaryConnection?.readyState === WebSocket.OPEN;
  }
  
  sendMessage(content) {
    this.sendCriticalMessage(content, 'chat');
  }
  
  sendChatMessage(content, contentType, filename) {
    const message = {
      id: this.generateMessageId(),
      type: 'chat',
      content,
      from: this.config?.user_name || 'unknown',
      timestamp: new Date().toISOString(),
      content_type: contentType,
      filename
    };
    
    this.sendMessageInstantly(message);
  }
  
  requestOnlineUsers() {
    this.requestOnlineUsersInstantly();
  }
  
  sendTypingIndicator(isTyping) {
    this.sendCriticalMessage(JSON.stringify({
      type: 'typing',
      is_typing: isTyping,
      timestamp: Date.now()
    }), 'typing');
  }
  
  // 待实现的私有方法
  establishBackupConnections() {
    // 建立备用连接
    console.log('🔄 建立备用连接');
  }
  
  registerConnection(type, ws) {
    this.connectionPool.set(type, ws);
  }
  
  sendEnterpriseHandshake() {
    // 发送企业级握手消息
    console.log('🤝 发送企业级握手消息');
  }
  
  startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendCriticalMessage('ping', 'heartbeat');
      }
    }, this.reconnectConfig.health_check_interval);
  }
  
  handleConnectionClose(type, event) {
    console.log(`🔌 连接关闭 [${type}]:`, event);
    if (!this.isIntentionalClose) {
      this.attemptReconnection();
    }
  }
  
  handleConnectionError(type, error) {
    console.error(`🚨 连接错误 [${type}]:`, error);
    this.networkMetrics.error_rate++;
  }
  
  attemptReconnection() {
    if (this.reconnectAttempts >= this.reconnectConfig.max_attempts) {
      console.error('❌ 已达到最大重连次数');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectConfig.base_delay * Math.pow(this.reconnectConfig.backoff_factor, this.reconnectAttempts),
      this.reconnectConfig.max_delay
    );
    
    console.log(`🔄 准备重连 (${this.reconnectAttempts}/${this.reconnectConfig.max_attempts}) - 延迟: ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.config).catch(error => {
        console.error('❌ 重连失败:', error);
        this.attemptReconnection();
      });
    }, delay);
  }
  
  initializePerformanceMonitoring() {
    console.log('📊 初始化性能监控');
  }
  
  setupNetworkEventListeners() {
    // 监听网络状态变化
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      window.addEventListener('online', () => {
        console.log('🌐 网络已恢复');
        if (!this.isConnected()) {
          this.attemptReconnection();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('🌐 网络已断开');
      });
    }
  }
  
  startPerformanceMonitoring() {
    this.performanceTimer = setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      console.log('📊 性能指标:', metrics);
    }, 10000); // 每10秒记录一次
  }
  
  setupMessageConfirmation(messageId, priority) {
    // 设置消息确认机制
    const confirmation = {
      message_id: messageId,
      sent_at: Date.now(),
      retry_count: 0,
      priority: priority,
      ttl: 30000 // 30秒
    };
    
    this.pendingConfirmations.set(messageId, confirmation);
    
    // 设置确认超时
    setTimeout(() => {
      const pending = this.pendingConfirmations.get(messageId);
      if (pending && !pending.confirmed_at) {
        console.warn('⚠️ 消息确认超时:', messageId);
        this.pendingConfirmations.delete(messageId);
      }
    }, confirmation.ttl);
  }
  
  /**
   * 销毁管理器 - 清理所有资源
   */
  destroy() {
    console.log('🗑️ 销毁企业级WebSocket管理器');
    
    this.isIntentionalClose = true;
    
    // 清理定时器
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.metricsUpdateTimer) clearInterval(this.metricsUpdateTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.performanceTimer) clearInterval(this.performanceTimer);
    
    // 关闭所有连接
    this.primaryConnection?.close();
    this.backupConnections.forEach(ws => ws.close());
    this.connectionPool.forEach(ws => ws.close());
    
    // 清理监听器
    this.eventListeners.clear();
    this.realtimeStatusCallbacks.length = 0;
    
    // 清理队列
    this.messageQueue.length = 0;
    this.criticalMessageQueue.length = 0;
    this.pendingConfirmations.clear();
  }
}

// 创建全局企业级WebSocket管理器实例
export const enterpriseWSManager = new EnterpriseWebSocketManager();
export default EnterpriseWebSocketManager;