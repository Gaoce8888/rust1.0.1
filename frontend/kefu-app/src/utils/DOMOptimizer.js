/**
 * DOM优化器 - 高效DOM更新和重绘优化
 * 
 * 特性：
 * - 批量DOM更新
 * - 防抖重绘调度
 * - 虚拟DOM差异检测
 * - 布局抖动防护
 * - 样式计算优化
 * - 滚动性能优化
 * - 重绘区域控制
 */

// DOM优化配置
const DOM_CONFIG = {
  BATCH_UPDATE_DELAY: 16,          // 批量更新延迟(1帧)
  DEBOUNCE_SCROLL: 16,             // 滚动防抖
  DEBOUNCE_RESIZE: 100,            // 窗口调整防抖
  MAX_UPDATES_PER_FRAME: 10,       // 每帧最大更新数
  INTERSECTION_THRESHOLD: 0.1,     // 可见性阈值
  MUTATION_BATCH_SIZE: 50,         // 变更批处理大小
  STYLE_BATCH_SIZE: 20,            // 样式批处理大小
  LAYOUT_THRASHING_THRESHOLD: 5    // 布局抖动阈值
};

// 更新类型
const UPDATE_TYPES = {
  STYLE: 'style',
  ATTRIBUTE: 'attribute',
  TEXT: 'text',
  APPEND: 'append',
  REMOVE: 'remove',
  REPLACE: 'replace'
};

// 重绘层级
const REPAINT_LAYERS = {
  LAYOUT: 3,    // 触发布局
  PAINT: 2,     // 触发绘制
  COMPOSITE: 1  // 仅合成
};

// DOM更新任务
class DOMUpdateTask {
  constructor(element, type, operation, priority = 1) {
    this.element = element;
    this.type = type;
    this.operation = operation;
    this.priority = priority;
    this.timestamp = Date.now();
    this.id = this.generateId();
    this.dependencies = [];
    this.completed = false;
  }

  generateId() {
    return `dom_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  execute() {
    if (this.completed) return;

    try {
      this.operation();
      this.completed = true;
      return true;
    } catch (error) {
      console.error('DOM更新任务执行失败:', error);
      return false;
    }
  }

  canBatch(otherTask) {
    // 相同元素的样式更新可以批处理
    if (this.element === otherTask.element && 
        this.type === UPDATE_TYPES.STYLE && 
        otherTask.type === UPDATE_TYPES.STYLE) {
      return true;
    }
    
    // 相同父元素的添加操作可以批处理
    if (this.element === otherTask.element && 
        this.type === UPDATE_TYPES.APPEND && 
        otherTask.type === UPDATE_TYPES.APPEND) {
      return true;
    }
    
    return false;
  }
}

// 批量更新调度器
class BatchUpdateScheduler {
  constructor() {
    this.updateQueue = [];
    this.scheduledFrame = null;
    this.isUpdating = false;
    this.frameStartTime = 0;
    this.updateCount = 0;
  }

  schedule(task) {
    this.updateQueue.push(task);
    this.requestUpdate();
  }

  requestUpdate() {
    if (this.scheduledFrame) return;

    this.scheduledFrame = requestAnimationFrame(() => {
      this.scheduledFrame = null;
      this.processBatch();
    });
  }

  processBatch() {
    if (this.isUpdating) return;

    this.isUpdating = true;
    this.frameStartTime = performance.now();
    this.updateCount = 0;

    // 按优先级和类型排序
    this.updateQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    // 批量处理更新
    const batches = this.createBatches();
    
    for (const batch of batches) {
      if (this.shouldYieldToMain()) {
        this.scheduleRemainingBatch(batch);
        break;
      }
      
      this.processBatchGroup(batch);
    }

    this.updateQueue = [];
    this.isUpdating = false;
  }

  createBatches() {
    const batches = new Map();
    const processed = new Set();

    for (const task of this.updateQueue) {
      if (processed.has(task.id)) continue;

      const batchKey = this.getBatchKey(task);
      if (!batches.has(batchKey)) {
        batches.set(batchKey, []);
      }

      const batch = batches.get(batchKey);
      batch.push(task);
      processed.add(task.id);

      // 查找可以批处理的任务
      for (const otherTask of this.updateQueue) {
        if (processed.has(otherTask.id)) continue;
        
        if (task.canBatch(otherTask)) {
          batch.push(otherTask);
          processed.add(otherTask.id);
        }
      }
    }

    return Array.from(batches.values());
  }

  getBatchKey(task) {
    return `${task.element.id || task.element.tagName}_${task.type}`;
  }

  processBatchGroup(batch) {
    // 分组执行以避免布局抖动
    const styleUpdates = batch.filter(task => task.type === UPDATE_TYPES.STYLE);
    const domUpdates = batch.filter(task => task.type !== UPDATE_TYPES.STYLE);

    // 先执行样式更新
    if (styleUpdates.length > 0) {
      this.processBatchedStyleUpdates(styleUpdates);
    }

    // 再执行DOM更新
    if (domUpdates.length > 0) {
      this.processBatchedDOMUpdates(domUpdates);
    }

    this.updateCount += batch.length;
  }

  processBatchedStyleUpdates(styleUpdates) {
    // 批量样式更新避免重排
    const elementStyles = new Map();

    for (const task of styleUpdates) {
      if (!elementStyles.has(task.element)) {
        elementStyles.set(task.element, []);
      }
      elementStyles.get(task.element).push(task);
    }

    for (const [element, tasks] of elementStyles) {
      const styles = {};
      
      for (const task of tasks) {
        task.operation(); // 收集样式更改
      }

      // 一次性应用所有样式
      Object.assign(element.style, styles);
    }
  }

  processBatchedDOMUpdates(domUpdates) {
    // 按类型分组执行
    const removeUpdates = domUpdates.filter(task => task.type === UPDATE_TYPES.REMOVE);
    const appendUpdates = domUpdates.filter(task => task.type === UPDATE_TYPES.APPEND);
    const otherUpdates = domUpdates.filter(task => 
      task.type !== UPDATE_TYPES.REMOVE && task.type !== UPDATE_TYPES.APPEND
    );

    // 先删除，后添加，最后其他操作
    [...removeUpdates, ...appendUpdates, ...otherUpdates].forEach(task => {
      task.execute();
    });
  }

  shouldYieldToMain() {
    const elapsed = performance.now() - this.frameStartTime;
    return elapsed > 12 || this.updateCount >= DOM_CONFIG.MAX_UPDATES_PER_FRAME;
  }

  scheduleRemainingBatch(remainingTasks) {
    setTimeout(() => {
      this.updateQueue = remainingTasks;
      this.requestUpdate();
    }, 0);
  }
}

// 布局抖动检测器
class LayoutThrashingDetector {
  constructor() {
    this.layoutCount = 0;
    this.layoutTimes = [];
    this.isDetecting = false;
    this.threshold = DOM_CONFIG.LAYOUT_THRASHING_THRESHOLD;
  }

  startDetection() {
    this.isDetecting = true;
    this.layoutCount = 0;
    this.layoutTimes = [];
    
    // 监听强制布局
    this.wrapLayoutTriggers();
  }

  stopDetection() {
    this.isDetecting = false;
  }

  wrapLayoutTriggers() {
    const layoutProperties = [
      'offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight',
      'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight',
      'clientTop', 'clientLeft', 'clientWidth', 'clientHeight'
    ];

    const originalPropertyDescriptors = new Map();

    layoutProperties.forEach(property => {
      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, property);
      if (descriptor && descriptor.get) {
        originalPropertyDescriptors.set(property, descriptor);
        
        Object.defineProperty(Element.prototype, property, {
          get: function() {
            if (this.isDetecting) {
              this.recordLayoutTrigger(property);
            }
            return descriptor.get.call(this);
          },
          configurable: true
        });
      }
    });

    // 恢复原始属性的方法
    this.restoreProperties = () => {
      layoutProperties.forEach(property => {
        const descriptor = originalPropertyDescriptors.get(property);
        if (descriptor) {
          Object.defineProperty(Element.prototype, property, descriptor);
        }
      });
    };
  }

  recordLayoutTrigger(property) {
    this.layoutCount++;
    this.layoutTimes.push({
      property,
      timestamp: performance.now()
    });

    if (this.layoutCount >= this.threshold) {
      this.detectThrashing();
    }
  }

  detectThrashing() {
    const recentLayouts = this.layoutTimes.slice(-this.threshold);
    const timeSpan = recentLayouts[recentLayouts.length - 1].timestamp - recentLayouts[0].timestamp;
    
    if (timeSpan < 100) { // 100ms内多次布局触发
      console.warn('🚨 检测到布局抖动:', {
        count: this.threshold,
        timeSpan,
        properties: recentLayouts.map(l => l.property)
      });
      
      this.emitThrashingWarning();
    }
  }

  emitThrashingWarning() {
    const event = new CustomEvent('layoutThrashing', {
      detail: {
        count: this.layoutCount,
        recentTriggers: this.layoutTimes.slice(-5)
      }
    });
    
    window.dispatchEvent(event);
  }

  cleanup() {
    this.stopDetection();
    if (this.restoreProperties) {
      this.restoreProperties();
    }
  }
}

// 可见性管理器
class VisibilityManager {
  constructor() {
    this.observer = null;
    this.visibleElements = new Set();
    this.hiddenElements = new Set();
    this.callbacks = new Map();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          threshold: DOM_CONFIG.INTERSECTION_THRESHOLD,
          rootMargin: '50px'
        }
      );
      
      this.initialized = true;
      console.log('👁️ 可见性管理器已初始化');
    } else {
      console.warn('IntersectionObserver 不可用');
    }
  }

  observe(element, callback) {
    if (!this.initialized) return;

    this.observer.observe(element);
    this.callbacks.set(element, callback);
  }

  unobserve(element) {
    if (!this.initialized) return;

    this.observer.unobserve(element);
    this.callbacks.delete(element);
    this.visibleElements.delete(element);
    this.hiddenElements.delete(element);
  }

  handleIntersection(entries) {
    for (const entry of entries) {
      const element = entry.target;
      const callback = this.callbacks.get(element);
      
      if (entry.isIntersecting) {
        this.visibleElements.add(element);
        this.hiddenElements.delete(element);
        
        if (callback) {
          callback(true, entry);
        }
      } else {
        this.visibleElements.delete(element);
        this.hiddenElements.add(element);
        
        if (callback) {
          callback(false, entry);
        }
      }
    }
  }

  isVisible(element) {
    return this.visibleElements.has(element);
  }

  getVisibleElements() {
    return Array.from(this.visibleElements);
  }

  getHiddenElements() {
    return Array.from(this.hiddenElements);
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.visibleElements.clear();
    this.hiddenElements.clear();
    this.callbacks.clear();
    this.initialized = false;
  }
}

// 滚动优化器
class ScrollOptimizer {
  constructor() {
    this.scrollCallbacks = new Set();
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.lastScrollY = 0;
    this.scrollDirection = 'down';
    this.scrollVelocity = 0;
    this.raf = null;
  }

  init() {
    this.setupScrollListener();
    console.log('📜 滚动优化器已初始化');
  }

  setupScrollListener() {
    let lastScrollTime = performance.now();
    
    const handleScroll = () => {
      const currentScrollY = window.pageYOffset;
      const currentTime = performance.now();
      
      this.scrollVelocity = Math.abs(currentScrollY - this.lastScrollY) / (currentTime - lastScrollTime);
      this.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
      
      this.lastScrollY = currentScrollY;
      lastScrollTime = currentTime;

      if (!this.isScrolling) {
        this.isScrolling = true;
        this.scheduleScrollUpdate();
      }

      // 重置滚动状态
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
        this.notifyScrollEnd();
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  scheduleScrollUpdate() {
    if (this.raf) return;

    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.notifyScrollCallbacks();
      
      if (this.isScrolling) {
        this.scheduleScrollUpdate();
      }
    });
  }

  notifyScrollCallbacks() {
    const scrollData = {
      scrollY: this.lastScrollY,
      direction: this.scrollDirection,
      velocity: this.scrollVelocity,
      isScrolling: this.isScrolling
    };

    for (const callback of this.scrollCallbacks) {
      callback(scrollData);
    }
  }

  notifyScrollEnd() {
    const scrollData = {
      scrollY: this.lastScrollY,
      direction: this.scrollDirection,
      velocity: 0,
      isScrolling: false
    };

    for (const callback of this.scrollCallbacks) {
      callback(scrollData);
    }
  }

  addScrollCallback(callback) {
    this.scrollCallbacks.add(callback);
  }

  removeScrollCallback(callback) {
    this.scrollCallbacks.delete(callback);
  }

  cleanup() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    
    this.scrollCallbacks.clear();
  }
}

// 主DOM优化器
class DOMOptimizer {
  constructor() {
    this.scheduler = new BatchUpdateScheduler();
    this.layoutDetector = new LayoutThrashingDetector();
    this.visibilityManager = new VisibilityManager();
    this.scrollOptimizer = new ScrollOptimizer();
    this.optimizationStats = {
      totalUpdates: 0,
      batchedUpdates: 0,
      layoutThrashings: 0,
      optimizationSavings: 0
    };
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.layoutDetector.startDetection();
    this.visibilityManager.init();
    this.scrollOptimizer.init();
    this.setupEventListeners();
    this.isInitialized = true;

    console.log('🎯 DOM优化器已初始化');
  }

  setupEventListeners() {
    // 监听布局抖动
    window.addEventListener('layoutThrashing', (event) => {
      this.optimizationStats.layoutThrashings++;
      console.warn('布局抖动检测:', event.detail);
    });

    // 监听窗口调整
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, DOM_CONFIG.DEBOUNCE_RESIZE);
    });
  }

  handleResize() {
    // 触发可见性重新计算
    const visibleElements = this.visibilityManager.getVisibleElements();
    console.log('窗口调整，重新计算可见性:', visibleElements.length);
  }

  // 批量更新DOM
  batchUpdate(element, updates) {
    this.optimizationStats.totalUpdates++;
    
    if (Array.isArray(updates)) {
      this.optimizationStats.batchedUpdates++;
      this.optimizationStats.optimizationSavings += updates.length - 1;
      
      // 创建批量更新任务
      const batchTask = new DOMUpdateTask(
        element,
        UPDATE_TYPES.STYLE,
        () => {
          for (const update of updates) {
            update();
          }
        },
        2
      );
      
      this.scheduler.schedule(batchTask);
    } else {
      const task = new DOMUpdateTask(element, UPDATE_TYPES.STYLE, updates, 1);
      this.scheduler.schedule(task);
    }
  }

  // 优化样式更新
  updateStyles(element, styles) {
    const task = new DOMUpdateTask(
      element,
      UPDATE_TYPES.STYLE,
      () => {
        // 批量应用样式
        const cssText = Object.entries(styles)
          .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
          .join('; ');
        
        element.style.cssText += cssText;
      },
      2
    );
    
    this.scheduler.schedule(task);
  }

  // 优化DOM添加
  appendElements(parent, elements) {
    const task = new DOMUpdateTask(
      parent,
      UPDATE_TYPES.APPEND,
      () => {
        const fragment = document.createDocumentFragment();
        elements.forEach(element => {
          fragment.appendChild(element);
        });
        parent.appendChild(fragment);
      },
      2
    );
    
    this.scheduler.schedule(task);
  }

  // 优化DOM移除
  removeElements(elements) {
    const task = new DOMUpdateTask(
      elements[0].parentNode,
      UPDATE_TYPES.REMOVE,
      () => {
        elements.forEach(element => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      },
      2
    );
    
    this.scheduler.schedule(task);
  }

  // 观察元素可见性
  observeVisibility(element, callback) {
    this.visibilityManager.observe(element, callback);
  }

  // 停止观察元素
  unobserveVisibility(element) {
    this.visibilityManager.unobserve(element);
  }

  // 添加滚动监听
  addScrollListener(callback) {
    this.scrollOptimizer.addScrollCallback(callback);
  }

  // 移除滚动监听
  removeScrollListener(callback) {
    this.scrollOptimizer.removeScrollCallback(callback);
  }

  // 强制执行待处理的更新
  flushUpdates() {
    this.scheduler.processBatch();
  }

  // 获取优化统计
  getStats() {
    return {
      ...this.optimizationStats,
      visibleElements: this.visibilityManager.getVisibleElements().length,
      hiddenElements: this.visibilityManager.getHiddenElements().length,
      scrollVelocity: this.scrollOptimizer.scrollVelocity,
      isScrolling: this.scrollOptimizer.isScrolling
    };
  }

  // 清理资源
  cleanup() {
    this.layoutDetector.cleanup();
    this.visibilityManager.cleanup();
    this.scrollOptimizer.cleanup();
    this.isInitialized = false;
    
    console.log('🧹 DOM优化器已清理');
  }
}

// 单例实例
const domOptimizer = new DOMOptimizer();

// 工具函数
export const batchDOMUpdate = (element, updates) => {
  domOptimizer.batchUpdate(element, updates);
};

export const updateElementStyles = (element, styles) => {
  domOptimizer.updateStyles(element, styles);
};

export const appendElementsBatch = (parent, elements) => {
  domOptimizer.appendElements(parent, elements);
};

export const removeElementsBatch = (elements) => {
  domOptimizer.removeElements(elements);
};

export const observeElementVisibility = (element, callback) => {
  domOptimizer.observeVisibility(element, callback);
};

export const addScrollOptimizedListener = (callback) => {
  domOptimizer.addScrollListener(callback);
};

// 导出
export default domOptimizer;
export { 
  DOMOptimizer, 
  BatchUpdateScheduler, 
  LayoutThrashingDetector, 
  VisibilityManager, 
  ScrollOptimizer,
  DOMUpdateTask,
  DOM_CONFIG,
  UPDATE_TYPES,
  REPAINT_LAYERS
};