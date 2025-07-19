/**
 * 企业级内存管理器 - 智能缓存和内存优化
 * 
 * 特性：
 * - LRU缓存策略
 * - 内存监控和自动清理
 * - 对象池管理
 * - 垃圾回收优化
 * - 内存泄漏检测
 * - 性能指标收集
 */

// 配置常量
const MEMORY_CONFIG = {
  MAX_CACHE_SIZE: 10000,           // 最大缓存条目数
  MAX_MEMORY_USAGE: 512,           // 最大内存使用量(MB)
  CLEANUP_INTERVAL: 30000,         // 清理间隔(ms)
  MEMORY_CHECK_INTERVAL: 5000,     // 内存检查间隔(ms)
  WEAK_REF_THRESHOLD: 1000,        // 弱引用阈值
  POOL_SIZE: 100,                  // 对象池大小
  TTL_DEFAULT: 300000,             // 默认TTL(5分钟)
  PRIORITY_LEVELS: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  }
};

// LRU缓存节点
class CacheNode {
  constructor(key, value, priority = MEMORY_CONFIG.PRIORITY_LEVELS.MEDIUM, ttl = MEMORY_CONFIG.TTL_DEFAULT) {
    this.key = key;
    this.value = value;
    this.priority = priority;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.ttl = ttl;
    this.expiresAt = Date.now() + ttl;
    this.prev = null;
    this.next = null;
    this.size = this.calculateSize();
  }

  calculateSize() {
    try {
      return JSON.stringify(this.value).length;
    } catch {
      return 1024; // 默认大小
    }
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  updateAccess() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  getScore() {
    const age = Date.now() - this.createdAt;
    const recency = Date.now() - this.lastAccessed;
    return (this.accessCount * this.priority) / (age + recency + 1);
  }
}

// LRU缓存实现
class LRUCache {
  constructor(maxSize = MEMORY_CONFIG.MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
    this.totalSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  get(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      this.missCount++;
      return null;
    }

    if (node.isExpired()) {
      this.remove(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    node.updateAccess();
    this.moveToHead(node);
    return node.value;
  }

  set(key, value, priority = MEMORY_CONFIG.PRIORITY_LEVELS.MEDIUM, ttl = MEMORY_CONFIG.TTL_DEFAULT) {
    const existing = this.cache.get(key);
    
    if (existing) {
      existing.value = value;
      existing.priority = priority;
      existing.ttl = ttl;
      existing.expiresAt = Date.now() + ttl;
      existing.size = existing.calculateSize();
      existing.updateAccess();
      this.moveToHead(existing);
      return;
    }

    const node = new CacheNode(key, value, priority, ttl);
    
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUseful();
    }

    this.cache.set(key, node);
    this.totalSize += node.size;
    this.addToHead(node);
  }

  remove(key) {
    const node = this.cache.get(key);
    if (!node) return false;

    this.cache.delete(key);
    this.totalSize -= node.size;
    this.removeNode(node);
    return true;
  }

  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.totalSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  // 清理过期项
  cleanupExpired() {
    const now = Date.now();
    const keysToRemove = [];

    for (const [key, node] of this.cache) {
      if (node.isExpired()) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.remove(key);
    }

    return keysToRemove.length;
  }

  // 驱逐最少使用的项
  evictLeastUseful() {
    if (!this.tail) return;

    // 按分数排序找到最少使用的项
    const nodes = Array.from(this.cache.values());
    nodes.sort((a, b) => a.getScore() - b.getScore());

    const toEvict = nodes.slice(0, Math.max(1, nodes.length * 0.1)); // 驱逐10%的项
    
    for (const node of toEvict) {
      this.remove(node.key);
    }
  }

  // 链表操作
  addToHead(node) {
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
  }

  removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  moveToHead(node) {
    this.removeNode(node);
    this.addToHead(node);
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }
}

// 对象池管理
class ObjectPool {
  constructor(createFn, resetFn, maxSize = MEMORY_CONFIG.POOL_SIZE) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.pool = [];
    this.allocated = 0;
    this.recycled = 0;
  }

  get() {
    if (this.pool.length > 0) {
      this.recycled++;
      return this.pool.pop();
    }

    this.allocated++;
    return this.createFn();
  }

  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear() {
    this.pool = [];
    this.allocated = 0;
    this.recycled = 0;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      allocated: this.allocated,
      recycled: this.recycled,
      reuseRate: this.allocated > 0 ? (this.recycled / this.allocated) * 100 : 0
    };
  }
}

// 内存监控器
class MemoryMonitor {
  constructor() {
    this.metrics = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      peakUsage: 0,
      gcCount: 0,
      gcTime: 0
    };
    
    this.measurements = [];
    this.listeners = new Set();
    this.gcObserver = null;
    this.startTime = Date.now();
  }

  start() {
    // 启动GC观察器
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.includes('gc')) {
              this.metrics.gcCount++;
              this.metrics.gcTime += entry.duration;
            }
          }
        });
        
        this.gcObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('GC监控不可用:', error);
      }
    }

    // 定期收集内存信息
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, MEMORY_CONFIG.MEMORY_CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }
  }

  collectMetrics() {
    const now = Date.now();
    
    if (performance.memory) {
      this.metrics.heapUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      this.metrics.heapTotal = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
      this.metrics.external = Math.round((performance.memory.totalJSHeapSize - performance.memory.usedJSHeapSize) / 1024 / 1024);
      
      if (this.metrics.heapUsed > this.metrics.peakUsage) {
        this.metrics.peakUsage = this.metrics.heapUsed;
      }
    }

    const measurement = {
      timestamp: now,
      ...this.metrics
    };

    this.measurements.push(measurement);
    
    // 保留最近100次测量
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }

    // 通知监听器
    for (const listener of this.listeners) {
      listener(measurement);
    }

    // 检查内存使用量
    if (this.metrics.heapUsed > MEMORY_CONFIG.MAX_MEMORY_USAGE) {
      this.triggerMemoryWarning();
    }
  }

  triggerMemoryWarning() {
    console.warn(`内存使用量过高: ${this.metrics.heapUsed}MB / ${MEMORY_CONFIG.MAX_MEMORY_USAGE}MB`);
    
    // 触发内存清理
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getHistory() {
    return [...this.measurements];
  }

  getTrend() {
    if (this.measurements.length < 2) return 0;
    
    const recent = this.measurements.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    return ((last.heapUsed - first.heapUsed) / (last.timestamp - first.timestamp)) * 1000; // MB/s
  }
}

// 主内存管理器
class MemoryManager {
  constructor() {
    this.cache = new LRUCache();
    this.monitor = new MemoryMonitor();
    this.pools = new Map();
    this.cleanupIntervalId = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.monitor.start();
    this.startCleanupScheduler();
    this.isInitialized = true;

    console.log('✅ 内存管理器已初始化');
  }

  destroy() {
    if (!this.isInitialized) return;

    this.monitor.stop();
    this.stopCleanupScheduler();
    this.cache.clear();
    this.pools.clear();
    this.isInitialized = false;

    console.log('🧹 内存管理器已销毁');
  }

  // 缓存管理
  get(key) {
    return this.cache.get(key);
  }

  set(key, value, priority = MEMORY_CONFIG.PRIORITY_LEVELS.MEDIUM, ttl = MEMORY_CONFIG.TTL_DEFAULT) {
    this.cache.set(key, value, priority, ttl);
  }

  remove(key) {
    return this.cache.remove(key);
  }

  clear() {
    this.cache.clear();
  }

  // 对象池管理
  createPool(name, createFn, resetFn, maxSize = MEMORY_CONFIG.POOL_SIZE) {
    const pool = new ObjectPool(createFn, resetFn, maxSize);
    this.pools.set(name, pool);
    return pool;
  }

  getPool(name) {
    return this.pools.get(name);
  }

  removePool(name) {
    const pool = this.pools.get(name);
    if (pool) {
      pool.clear();
      this.pools.delete(name);
    }
  }

  // 清理调度器
  startCleanupScheduler() {
    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup();
    }, MEMORY_CONFIG.CLEANUP_INTERVAL);
  }

  stopCleanupScheduler() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  performCleanup() {
    const startTime = Date.now();
    
    // 清理过期缓存
    const expiredCount = this.cache.cleanupExpired();
    
    // 检查内存使用量
    const metrics = this.monitor.getMetrics();
    const isMemoryHigh = metrics.heapUsed > MEMORY_CONFIG.MAX_MEMORY_USAGE * 0.8;
    
    if (isMemoryHigh) {
      // 强制清理
      this.cache.evictLeastUseful();
    }

    const endTime = Date.now();
    
    console.log(`🧹 内存清理完成: 清理${expiredCount}个过期项, 耗时${endTime - startTime}ms, 内存使用: ${metrics.heapUsed}MB`);
  }

  // 性能统计
  getStats() {
    const cacheStats = this.cache.getStats();
    const memoryStats = this.monitor.getMetrics();
    const poolStats = {};
    
    for (const [name, pool] of this.pools) {
      poolStats[name] = pool.getStats();
    }

    return {
      cache: cacheStats,
      memory: memoryStats,
      pools: poolStats,
      memoryTrend: this.monitor.getTrend()
    };
  }

  // 内存监控
  addMemoryListener(listener) {
    this.monitor.addListener(listener);
  }

  removeMemoryListener(listener) {
    this.monitor.removeListener(listener);
  }
}

// 单例实例
const memoryManager = new MemoryManager();

// 预定义对象池
const createMessagePool = () => {
  return memoryManager.createPool(
    'messages',
    () => ({
      id: null,
      content: '',
      from: '',
      to: '',
      timestamp: null,
      type: 'text',
      isRead: false
    }),
    (obj) => {
      obj.id = null;
      obj.content = '';
      obj.from = '';
      obj.to = '';
      obj.timestamp = null;
      obj.type = 'text';
      obj.isRead = false;
    }
  );
};

const createUserPool = () => {
  return memoryManager.createPool(
    'users',
    () => ({
      user_id: '',
      user_name: '',
      status: 'offline',
      lastMessage: '',
      lastMessageTime: null,
      unreadCount: 0,
      avatar: null
    }),
    (obj) => {
      obj.user_id = '';
      obj.user_name = '';
      obj.status = 'offline';
      obj.lastMessage = '';
      obj.lastMessageTime = null;
      obj.unreadCount = 0;
      obj.avatar = null;
    }
  );
};

// 导出
export default memoryManager;
export { MemoryManager, LRUCache, ObjectPool, MemoryMonitor, createMessagePool, createUserPool };
export { MEMORY_CONFIG };