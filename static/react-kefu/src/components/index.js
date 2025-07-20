// 企业级组件统一导出文件

// 核心组件
export {
  VirtualizedList,
  OptimizedMessageRenderer,
  MemoryOptimizedStore,
  useOptimizedCache,
  useDebounce,
  useThrottle,
  OptimizedPortal,
  PerformanceMonitor,
  LazyComponent,
  ErrorBoundary,
  OptimizedContextProvider
} from './EnterpriseCore';

// 聊天组件
export {
  EnterpriseMessage,
  EnterpriseChatContainer,
  EnterpriseMessageInput,
  MessageStatusIndicator,
  MessageType,
  MessagePriority
} from './EnterpriseChat';

// WebSocket组件
export {
  EnterpriseWebSocketClient,
  useEnterpriseWebSocket,
  MessageQueueManager,
  ConnectionStatus,
  WSMessageType
} from './EnterpriseWebSocket';

// 仪表板组件
export {
  RealTimeMetrics,
  ConnectionMonitor,
  MessageStatistics,
  SystemHealthCheck,
  EnterpriseDashboard,
  MetricType
} from './EnterpriseDashboard';

// 主应用组件
export { default as EnterpriseKefuApp } from './EnterpriseApp';

// 样式文件
import './EnterpriseStyles.css';

// 默认导出主应用
export { default } from './EnterpriseApp';