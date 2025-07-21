/**
 * 错误监控和性能监控工具
 */

// 全局错误监控
export const setupErrorMonitoring = () => {
  // 捕获JavaScript错误
  window.addEventListener('error', (event) => {
    console.error('JavaScript错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString(),
    });
    
    // 这里可以发送到错误监控服务
    // sendToErrorService(event);
  });

  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString(),
    });
    
    // 这里可以发送到错误监控服务
    // sendToErrorService(event);
  });

  // React错误边界
  window.addEventListener('react-error', (event) => {
    console.error('React错误:', {
      error: event.error,
      errorInfo: event.errorInfo,
      timestamp: new Date().toISOString(),
    });
  });
};

// 性能监控
export const setupPerformanceMonitoring = () => {
  // 监控页面加载性能
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    const performanceData = {
      // 页面加载时间
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      // DOM内容加载时间
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      // 首次绘制时间
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
      // 首次内容绘制时间
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
      timestamp: new Date().toISOString(),
    };
    
    console.log('页面性能数据:', performanceData);
    
    // 这里可以发送到性能监控服务
    // sendToPerformanceService(performanceData);
  });
};

// 自定义性能标记
export const performanceMark = (name) => {
  performance.mark(name);
};

export const performanceMeasure = (name, startMark, endMark) => {
  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    console.log(`性能测量 ${name}:`, measure.duration);
    return measure.duration;
  } catch (error) {
    console.warn(`性能测量失败 ${name}:`, error);
    return null;
  }
};

// 内存使用监控
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = performance.memory;
    console.log('内存使用情况:', {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    });
  }
};

// 网络请求监控
export const setupNetworkMonitoring = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const startTime = performance.now();
    const startMark = `fetch-start-${Date.now()}`;
    performance.mark(startMark);
    
    try {
      const response = await originalFetch(...args);
      const endTime = performance.now();
      const endMark = `fetch-end-${Date.now()}`;
      performance.mark(endMark);
      
      const duration = performanceMeasure('fetch-request', startMark, endMark);
      
      console.log('网络请求:', {
        url: args[0],
        method: args[1]?.method || 'GET',
        duration,
        status: response.status,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      console.error('网络请求失败:', {
        url: args[0],
        method: args[1]?.method || 'GET',
        duration: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
};

// WebSocket连接监控
export const monitorWebSocket = (wsClient) => {
  if (!wsClient) return;
  
  const originalSend = wsClient.send;
  const originalClose = wsClient.close;
  
  wsClient.send = function(data) {
    const startTime = performance.now();
    const startMark = `ws-send-${Date.now()}`;
    performance.mark(startMark);
    
    try {
      const result = originalSend.call(this, data);
      const endTime = performance.now();
      const endMark = `ws-send-end-${Date.now()}`;
      performance.mark(endMark);
      
      const duration = performanceMeasure('websocket-send', startMark, endMark);
      
      console.log('WebSocket发送:', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        duration,
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      console.error('WebSocket发送失败:', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
  
  wsClient.close = function() {
    console.log('WebSocket连接关闭:', {
      timestamp: new Date().toISOString(),
    });
    return originalClose.call(this);
  };
};

// 组件渲染性能监控
export const withPerformanceMonitoring = (Component, componentName) => {
  return function PerformanceMonitoredComponent(props) {
    const startTime = performance.now();
    const startMark = `render-${componentName}-${Date.now()}`;
    performance.mark(startMark);
    
    React.useEffect(() => {
      const endTime = performance.now();
      const endMark = `render-${componentName}-end-${Date.now()}`;
      performance.mark(endMark);
      
      const duration = performanceMeasure(`render-${componentName}`, startMark, endMark);
      
      console.log(`组件渲染性能 ${componentName}:`, {
        duration,
        props: Object.keys(props),
        timestamp: new Date().toISOString(),
      });
    });
    
    return <Component {...props} />;
  };
};

// 初始化所有监控
export const initializeMonitoring = () => {
  setupErrorMonitoring();
  setupPerformanceMonitoring();
  setupNetworkMonitoring();
  
  // 定期监控内存使用
  setInterval(monitorMemoryUsage, 30000); // 每30秒监控一次
  
  console.log('监控系统已初始化');
};