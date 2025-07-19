/**
 * 企业级消息队列和缓存机制
 * 高性能消息处理和存储
 */

// 消息状态枚举
export const MessageStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// 消息优先级
export const MessagePriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

// 消息队列管理器
export class MessageQueueManager {
  constructor(options = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize || 1000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      batchSize: options.batchSize || 10,
      processInterval: options.processInterval || 100,
      persistToStorage: options.persistToStorage !== false,
      ...options
    };
    
    // 消息队列 - 按优先级分组
    this.queues = {
      [MessagePriority.CRITICAL]: [],
      [MessagePriority.HIGH]: [],
      [MessagePriority.NORMAL]: [],
      [MessagePriority.LOW]: []
    };
    
    // 处理中的消息
    this.processing = new Map();
    
    // 已发送等待确认的消息
    this.pendingConfirmation = new Map();
    
    // 失败的消息
    this.failedMessages = new Map();
    
    // 统计信息
    this.stats = {
      totalMessages: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      queueSize: 0,
      averageProcessTime: 0,
      lastProcessTime: 0
    };
    
    // 处理定时器
    this.processTimer = null;
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 启动处理器
    this.startProcessor();
    
    console.log('🚀 消息队列管理器初始化完成');
  }
  
  /**
   * 添加消息到队列
   */
  enqueue(message, priority = MessagePriority.NORMAL) {
    const queueMessage = {
      id: message.id || this.generateMessageId(),
      ...message,
      priority,
      status: MessageStatus.PENDING,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.options.retryAttempts
    };
    
    // 检查队列大小
    if (this.getTotalQueueSize() >= this.options.maxQueueSize) {
      console.warn('⚠️ 队列已满，移除最老的低优先级消息');
      this.removeOldestLowPriorityMessage();
    }
    
    // 添加到对应优先级队列
    this.queues[priority].push(queueMessage);
    this.stats.totalMessages++;
    this.stats.queueSize++;
    
    // 持久化到本地存储
    if (this.options.persistToStorage) {
      this.persistToStorage();
    }
    
    // 触发事件
    this.emit('messageEnqueued', queueMessage);
    
    console.log(`📥 消息入队: ${queueMessage.id} (优先级: ${priority})`);
    
    return queueMessage.id;
  }
  
  /**
   * 处理消息队列
   */
  async processQueue() {
    const startTime = performance.now();
    
    try {
      // 按优先级处理消息
      const priorities = [
        MessagePriority.CRITICAL,
        MessagePriority.HIGH,
        MessagePriority.NORMAL,
        MessagePriority.LOW
      ];
      
      for (const priority of priorities) {
        const queue = this.queues[priority];
        if (queue.length === 0) continue;
        
        // 批量处理
        const batch = queue.splice(0, this.options.batchSize);
        await this.processBatch(batch);
        
        // 更新统计
        this.stats.queueSize -= batch.length;
        
        // 如果处理了关键或高优先级消息，立即处理下一批
        if (priority === MessagePriority.CRITICAL || priority === MessagePriority.HIGH) {
          continue;
        }
        
        // 普通和低优先级消息可以分批处理
        break;
      }
      
    } catch (error) {
      console.error('❌ 队列处理失败:', error);
      this.emit('processingError', error);
    }
    
    const endTime = performance.now();
    const processTime = endTime - startTime;
    
    // 更新统计
    this.stats.averageProcessTime = (this.stats.averageProcessTime + processTime) / 2;
    this.stats.lastProcessTime = Date.now();
  }
  
  /**
   * 处理消息批次
   */
  async processBatch(batch) {
    const processPromises = batch.map(message => this.processMessage(message));
    
    try {
      await Promise.all(processPromises);
    } catch (error) {
      console.error('❌ 批次处理失败:', error);
    }
  }
  
  /**
   * 处理单个消息
   */
  async processMessage(message) {
    const startTime = performance.now();
    
    try {
      // 标记为处理中
      message.status = MessageStatus.PENDING;
      this.processing.set(message.id, message);
      
      // 触发处理事件
      this.emit('messageProcessing', message);
      
      // 调用处理器
      const result = await this.callMessageHandler(message);
      
      if (result.success) {
        // 处理成功
        message.status = MessageStatus.SENT;
        this.stats.successCount++;
        
        // 添加到确认等待队列
        this.pendingConfirmation.set(message.id, {
          ...message,
          sentAt: Date.now(),
          timeout: setTimeout(() => {
            this.handleConfirmationTimeout(message.id);
          }, 30000) // 30秒超时
        });
        
        this.emit('messageSent', message);
        
      } else {
        // 处理失败
        await this.handleMessageFailure(message, result.error);
      }
      
    } catch (error) {
      await this.handleMessageFailure(message, error);
    } finally {
      // 从处理中移除
      this.processing.delete(message.id);
      
      const endTime = performance.now();
      const processTime = endTime - startTime;
      
      console.log(`📤 消息处理完成: ${message.id} (耗时: ${processTime.toFixed(2)}ms)`);
    }
  }
  
  /**
   * 调用消息处理器
   */
  async callMessageHandler(message) {
    return new Promise((resolve) => {
      // 触发消息处理事件
      this.emit('processMessage', message, (result) => {
        resolve(result);
      });
    });
  }
  
  /**
   * 处理消息失败
   */
  async handleMessageFailure(message, error) {
    message.attempts++;
    message.lastError = error;
    this.stats.failureCount++;
    
    if (message.attempts < message.maxAttempts) {
      // 重试
      this.stats.retryCount++;
      
      // 指数退避延迟
      const delay = this.options.retryDelay * Math.pow(2, message.attempts - 1);
      
      setTimeout(() => {
        // 重新入队
        this.queues[message.priority].unshift(message);
        this.stats.queueSize++;
        
        console.log(`🔄 消息重试: ${message.id} (第${message.attempts}次)`);
        this.emit('messageRetry', message);
      }, delay);
      
    } else {
      // 重试次数已达上限
      message.status = MessageStatus.FAILED;
      this.failedMessages.set(message.id, message);
      
      console.error(`❌ 消息失败: ${message.id}`, error);
      this.emit('messageFailed', message);
    }
  }
  
  /**
   * 处理确认超时
   */
  handleConfirmationTimeout(messageId) {
    const pendingMessage = this.pendingConfirmation.get(messageId);
    if (pendingMessage) {
      console.warn(`⏰ 消息确认超时: ${messageId}`);
      
      // 清理超时定时器
      clearTimeout(pendingMessage.timeout);
      this.pendingConfirmation.delete(messageId);
      
      // 可能需要重新入队或标记为失败
      this.emit('confirmationTimeout', pendingMessage);
    }
  }
  
  /**
   * 确认消息已送达
   */
  confirmDelivery(messageId) {
    const pendingMessage = this.pendingConfirmation.get(messageId);
    if (pendingMessage) {
      clearTimeout(pendingMessage.timeout);
      this.pendingConfirmation.delete(messageId);
      
      // 更新状态
      pendingMessage.status = MessageStatus.DELIVERED;
      
      console.log(`✅ 消息确认送达: ${messageId}`);
      this.emit('messageDelivered', pendingMessage);
    }
  }
  
  /**
   * 确认消息已读
   */
  confirmRead(messageId) {
    const pendingMessage = this.pendingConfirmation.get(messageId);
    if (pendingMessage) {
      clearTimeout(pendingMessage.timeout);
      this.pendingConfirmation.delete(messageId);
      
      // 更新状态
      pendingMessage.status = MessageStatus.READ;
      
      console.log(`📖 消息确认已读: ${messageId}`);
      this.emit('messageRead', pendingMessage);
    }
  }
  
  /**
   * 获取队列统计信息
   */
  getStats() {
    return {
      ...this.stats,
      queueSizes: {
        critical: this.queues[MessagePriority.CRITICAL].length,
        high: this.queues[MessagePriority.HIGH].length,
        normal: this.queues[MessagePriority.NORMAL].length,
        low: this.queues[MessagePriority.LOW].length
      },
      processing: this.processing.size,
      pendingConfirmation: this.pendingConfirmation.size,
      failedMessages: this.failedMessages.size
    };
  }
  
  /**
   * 获取总队列大小
   */
  getTotalQueueSize() {
    return Object.values(this.queues).reduce((total, queue) => total + queue.length, 0);
  }
  
  /**
   * 移除最老的低优先级消息
   */
  removeOldestLowPriorityMessage() {
    const priorities = [MessagePriority.LOW, MessagePriority.NORMAL];
    
    for (const priority of priorities) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        const removedMessage = queue.shift();
        this.stats.queueSize--;
        
        console.log(`🗑️ 移除过期消息: ${removedMessage.id}`);
        this.emit('messageExpired', removedMessage);
        return;
      }
    }
  }
  
  /**
   * 清空队列
   */
  clearQueue() {
    Object.values(this.queues).forEach(queue => queue.length = 0);
    this.processing.clear();
    this.pendingConfirmation.clear();
    this.failedMessages.clear();
    
    this.stats.queueSize = 0;
    
    console.log('🧹 队列已清空');
    this.emit('queueCleared');
  }
  
  /**
   * 启动处理器
   */
  startProcessor() {
    if (this.processTimer) return;
    
    this.processTimer = setInterval(() => {
      if (this.getTotalQueueSize() > 0) {
        this.processQueue();
      }
    }, this.options.processInterval);
    
    console.log('▶️ 队列处理器已启动');
  }
  
  /**
   * 停止处理器
   */
  stopProcessor() {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
      
      console.log('⏹️ 队列处理器已停止');
    }
  }
  
  /**
   * 持久化到本地存储
   */
  persistToStorage() {
    try {
      const data = {
        queues: this.queues,
        pendingConfirmation: Array.from(this.pendingConfirmation.entries()),
        failedMessages: Array.from(this.failedMessages.entries()),
        stats: this.stats
      };
      
      localStorage.setItem('messageQueue', JSON.stringify(data));
    } catch (error) {
      console.error('💾 持久化失败:', error);
    }
  }
  
  /**
   * 从本地存储恢复
   */
  restoreFromStorage() {
    try {
      const data = localStorage.getItem('messageQueue');
      if (data) {
        const parsed = JSON.parse(data);
        
        // 恢复队列
        this.queues = parsed.queues || this.queues;
        
        // 恢复确认等待队列
        if (parsed.pendingConfirmation) {
          this.pendingConfirmation = new Map(parsed.pendingConfirmation);
        }
        
        // 恢复失败消息
        if (parsed.failedMessages) {
          this.failedMessages = new Map(parsed.failedMessages);
        }
        
        // 恢复统计
        this.stats = { ...this.stats, ...parsed.stats };
        
        console.log('📂 队列状态已恢复');
        this.emit('queueRestored');
      }
    } catch (error) {
      console.error('📂 恢复失败:', error);
    }
  }
  
  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 事件监听
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }
  
  /**
   * 移除事件监听
   */
  off(event, handler) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  /**
   * 触发事件
   */
  emit(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`❌ 事件处理器错误 [${event}]:`, error);
        }
      });
    }
  }
  
  /**
   * 销毁队列管理器
   */
  destroy() {
    this.stopProcessor();
    
    // 清理所有定时器
    this.pendingConfirmation.forEach(message => {
      clearTimeout(message.timeout);
    });
    
    this.clearQueue();
    this.eventListeners.clear();
    
    console.log('🗑️ 消息队列管理器已销毁');
  }
}

// 消息缓存管理器
export class MessageCacheManager {
  constructor(options = {}) {
    this.options = {
      maxCacheSize: options.maxCacheSize || 10000,
      maxAge: options.maxAge || 3600000, // 1小时
      persistToStorage: options.persistToStorage !== false,
      compressionEnabled: options.compressionEnabled !== false,
      ...options
    };
    
    // 消息缓存
    this.cache = new Map();
    
    // 访问时间记录
    this.accessTimes = new Map();
    
    // 统计信息
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheSize: 0,
      totalRequests: 0
    };
    
    // 定期清理
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
    
    console.log('🗄️ 消息缓存管理器初始化完成');
  }
  
  /**
   * 设置缓存
   */
  set(key, value, options = {}) {
    const cacheEntry = {
      value,
      timestamp: Date.now(),
      maxAge: options.maxAge || this.options.maxAge,
      compressed: false
    };
    
    // 压缩大对象
    if (this.options.compressionEnabled && JSON.stringify(value).length > 1024) {
      cacheEntry.value = this.compress(value);
      cacheEntry.compressed = true;
    }
    
    // 检查缓存大小
    if (this.cache.size >= this.options.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, cacheEntry);
    this.accessTimes.set(key, Date.now());
    this.stats.cacheSize++;
    
    // 持久化
    if (this.options.persistToStorage) {
      this.persistToStorage();
    }
  }
  
  /**
   * 获取缓存
   */
  get(key) {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.cacheMisses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.maxAge) {
      this.delete(key);
      this.stats.cacheMisses++;
      return null;
    }
    
    // 更新访问时间
    this.accessTimes.set(key, Date.now());
    this.stats.cacheHits++;
    
    // 解压缩
    if (entry.compressed) {
      return this.decompress(entry.value);
    }
    
    return entry.value;
  }
  
  /**
   * 删除缓存
   */
  delete(key) {
    if (this.cache.delete(key)) {
      this.accessTimes.delete(key);
      this.stats.cacheSize--;
      return true;
    }
    return false;
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.maxAge) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 清理过期缓存: ${keysToDelete.length} 条`);
    }
  }
  
  /**
   * LRU驱逐
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
  
  /**
   * 压缩数据
   */
  compress(data) {
    // 简单的JSON压缩（实际应用中可以使用更高效的压缩算法）
    return JSON.stringify(data);
  }
  
  /**
   * 解压缩数据
   */
  decompress(data) {
    return JSON.parse(data);
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.stats.cacheSize = 0;
    
    console.log('🧹 缓存已清空');
  }
  
  /**
   * 持久化到本地存储
   */
  persistToStorage() {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        accessTimes: Array.from(this.accessTimes.entries()),
        stats: this.stats
      };
      
      localStorage.setItem('messageCache', JSON.stringify(data));
    } catch (error) {
      console.error('💾 缓存持久化失败:', error);
    }
  }
  
  /**
   * 从本地存储恢复
   */
  restoreFromStorage() {
    try {
      const data = localStorage.getItem('messageCache');
      if (data) {
        const parsed = JSON.parse(data);
        
        // 恢复缓存
        this.cache = new Map(parsed.cache || []);
        this.accessTimes = new Map(parsed.accessTimes || []);
        this.stats = { ...this.stats, ...parsed.stats };
        
        console.log('📂 缓存状态已恢复');
      }
    } catch (error) {
      console.error('📂 缓存恢复失败:', error);
    }
  }
  
  /**
   * 销毁缓存管理器
   */
  destroy() {
    clearInterval(this.cleanupTimer);
    this.clear();
    
    console.log('🗑️ 消息缓存管理器已销毁');
  }
}

// 创建全局实例
export const messageQueue = new MessageQueueManager();
export const messageCache = new MessageCacheManager();

// 导出默认配置
export default {
  MessageQueueManager,
  MessageCacheManager,
  MessageStatus,
  MessagePriority,
  messageQueue,
  messageCache
};