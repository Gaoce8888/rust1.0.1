/**
 * 性能监控和错误处理组件
 * 企业级性能监控和错误边界处理
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardBody, CardHeader, Chip, Progress, Button, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { Icon } from '@iconify/react';

// 性能监控Hook
export const usePerformanceMonitor = (componentName) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    renderTime: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    errors: [],
    warnings: []
  });
  
  const startTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef([]);
  
  // 开始性能监控
  const startMonitoring = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  // 结束性能监控
  const endMonitoring = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    renderCountRef.current++;
    renderTimesRef.current.push(renderTime);
    
    // 保留最近100次渲染时间
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }
    
    // 计算平均渲染时间
    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
    
    // 获取内存使用情况
    const memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      renderTime,
      lastRenderTime: endTime,
      averageRenderTime,
      memoryUsage
    }));
    
    // 性能警告
    if (renderTime > 100) {
      console.warn(`⚠️ 渲染时间过长: ${componentName} - ${renderTime.toFixed(2)}ms`);
      setMetrics(prev => ({
        ...prev,
        warnings: [...prev.warnings, {
          type: 'performance',
          message: `渲染时间过长: ${renderTime.toFixed(2)}ms`,
          timestamp: Date.now()
        }]
      }));
    }
    
    // 内存警告
    if (memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.warn(`⚠️ 内存使用过高: ${componentName} - ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    
  }, [componentName]);
  
  // 记录错误
  const recordError = useCallback((error, errorInfo) => {
    setMetrics(prev => ({
      ...prev,
      errors: [...prev.errors, {
        error: error.message,
        stack: error.stack,
        errorInfo,
        timestamp: Date.now()
      }]
    }));
  }, []);
  
  // 清理指标
  const clearMetrics = useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
    setMetrics({
      renderCount: 0,
      renderTime: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      errors: [],
      warnings: []
    });
  }, []);
  
  return {
    metrics,
    startMonitoring,
    endMonitoring,
    recordError,
    clearMetrics
  };
};

// 性能监控组件
export const PerformanceMonitorComponent = ({ children, name, onMetricsUpdate }) => {
  const { metrics, startMonitoring, endMonitoring, recordError } = usePerformanceMonitor(name);
  
  useEffect(() => {
    startMonitoring();
    
    return () => {
      endMonitoring();
    };
  });
  
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);
  
  return (
    <ErrorBoundary
      onError={recordError}
      fallback={({ error, retry }) => (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:danger-triangle-bold" className="text-red-500" />
            <h3 className="font-semibold text-red-800">组件错误</h3>
          </div>
          <p className="text-sm text-red-600 mb-3">{error.message}</p>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={retry}
            startContent={<Icon icon="solar:refresh-linear" />}
          >
            重试
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// 错误边界组件
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }
  
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString()
    };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo
    });
    
    // 记录错误
    console.error('❌ React错误边界捕获错误:', error, errorInfo);
    
    // 调用错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 发送错误到监控服务
    this.sendErrorToMonitoring(error, errorInfo);
  }
  
  sendErrorToMonitoring(error, errorInfo) {
    // 这里可以集成第三方错误监控服务
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 发送到监控服务
    console.log('📊 错误监控数据:', errorData);
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };
  
  render() {
    if (this.state.hasError) {
      // 自定义错误界面
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          retry: this.handleRetry
        });
      }
      
      // 默认错误界面
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 text-center">
          <Icon icon="solar:danger-triangle-bold" className="text-red-500 mx-auto mb-4" width={48} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">出现了一些问题</h3>
          <p className="text-sm text-red-600 mb-4">
            页面组件遇到错误，请重试或刷新页面
          </p>
          <div className="space-x-2">
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={this.handleRetry}
              startContent={<Icon icon="solar:refresh-linear" />}
            >
              重试
            </Button>
            <Button
              size="sm"
              color="danger"
              variant="light"
              onPress={() => window.location.reload()}
              startContent={<Icon icon="solar:restart-linear" />}
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// 性能监控面板
export const PerformancePanel = ({ metrics, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const getPerformanceLevel = (renderTime) => {
    if (renderTime < 16) return { level: 'excellent', color: 'success' };
    if (renderTime < 33) return { level: 'good', color: 'warning' };
    return { level: 'poor', color: 'danger' };
  };
  
  const formatMemoryUsage = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };
  
  const performance = getPerformanceLevel(metrics.averageRenderTime);
  
  return (
    <Card className="w-full">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Icon icon="solar:speedometer-linear" />
            <span className="font-semibold">性能监控</span>
            <Chip size="sm" color={performance.color} variant="flat">
              {performance.level}
            </Chip>
          </div>
          <Icon 
            icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            className="transition-transform"
          />
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardBody className="space-y-4">
          {/* 基础指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {metrics.renderCount}
              </div>
              <div className="text-sm text-gray-500">渲染次数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {metrics.averageRenderTime.toFixed(2)}ms
              </div>
              <div className="text-sm text-gray-500">平均渲染时间</div>
            </div>
          </div>
          
          {/* 渲染性能条 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>渲染性能</span>
              <span>{metrics.averageRenderTime.toFixed(2)}ms</span>
            </div>
            <Progress
              value={Math.min(metrics.averageRenderTime, 100)}
              maxValue={100}
              color={performance.color}
              className="w-full"
            />
          </div>
          
          {/* 内存使用 */}
          {metrics.memoryUsage > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>内存使用</span>
                <span>{formatMemoryUsage(metrics.memoryUsage)}</span>
              </div>
              <Progress
                value={metrics.memoryUsage}
                maxValue={100 * 1024 * 1024} // 100MB
                color={metrics.memoryUsage > 50 * 1024 * 1024 ? 'danger' : 'success'}
                className="w-full"
              />
            </div>
          )}
          
          {/* 错误和警告 */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Icon icon="solar:danger-triangle-bold" className="text-red-500" />
              <span className="text-sm">错误: {metrics.errors.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="solar:info-circle-bold" className="text-yellow-500" />
              <span className="text-sm">警告: {metrics.warnings.length}</span>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => setShowDetails(true)}
              startContent={<Icon icon="solar:eye-linear" />}
            >
              详细信息
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={onClear}
              startContent={<Icon icon="solar:trash-bin-trash-linear" />}
            >
              清空数据
            </Button>
          </div>
        </CardBody>
      )}
      
      {/* 详细信息模态框 */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>性能详细信息</ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* 错误日志 */}
              {metrics.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-3">错误日志</h4>
                  <div className="space-y-2">
                    {metrics.errors.map((error, index) => (
                      <Card key={index} className="p-3 bg-red-50 border-red-200">
                        <div className="text-sm">
                          <div className="font-medium text-red-800">{error.error}</div>
                          <div className="text-red-600 mt-1">
                            {new Date(error.timestamp).toLocaleString()}
                          </div>
                          {error.stack && (
                            <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                              {error.stack}
                            </pre>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 警告日志 */}
              {metrics.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-3">警告日志</h4>
                  <div className="space-y-2">
                    {metrics.warnings.map((warning, index) => (
                      <Card key={index} className="p-3 bg-yellow-50 border-yellow-200">
                        <div className="text-sm">
                          <div className="font-medium text-yellow-800">{warning.message}</div>
                          <div className="text-yellow-600 mt-1">
                            {new Date(warning.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 性能数据 */}
              <div>
                <h4 className="font-semibold mb-3">性能数据</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">总渲染次数:</span>
                    <span className="ml-2 font-mono">{metrics.renderCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最后渲染时间:</span>
                    <span className="ml-2 font-mono">{metrics.renderTime.toFixed(2)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-500">平均渲染时间:</span>
                    <span className="ml-2 font-mono">{metrics.averageRenderTime.toFixed(2)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-500">内存使用:</span>
                    <span className="ml-2 font-mono">{formatMemoryUsage(metrics.memoryUsage)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
};

// 网络监控Hook
export const useNetworkMonitor = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    downlink: 0,
    effectiveType: 'unknown',
    rtt: 0,
    saveData: false,
    lastCheck: Date.now()
  });
  
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        downlink: connection?.downlink || 0,
        effectiveType: connection?.effectiveType || 'unknown',
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false,
        lastCheck: Date.now()
      });
    };
    
    // 初始检查
    updateNetworkStatus();
    
    // 监听网络状态变化
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // 监听连接变化
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkStatus);
    }
    
    // 定期更新
    const interval = setInterval(updateNetworkStatus, 30000); // 30秒
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetworkStatus);
      }
      clearInterval(interval);
    };
  }, []);
  
  return networkStatus;
};

// 网络状态组件
export const NetworkStatusIndicator = () => {
  const networkStatus = useNetworkMonitor();
  
  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'danger';
    if (networkStatus.effectiveType === '4g') return 'success';
    if (networkStatus.effectiveType === '3g') return 'warning';
    return 'default';
  };
  
  const getStatusText = () => {
    if (!networkStatus.isOnline) return '离线';
    return `${networkStatus.effectiveType.toUpperCase()} ${networkStatus.downlink.toFixed(1)}Mbps`;
  };
  
  return (
    <Chip
      size="sm"
      color={getStatusColor()}
      variant="flat"
      startContent={
        <Icon 
          icon={networkStatus.isOnline ? "solar:wifi-router-minimalistic-linear" : "solar:wifi-router-minimalistic-cross-linear"}
          width={14}
        />
      }
    >
      {getStatusText()}
    </Chip>
  );
};

export default {
  usePerformanceMonitor,
  PerformanceMonitorComponent,
  ErrorBoundary,
  PerformancePanel,
  useNetworkMonitor,
  NetworkStatusIndicator
};