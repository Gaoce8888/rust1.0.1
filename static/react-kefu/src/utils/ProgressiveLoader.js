/**
 * 渐进式加载器 - 智能预加载和懒加载系统
 * 
 * 特性：
 * - 智能预加载策略
 * - 懒加载优化
 * - 资源优先级管理
 * - 网络感知加载
 * - 用户行为预测
 * - 缓存优化
 * - 加载性能监控
 */

import memoryManager from './MemoryManager.js';

// 加载配置
const LOADER_CONFIG = {
  PRELOAD_DISTANCE: 200,           // 预加载距离(px)
  PRELOAD_COUNT: 10,               // 预加载数量
  BATCH_SIZE: 5,                   // 批处理大小
  CACHE_TTL: 300000,               // 缓存TTL(5分钟)
  RETRY_COUNT: 3,                  // 重试次数
  RETRY_DELAY: 1000,               // 重试延迟
  NETWORK_TIMEOUT: 5000,           // 网络超时
  PRIORITY_LEVELS: {
    IMMEDIATE: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    BACKGROUND: 4
  }
};

// 加载状态
const LOAD_STATUS = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

// 网络连接类型
const CONNECTION_TYPES = {
  SLOW_2G: 'slow-2g',
  SLOW_3G: '3g',
  FAST_3G: '3g',
  FAST_4G: '4g',
  WIFI: 'wifi',
  UNKNOWN: 'unknown'
};

// 加载任务
class LoadTask {
  constructor(id, loadFn, priority = LOADER_CONFIG.PRIORITY_LEVELS.MEDIUM, dependencies = []) {
    this.id = id;
    this.loadFn = loadFn;
    this.priority = priority;
    this.dependencies = dependencies;
    this.status = LOAD_STATUS.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
    this.retryCount = 0;
    this.abortController = new AbortController();
    this.listeners = new Set();
  }

  async execute() {
    if (this.status !== LOAD_STATUS.PENDING) {
      return this.result;
    }

    this.status = LOAD_STATUS.LOADING;
    this.startTime = Date.now();
    
    try {
      this.result = await this.loadFn(this.abortController.signal);
      this.status = LOAD_STATUS.LOADED;
      this.endTime = Date.now();
      this.notifyListeners('loaded', this.result);
      return this.result;
    } catch (error) {
      this.error = error;
      this.status = LOAD_STATUS.ERROR;
      this.endTime = Date.now();
      this.notifyListeners('error', error);
      throw error;
    }
  }

  abort() {
    if (this.status === LOAD_STATUS.LOADING) {
      this.abortController.abort();
      this.status = LOAD_STATUS.CANCELLED;
      this.notifyListeners('cancelled');
    }
  }

  retry() {
    if (this.retryCount < LOADER_CONFIG.RETRY_COUNT) {
      this.retryCount++;
      this.status = LOAD_STATUS.PENDING;
      this.error = null;
      this.abortController = new AbortController();
      return this.execute();
    }
    throw new Error('Max retry attempts exceeded');
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      listener({ event, data, task: this });
    }
  }

  getDuration() {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }
    return null;
  }
}

// 网络感知器
class NetworkAwareLoader {
  constructor() {
    this.connectionType = CONNECTION_TYPES.UNKNOWN;
    this.effectiveType = '4g';
    this.saveData = false;
    this.downlink = 10;
    this.rtt = 100;
    
    this.detectConnection();
    this.setupConnectionMonitoring();
  }

  detectConnection() {
    if (navigator.connection) {
      const conn = navigator.connection;
      this.connectionType = conn.type || CONNECTION_TYPES.UNKNOWN;
      this.effectiveType = conn.effectiveType || '4g';
      this.saveData = conn.saveData || false;
      this.downlink = conn.downlink || 10;
      this.rtt = conn.rtt || 100;
    }
  }

  setupConnectionMonitoring() {
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.detectConnection();
        console.log('网络连接变化:', this.getConnectionInfo());
      });
    }
  }

  getConnectionInfo() {
    return {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      saveData: this.saveData,
      downlink: this.downlink,
      rtt: this.rtt
    };
  }

  shouldReduceQuality() {
    return this.saveData || 
           this.effectiveType === 'slow-2g' || 
           this.effectiveType === '2g' ||
           this.downlink < 1.5;
  }

  getOptimalBatchSize() {
    if (this.shouldReduceQuality()) {
      return Math.max(1, Math.floor(LOADER_CONFIG.BATCH_SIZE / 2));
    }
    
    if (this.effectiveType === '4g' || this.connectionType === CONNECTION_TYPES.WIFI) {
      return LOADER_CONFIG.BATCH_SIZE * 2;
    }
    
    return LOADER_CONFIG.BATCH_SIZE;
  }

  getOptimalPreloadCount() {
    if (this.shouldReduceQuality()) {
      return Math.max(3, Math.floor(LOADER_CONFIG.PRELOAD_COUNT / 2));
    }
    
    return LOADER_CONFIG.PRELOAD_COUNT;
  }
}

// 用户行为预测器
class BehaviorPredictor {
  constructor() {
    this.scrollHistory = [];
    this.interactionHistory = [];
    this.patterns = new Map();
    this.predictions = new Map();
  }

  recordScroll(scrollY, timestamp = Date.now()) {
    this.scrollHistory.push({ scrollY, timestamp });
    
    // 保留最近100条记录
    if (this.scrollHistory.length > 100) {
      this.scrollHistory.shift();
    }
    
    this.analyzeScrollPattern();
  }

  recordInteraction(type, target, timestamp = Date.now()) {
    this.interactionHistory.push({ type, target, timestamp });
    
    // 保留最近50条记录
    if (this.interactionHistory.length > 50) {
      this.interactionHistory.shift();
    }
    
    this.analyzeInteractionPattern();
  }

  analyzeScrollPattern() {
    if (this.scrollHistory.length < 3) return;

    const recent = this.scrollHistory.slice(-3);
    const velocities = [];
    
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      const velocity = (curr.scrollY - prev.scrollY) / (curr.timestamp - prev.timestamp);
      velocities.push(velocity);
    }

    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    
    // 预测下一个滚动位置
    const lastPosition = recent[recent.length - 1].scrollY;
    const predictedPosition = lastPosition + (avgVelocity * 1000); // 1秒后的位置

    this.predictions.set('scroll', {
      position: predictedPosition,
      velocity: avgVelocity,
      confidence: this.calculateScrollConfidence(velocities)
    });
  }

  analyzeInteractionPattern() {
    if (this.interactionHistory.length < 2) return;

    const recent = this.interactionHistory.slice(-10);
    const targetCounts = new Map();
    
    for (const interaction of recent) {
      const count = targetCounts.get(interaction.target) || 0;
      targetCounts.set(interaction.target, count + 1);
    }

    // 找出最频繁的交互目标
    const mostFrequent = Array.from(targetCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostFrequent) {
      this.predictions.set('interaction', {
        target: mostFrequent[0],
        frequency: mostFrequent[1],
        confidence: mostFrequent[1] / recent.length
      });
    }
  }

  calculateScrollConfidence(velocities) {
    if (velocities.length < 2) return 0;
    
    const variance = velocities.reduce((sum, v) => {
      const mean = velocities.reduce((s, vel) => s + vel, 0) / velocities.length;
      return sum + Math.pow(v - mean, 2);
    }, 0) / velocities.length;
    
    return Math.max(0, Math.min(1, 1 - variance / 1000));
  }

  getPrediction(type) {
    return this.predictions.get(type);
  }

  shouldPreloadBasedOnBehavior() {
    const scrollPrediction = this.predictions.get('scroll');
    const interactionPrediction = this.predictions.get('interaction');
    
    if (scrollPrediction && scrollPrediction.confidence > 0.7) {
      return true;
    }
    
    if (interactionPrediction && interactionPrediction.confidence > 0.6) {
      return true;
    }
    
    return false;
  }
}

// 资源优先级管理器
class PriorityManager {
  constructor() {
    this.queues = new Map();
    this.activeLoads = new Set();
    this.maxConcurrentLoads = 6;
    this.priorityWeights = new Map([
      [LOADER_CONFIG.PRIORITY_LEVELS.IMMEDIATE, 1000],
      [LOADER_CONFIG.PRIORITY_LEVELS.HIGH, 100],
      [LOADER_CONFIG.PRIORITY_LEVELS.MEDIUM, 10],
      [LOADER_CONFIG.PRIORITY_LEVELS.LOW, 1],
      [LOADER_CONFIG.PRIORITY_LEVELS.BACKGROUND, 0.1]
    ]);
  }

  addTask(task) {
    const priority = task.priority;
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
    }
    
    this.queues.get(priority).push(task);
    this.scheduleExecution();
  }

  scheduleExecution() {
    if (this.activeLoads.size >= this.maxConcurrentLoads) {
      return;
    }

    const task = this.getNextTask();
    if (!task) {
      return;
    }

    this.activeLoads.add(task);
    
    task.execute()
      .then(() => {
        this.activeLoads.delete(task);
        this.scheduleExecution();
      })
      .catch(() => {
        this.activeLoads.delete(task);
        this.scheduleExecution();
      });
  }

  getNextTask() {
    // 按优先级排序
    const priorities = Array.from(this.queues.keys()).sort((a, b) => a - b);
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    
    return null;
  }

  updateMaxConcurrentLoads(networkInfo) {
    if (networkInfo.shouldReduceQuality()) {
      this.maxConcurrentLoads = 2;
    } else if (networkInfo.effectiveType === '4g' || networkInfo.connectionType === CONNECTION_TYPES.WIFI) {
      this.maxConcurrentLoads = 8;
    } else {
      this.maxConcurrentLoads = 4;
    }
  }

  getQueueStatus() {
    const status = {};
    for (const [priority, queue] of this.queues) {
      status[priority] = queue.length;
    }
    return {
      queues: status,
      activeLoads: this.activeLoads.size,
      maxConcurrentLoads: this.maxConcurrentLoads
    };
  }
}

// 主渐进式加载器
class ProgressiveLoader {
  constructor() {
    this.tasks = new Map();
    this.networkAware = new NetworkAwareLoader();
    this.behaviorPredictor = new BehaviorPredictor();
    this.priorityManager = new PriorityManager();
    this.cache = new Map();
    this.loadingStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageLoadTime: 0,
      totalLoadTime: 0
    };
    
    this.init();
  }

  init() {
    // 初始化内存管理
    memoryManager.init();
    
    // 设置网络感知
    const networkInfo = this.networkAware.getConnectionInfo();
    this.priorityManager.updateMaxConcurrentLoads(this.networkAware);
    
    // 设置页面可见性监听
    this.setupVisibilityChangeListener();
    
    // 设置滚动监听
    this.setupScrollListener();
    
    console.log('📦 渐进式加载器已初始化');
  }

  setupVisibilityChangeListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseBackgroundLoads();
      } else {
        this.resumeBackgroundLoads();
      }
    });
  }

  setupScrollListener() {
    let lastScrollY = 0;
    let scrollTimeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      this.behaviorPredictor.recordScroll(currentScrollY);
      
      // 检查是否需要预加载
      if (this.behaviorPredictor.shouldPreloadBasedOnBehavior()) {
        this.triggerIntelligentPreload();
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    }, { passive: true });
  }

  // 创建加载任务
  createLoadTask(id, loadFn, priority = LOADER_CONFIG.PRIORITY_LEVELS.MEDIUM, dependencies = []) {
    const task = new LoadTask(id, loadFn, priority, dependencies);
    this.tasks.set(id, task);
    return task;
  }

  // 加载资源
  async load(id, loadFn, options = {}) {
    const {
      priority = LOADER_CONFIG.PRIORITY_LEVELS.MEDIUM,
      dependencies = [],
      useCache = true,
      cacheKey = id,
      ttl = LOADER_CONFIG.CACHE_TTL
    } = options;

    this.loadingStats.totalRequests++;

    // 检查缓存
    if (useCache) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.loadingStats.cacheHits++;
        return cached;
      }
    }

    // 检查是否已有相同任务
    const existingTask = this.tasks.get(id);
    if (existingTask) {
      return existingTask.execute();
    }

    // 创建新任务
    const task = this.createLoadTask(id, loadFn, priority, dependencies);
    
    // 等待依赖
    await this.waitForDependencies(dependencies);
    
    // 添加到优先级队列
    this.priorityManager.addTask(task);
    
    try {
      const result = await task.execute();
      
      // 更新统计
      this.loadingStats.successfulRequests++;
      this.loadingStats.totalLoadTime += task.getDuration();
      this.loadingStats.averageLoadTime = this.loadingStats.totalLoadTime / this.loadingStats.successfulRequests;
      
      // 缓存结果
      if (useCache) {
        this.setCachedResult(cacheKey, result, ttl);
      }
      
      return result;
    } catch (error) {
      this.loadingStats.failedRequests++;
      throw error;
    } finally {
      this.tasks.delete(id);
    }
  }

  // 预加载
  async preload(items, options = {}) {
    const {
      priority = LOADER_CONFIG.PRIORITY_LEVELS.BACKGROUND,
      batchSize = this.networkAware.getOptimalBatchSize(),
      useIntelligentPriority = true
    } = options;

    const preloadTasks = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item, index) => {
        const itemPriority = useIntelligentPriority ? 
          this.calculateIntelligentPriority(item, index) : 
          priority;
        
        return this.load(
          `preload_${item.id || i + index}`,
          item.loadFn,
          { priority: itemPriority, useCache: true }
        );
      });
      
      preloadTasks.push(...batchPromises);
      
      // 网络感知延迟
      if (this.networkAware.shouldReduceQuality()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return Promise.allSettled(preloadTasks);
  }

  // 智能预加载
  async triggerIntelligentPreload() {
    const scrollPrediction = this.behaviorPredictor.getPrediction('scroll');
    const interactionPrediction = this.behaviorPredictor.getPrediction('interaction');
    
    if (scrollPrediction && scrollPrediction.confidence > 0.7) {
      console.log('🔮 基于滚动行为触发智能预加载');
      // 这里可以根据滚动预测加载相关内容
    }
    
    if (interactionPrediction && interactionPrediction.confidence > 0.6) {
      console.log('🔮 基于交互行为触发智能预加载');
      // 这里可以根据交互预测加载相关内容
    }
  }

  // 计算智能优先级
  calculateIntelligentPriority(item, index) {
    let priority = LOADER_CONFIG.PRIORITY_LEVELS.BACKGROUND;
    
    // 距离越近优先级越高
    if (index < 3) {
      priority = LOADER_CONFIG.PRIORITY_LEVELS.HIGH;
    } else if (index < 10) {
      priority = LOADER_CONFIG.PRIORITY_LEVELS.MEDIUM;
    }
    
    // 根据网络状况调整
    if (this.networkAware.shouldReduceQuality()) {
      priority = Math.min(priority + 1, LOADER_CONFIG.PRIORITY_LEVELS.BACKGROUND);
    }
    
    return priority;
  }

  // 等待依赖
  async waitForDependencies(dependencies) {
    if (dependencies.length === 0) return;
    
    const dependencyPromises = dependencies.map(dep => {
      const task = this.tasks.get(dep);
      return task ? task.execute() : Promise.resolve();
    });
    
    await Promise.all(dependencyPromises);
  }

  // 缓存管理
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  setCachedResult(key, result, ttl) {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + ttl,
      size: JSON.stringify(result).length
    });
    
    // 清理过期缓存
    this.cleanupExpiredCache();
  }

  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache) {
      if (cached.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  // 暂停和恢复后台加载
  pauseBackgroundLoads() {
    console.log('⏸️ 暂停后台加载');
    // 取消低优先级任务
    for (const task of this.tasks.values()) {
      if (task.priority >= LOADER_CONFIG.PRIORITY_LEVELS.LOW) {
        task.abort();
      }
    }
  }

  resumeBackgroundLoads() {
    console.log('▶️ 恢复后台加载');
    // 重新调度任务
    this.priorityManager.scheduleExecution();
  }

  // 获取统计信息
  getStats() {
    return {
      ...this.loadingStats,
      cacheSize: this.cache.size,
      activeTasks: this.tasks.size,
      queueStatus: this.priorityManager.getQueueStatus(),
      networkInfo: this.networkAware.getConnectionInfo(),
      behaviorPredictions: {
        scroll: this.behaviorPredictor.getPrediction('scroll'),
        interaction: this.behaviorPredictor.getPrediction('interaction')
      }
    };
  }

  // 清理
  cleanup() {
    this.cache.clear();
    this.tasks.clear();
    memoryManager.destroy();
    console.log('🧹 渐进式加载器已清理');
  }
}

// 单例实例
const progressiveLoader = new ProgressiveLoader();

// 工具函数
export const loadWithProgress = (id, loadFn, options) => {
  return progressiveLoader.load(id, loadFn, options);
};

export const preloadResources = (items, options) => {
  return progressiveLoader.preload(items, options);
};

export const recordUserInteraction = (type, target) => {
  progressiveLoader.behaviorPredictor.recordInteraction(type, target);
};

// 导出
export default progressiveLoader;
export { 
  ProgressiveLoader, 
  LoadTask, 
  NetworkAwareLoader, 
  BehaviorPredictor, 
  PriorityManager,
  LOADER_CONFIG,
  LOAD_STATUS,
  CONNECTION_TYPES
};