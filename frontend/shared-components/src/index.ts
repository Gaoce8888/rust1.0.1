// 类型导出
export * from './types';

// 工具函数导出
export * from './utils';

// Hooks导出
export * from './hooks';

// API服务导出
export { default as apiClient, ApiClient } from './services/api';

// UI组件导出
export { default as Button } from './components/ui/Button';
export { default as Input } from './components/ui/Input';
export { default as Loading } from './components/ui/Loading';

// 聊天组件导出
export { default as ChatMessage } from './components/chat/ChatMessage';

// 客服端组件导出
export { default as CustomerList } from './components/kefu/CustomerList';

// 客户端组件导出
export { default as ChatInterface } from './components/kehu/ChatInterface';

// 主题配置
export const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF'
    },
    border: '#E5E7EB'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  }
};

// 版本信息
export const version = '1.0.0';

// 默认配置
export const defaultConfig = {
  api: {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  websocket: {
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  },
  chat: {
    maxMessageLength: 1000,
    typingIndicatorDelay: 1000,
    messageRetentionDays: 30
  }
};