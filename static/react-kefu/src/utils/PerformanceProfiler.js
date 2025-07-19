/**
 * 企业级性能分析器 - 全面的性能监控和优化
 * 
 * 特性：
 * - 实时性能监控
 * - 渲染性能分析
 * - 内存使用跟踪
 * - 网络请求监控
 * - 用户交互追踪
 * - 自动性能优化建议
 * - 性能报告生成
 */

// 性能配置
const PERFORMANCE_CONFIG = {
  SAMPLE_RATE: 0.1,                // 采样率
  MAX_SAMPLES: 1000,               // 最大样本数
  METRICS_INTERVAL: 1000,          // 指标收集间隔
  SLOW_THRESHOLD: 16,              // 慢渲染阈值(ms)
  MEMORY_WARNING_THRESHOLD: 512,   // 内存警告阈值(MB)
  FPS_TARGET: 60,                  // 目标FPS
  INTERACTION_TIMEOUT: 5000,       // 交互超时时间
  REPORT_INTERVAL: 60000           // 报告生成间隔
};

// 性能指标类型
const METRIC_TYPES = {
  RENDER: 'render',
  INTERACTION: 'interaction',
  NETWORK: 'network',
  MEMORY: 'memory',
  FPS: 'fps',
  BUNDLE: 'bundle',
  CUSTOM: 'custom'
};

// 性能事件类型
const PERFORMANCE_EVENTS = {
  SLOW_RENDER: 'slow_render',
  MEMORY_WARNING: 'memory_warning',
  FPS_DROP: 'fps_drop',
  INTERACTION_DELAY: 'interaction_delay',
  NETWORK_SLOW: 'network_slow',
  OPTIMIZATION_SUGGESTION: 'optimization_suggestion'
};

// 性能指标样本
class PerformanceSample {
  constructor(type, data, timestamp = Date.now()) {
    this.type = type;
    this.data = data;
    this.timestamp = timestamp;
    this.id = this.generateId();
  }

  generateId() {
    return `${this.type}_${this.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 性能指标收集器
class MetricsCollector {
  constructor() {
    this.samples = new Map();
    this.aggregatedMetrics = new Map();
    this.listeners = new Set();
    this.isCollecting = false;
    this.intervalId = null;
    this.observer = null;
  }

  start() {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.startPerformanceObserver();
    this.startMetricsCollection();
    
    console.log('📊 性能指标收集器已启动');
  }

  stop() {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    this.stopPerformanceObserver();
    this.stopMetricsCollection();
    
    console.log('📊 性能指标收集器已停止');
  }

  startPerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      this.observer.observe({ 
        entryTypes: ['navigation', 'resource', 'measure', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
    } catch (error) {
      console.warn('性能观察器启动失败:', error);
    }
  }

  stopPerformanceObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  startMetricsCollection() {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, PERFORMANCE_CONFIG.METRICS_INTERVAL);
  }

  stopMetricsCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  processPerformanceEntry(entry) {
    const sample = new PerformanceSample(METRIC_TYPES.RENDER, {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      entryType: entry.entryType
    });

    this.addSample(sample);

    // 检查慢渲染
    if (entry.duration > PERFORMANCE_CONFIG.SLOW_THRESHOLD) {
      this.emitEvent(PERFORMANCE_EVENTS.SLOW_RENDER, {
        name: entry.name,
        duration: entry.duration
      });
    }
  }

  collectSystemMetrics() {
    // 收集内存指标
    if (performance.memory) {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      
      const memorySample = new PerformanceSample(METRIC_TYPES.MEMORY, {
        used: memoryUsage,
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      });
      
      this.addSample(memorySample);

      // 内存警告
      if (memoryUsage > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD) {
        this.emitEvent(PERFORMANCE_EVENTS.MEMORY_WARNING, {
          usage: memoryUsage,
          threshold: PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD
        });
      }
    }

    // 收集FPS指标
    this.collectFPSMetrics();
  }

  collectFPSMetrics() {
    let frameCount = 0;
    let lastTime = performance.now();

    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        const fpsSample = new PerformanceSample(METRIC_TYPES.FPS, {
          fps,
          target: PERFORMANCE_CONFIG.FPS_TARGET
        });
        
        this.addSample(fpsSample);

        // FPS下降检测
        if (fps < PERFORMANCE_CONFIG.FPS_TARGET * 0.8) {
          this.emitEvent(PERFORMANCE_EVENTS.FPS_DROP, {
            fps,
            target: PERFORMANCE_CONFIG.FPS_TARGET
          });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      if (this.isCollecting) {
        requestAnimationFrame(countFrame);
      }
    };

    requestAnimationFrame(countFrame);
  }

  addSample(sample) {
    // 采样率控制
    if (Math.random() > PERFORMANCE_CONFIG.SAMPLE_RATE) {
      return;
    }

    const typeKey = sample.type;
    
    if (!this.samples.has(typeKey)) {
      this.samples.set(typeKey, []);
    }

    const samples = this.samples.get(typeKey);
    samples.push(sample);

    // 限制样本数量
    if (samples.length > PERFORMANCE_CONFIG.MAX_SAMPLES) {
      samples.shift();
    }

    // 更新聚合指标
    this.updateAggregatedMetrics(sample);
  }

  updateAggregatedMetrics(sample) {
    const typeKey = sample.type;
    
    if (!this.aggregatedMetrics.has(typeKey)) {
      this.aggregatedMetrics.set(typeKey, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0
      });
    }

    const metrics = this.aggregatedMetrics.get(typeKey);
    const duration = sample.data.duration || sample.data.fps || 0;

    metrics.count++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.count;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);

    // 计算百分位数
    const samples = this.samples.get(typeKey) || [];
    const durations = samples.map(s => s.data.duration || s.data.fps || 0).sort((a, b) => a - b);
    
    if (durations.length > 0) {
      metrics.p50 = durations[Math.floor(durations.length * 0.5)];
      metrics.p95 = durations[Math.floor(durations.length * 0.95)];
      metrics.p99 = durations[Math.floor(durations.length * 0.99)];
    }
  }

  emitEvent(type, data) {
    for (const listener of this.listeners) {
      listener({ type, data, timestamp: Date.now() });
    }
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  getMetrics(type) {
    if (type) {
      return this.aggregatedMetrics.get(type) || null;
    }
    return Object.fromEntries(this.aggregatedMetrics);
  }

  getSamples(type, limit = 100) {
    if (type) {
      const samples = this.samples.get(type) || [];
      return samples.slice(-limit);
    }
    
    const allSamples = {};
    for (const [key, samples] of this.samples) {
      allSamples[key] = samples.slice(-limit);
    }
    return allSamples;
  }

  clear() {
    this.samples.clear();
    this.aggregatedMetrics.clear();
  }
}

// 渲染性能分析器
class RenderProfiler {
  constructor() {
    this.renderTimes = [];
    this.componentMetrics = new Map();
    this.isProfileing = false;
    this.currentMeasure = null;
  }

  startMeasure(name) {
    if (!this.isProfileing) return;

    this.currentMeasure = {
      name,
      startTime: performance.now(),
      endTime: null
    };

    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }

  endMeasure(name) {
    if (!this.isProfileing || !this.currentMeasure) return;

    const endTime = performance.now();
    this.currentMeasure.endTime = endTime;
    
    const duration = endTime - this.currentMeasure.startTime;

    if (typeof performance.measure === 'function') {
      try {
        performance.measure(name, `${name}-start`);
      } catch (error) {
        // 忽略测量错误
      }
    }

    // 记录组件渲染时间
    this.recordComponentRender(name, duration);

    this.currentMeasure = null;
  }

  recordComponentRender(componentName, duration) {
    if (!this.componentMetrics.has(componentName)) {
      this.componentMetrics.set(componentName, {
        renderCount: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metrics = this.componentMetrics.get(componentName);
    metrics.renderCount++;
    metrics.totalTime += duration;
    metrics.averageTime = metrics.totalTime / metrics.renderCount;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);

    this.renderTimes.push({
      component: componentName,
      duration,
      timestamp: Date.now()
    });

    // 限制记录数量
    if (this.renderTimes.length > 1000) {
      this.renderTimes.shift();
    }
  }

  startProfiling() {
    this.isProfileing = true;
    console.log('🔍 渲染性能分析已启动');
  }

  stopProfiling() {
    this.isProfileing = false;
    console.log('🔍 渲染性能分析已停止');
  }

  getComponentMetrics(componentName) {
    if (componentName) {
      return this.componentMetrics.get(componentName) || null;
    }
    return Object.fromEntries(this.componentMetrics);
  }

  getSlowComponents(threshold = PERFORMANCE_CONFIG.SLOW_THRESHOLD) {
    const slowComponents = [];
    
    for (const [name, metrics] of this.componentMetrics) {
      if (metrics.averageTime > threshold) {
        slowComponents.push({
          name,
          averageTime: metrics.averageTime,
          renderCount: metrics.renderCount
        });
      }
    }

    return slowComponents.sort((a, b) => b.averageTime - a.averageTime);
  }

  clear() {
    this.renderTimes = [];
    this.componentMetrics.clear();
  }
}

// 性能优化建议生成器
class OptimizationSuggester {
  constructor() {
    this.suggestions = [];
    this.rules = new Map();
    this.initializeRules();
  }

  initializeRules() {
    // 渲染性能规则
    this.rules.set('slow_render', {
      check: (metrics) => {
        const renderMetrics = metrics[METRIC_TYPES.RENDER];
        return renderMetrics && renderMetrics.averageDuration > PERFORMANCE_CONFIG.SLOW_THRESHOLD;
      },
      suggestion: '检测到慢渲染，建议使用React.memo()或useMemo()优化组件'
    });

    // 内存使用规则
    this.rules.set('high_memory', {
      check: (metrics) => {
        const memoryMetrics = metrics[METRIC_TYPES.MEMORY];
        return memoryMetrics && memoryMetrics.averageDuration > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD;
      },
      suggestion: '内存使用过高，建议检查内存泄漏并优化缓存策略'
    });

    // FPS规则
    this.rules.set('low_fps', {
      check: (metrics) => {
        const fpsMetrics = metrics[METRIC_TYPES.FPS];
        return fpsMetrics && fpsMetrics.averageDuration < PERFORMANCE_CONFIG.FPS_TARGET * 0.8;
      },
      suggestion: 'FPS过低，建议使用虚拟滚动和减少DOM操作'
    });

    // 交互延迟规则
    this.rules.set('interaction_delay', {
      check: (metrics) => {
        const interactionMetrics = metrics[METRIC_TYPES.INTERACTION];
        return interactionMetrics && interactionMetrics.averageDuration > 100;
      },
      suggestion: '交互响应延迟过高，建议使用防抖和节流优化'
    });
  }

  analyzePerfomance(metricsCollector) {
    const metrics = metricsCollector.getMetrics();
    const newSuggestions = [];

    for (const [ruleId, rule] of this.rules) {
      if (rule.check(metrics)) {
        newSuggestions.push({
          id: ruleId,
          type: PERFORMANCE_EVENTS.OPTIMIZATION_SUGGESTION,
          message: rule.suggestion,
          priority: this.calculatePriority(ruleId, metrics),
          timestamp: Date.now()
        });
      }
    }

    this.suggestions = newSuggestions;
    return newSuggestions;
  }

  calculatePriority(ruleId, metrics) {
    // 根据规则和当前指标计算优先级
    switch (ruleId) {
      case 'slow_render':
        return 'high';
      case 'high_memory':
        return 'critical';
      case 'low_fps':
        return 'medium';
      case 'interaction_delay':
        return 'high';
      default:
        return 'low';
    }
  }

  getSuggestions() {
    return [...this.suggestions];
  }

  clearSuggestions() {
    this.suggestions = [];
  }
}

// 主性能分析器
class PerformanceProfiler {
  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.renderProfiler = new RenderProfiler();
    this.optimizationSuggester = new OptimizationSuggester();
    this.isRunning = false;
    this.reportInterval = null;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.metricsCollector.start();
    this.renderProfiler.startProfiling();
    this.startReportGeneration();

    console.log('🚀 性能分析器已启动');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.metricsCollector.stop();
    this.renderProfiler.stopProfiling();
    this.stopReportGeneration();

    console.log('🛑 性能分析器已停止');
  }

  startReportGeneration() {
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, PERFORMANCE_CONFIG.REPORT_INTERVAL);
  }

  stopReportGeneration() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
  }

  // 记录自定义指标
  recordCustomMetric(name, value, type = METRIC_TYPES.CUSTOM) {
    const sample = new PerformanceSample(type, {
      name,
      value,
      duration: value
    });
    
    this.metricsCollector.addSample(sample);
  }

  // 开始渲染测量
  startRenderMeasure(componentName) {
    this.renderProfiler.startMeasure(componentName);
  }

  // 结束渲染测量
  endRenderMeasure(componentName) {
    this.renderProfiler.endMeasure(componentName);
  }

  // 记录用户交互
  recordInteraction(type, duration) {
    const sample = new PerformanceSample(METRIC_TYPES.INTERACTION, {
      type,
      duration,
      timestamp: Date.now()
    });
    
    this.metricsCollector.addSample(sample);
  }

  // 添加事件监听器
  addEventListener(listener) {
    this.metricsCollector.addListener(listener);
  }

  // 移除事件监听器
  removeEventListener(listener) {
    this.metricsCollector.removeListener(listener);
  }

  // 获取性能指标
  getMetrics() {
    return {
      system: this.metricsCollector.getMetrics(),
      render: this.renderProfiler.getComponentMetrics(),
      suggestions: this.optimizationSuggester.getSuggestions()
    };
  }

  // 生成性能报告
  generateReport() {
    const metrics = this.getMetrics();
    const suggestions = this.optimizationSuggester.analyzePerfomance(this.metricsCollector);
    
    const report = {
      timestamp: Date.now(),
      summary: {
        renderCount: metrics.system[METRIC_TYPES.RENDER]?.count || 0,
        averageRenderTime: metrics.system[METRIC_TYPES.RENDER]?.averageDuration || 0,
        memoryUsage: metrics.system[METRIC_TYPES.MEMORY]?.totalDuration || 0,
        averageFPS: metrics.system[METRIC_TYPES.FPS]?.averageDuration || 0
      },
      componentMetrics: metrics.render,
      suggestions,
      slowComponents: this.renderProfiler.getSlowComponents()
    };

    console.log('📊 性能报告已生成:', report);
    return report;
  }

  // 清理数据
  clear() {
    this.metricsCollector.clear();
    this.renderProfiler.clear();
    this.optimizationSuggester.clearSuggestions();
  }
}

// 单例实例
const performanceProfiler = new PerformanceProfiler();

// 工具函数
export const measureRender = (componentName, renderFn) => {
  performanceProfiler.startRenderMeasure(componentName);
  const result = renderFn();
  performanceProfiler.endRenderMeasure(componentName);
  return result;
};

export const measureAsync = async (name, asyncFn) => {
  const startTime = performance.now();
  const result = await asyncFn();
  const duration = performance.now() - startTime;
  
  performanceProfiler.recordCustomMetric(name, duration);
  return result;
};

export const withPerformanceTracking = (Component, componentName) => {
  return React.memo((props) => {
    performanceProfiler.startRenderMeasure(componentName);
    const result = Component(props);
    performanceProfiler.endRenderMeasure(componentName);
    return result;
  });
};

// 导出
export default performanceProfiler;
export { 
  PerformanceProfiler, 
  MetricsCollector, 
  RenderProfiler, 
  OptimizationSuggester,
  PERFORMANCE_CONFIG,
  METRIC_TYPES,
  PERFORMANCE_EVENTS
};