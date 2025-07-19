/**
 * 高性能渲染优化组件
 * 从企业级客服端案例移植的优化组件
 */
import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useDebounce, useThrottle, useVirtualScroll, useSmartCache } from '../hooks/useOptimizedState.js';

// 防抖Hook
export function useDebounceValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 高性能消息组件
export const OptimizedMessage = memo(({
  message,
  isOwn,
  showAvatar = true,
  showTime = true,
  className = ''
}) => {
  // 使用 useMemo 缓存复杂计算
  const messageTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [message.timestamp]);

  const messageContent = useMemo(() => {
    // 消息内容处理逻辑
    return message.content;
  }, [message.content]);

  return (
    <div className={`message ${isOwn ? 'own' : 'other'} ${className}`}>
      {showAvatar && !isOwn && (
        <div className="message-avatar">
          <span>{message.from?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
      )}
      
      <div className="message-content">
        <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
          {messageContent}
        </div>
        {showTime && (
          <div className="message-time">{messageTime}</div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTime === nextProps.showTime
  );
});

OptimizedMessage.displayName = 'OptimizedMessage';

// 高性能用户列表项
export const OptimizedUserItem = memo(({
  user,
  isActive = false,
  onClick,
  lastMessage,
  unreadCount = 0
}) => {
  const handleClick = useCallback(() => {
    onClick?.(user.user_id);
  }, [onClick, user.user_id]);

  const lastMessagePreview = useMemo(() => {
    if (!lastMessage) return '暂无消息';
    return lastMessage.content.length > 30 
      ? `${lastMessage.content.substring(0, 30)}...`
      : lastMessage.content;
  }, [lastMessage]);

  const lastMessageTime = useMemo(() => {
    if (!lastMessage) return '';
    const now = new Date();
    const messageTime = new Date(lastMessage.timestamp);
    const diffInMs = now.getTime() - messageTime.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    
    if (diffInMins < 1) return '刚刚';
    if (diffInMins < 60) return `${diffInMins}分钟前`;
    if (diffInMins < 1440) return `${Math.floor(diffInMins / 60)}小时前`;
    return messageTime.toLocaleDateString();
  }, [lastMessage]);

  return (
    <div 
      className={`user-item ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      <div className="user-avatar">
        <span>{user.user_name?.charAt(0)?.toUpperCase() || '?'}</span>
        <div className={`status-indicator ${(user.status || 'offline').toLowerCase()}`} />
      </div>
      
      <div className="user-info">
        <div className="user-header">
          <span className="user-name">{user.user_name || '未知用户'}</span>
          <span className="last-time">{lastMessageTime}</span>
        </div>
        <div className="last-message">{lastMessagePreview}</div>
      </div>
      
      {unreadCount > 0 && (
        <div className="unread-badge">{unreadCount}</div>
      )}
    </div>
  );
});

OptimizedUserItem.displayName = 'OptimizedUserItem';

// 虚拟化消息列表
export const VirtualizedMessageList = memo(({
  messages,
  currentUserId,
  containerHeight = 400,
  itemHeight = 80
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  
  // 使用虚拟滚动
  const [virtualResult] = useVirtualScroll(messages.length, {
    itemHeight,
    containerHeight,
    overscan: 3
  });

  const visibleMessages = useMemo(() => {
    return messages.slice(
      virtualResult.visibleStartIndex,
      virtualResult.visibleEndIndex + 1
    );
  }, [messages, virtualResult.visibleStartIndex, virtualResult.visibleEndIndex]);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="virtualized-message-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: virtualResult.totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: virtualResult.offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleMessages.map((message, index) => (
            <div
              key={message.id}
              style={{ height: itemHeight }}
            >
              <OptimizedMessage
                message={message}
                isOwn={message.from === currentUserId}
                showAvatar={true}
                showTime={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';

// 高性能输入框
export const OptimizedInput = memo(({
  value,
  onChange,
  onSend,
  placeholder = '输入消息...',
  maxLength = 1000,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isTyping, setIsTyping] = useState(false);
  
  // 防抖处理输入
  const debouncedValue = useDebounceValue(inputValue, 300);
  
  // 节流处理正在输入状态
  const throttledTyping = useThrottle(isTyping, 1000);

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsTyping(true);
    
    // 延迟停止typing状态
    setTimeout(() => setIsTyping(false), 1000);
    
    onChange?.(newValue);
  }, [onChange]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSend?.(inputValue.trim());
        setInputValue('');
      }
    }
  }, [inputValue, onSend]);

  const handleSendClick = useCallback(() => {
    if (inputValue.trim()) {
      onSend?.(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, onSend]);

  return (
    <div className="optimized-input">
      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="message-input"
          rows="1"
        />
        <button
          onClick={handleSendClick}
          disabled={!inputValue.trim() || disabled}
          className="send-button"
        >
          发送
        </button>
      </div>
      
      {throttledTyping && (
        <div className="typing-indicator">
          正在输入...
        </div>
      )}
      
      <div className="input-info">
        <span className="char-count">{inputValue.length}/{maxLength}</span>
      </div>
    </div>
  );
});

OptimizedInput.displayName = 'OptimizedInput';

// 性能监控组件
export const PerformanceMonitor = memo(({
  children,
  name,
  onMetrics
}) => {
  const renderCount = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    startTime.current = performance.now();
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    renderCount.current++;
    const metrics = {
      renderTime,
      updateCount: renderCount.current,
      lastUpdate: Date.now()
    };

    onMetrics?.(metrics);

    if (import.meta.env?.MODE === 'development') {
      console.log(`[Performance] ${name}: ${renderTime.toFixed(2)}ms (renders: ${renderCount.current})`);
    }
  });

  return <>{children}</>;
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

// 错误边界组件
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    this.props.onError?.(error, errorInfo);
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <div className="error-boundary">
          <h3>出现了一些问题</h3>
          <p>页面遇到错误，请重试</p>
          <button onClick={this.handleRetry} className="retry-button">
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 智能缓存容器
export const SmartCacheContainer = memo(({
  children,
  cacheKey,
  cacheTime = 5000
}) => {
  const cache = useSmartCache(
    cacheKey,
    () => children,
    [children],
    cacheTime
  );

  return cache.value;
});

SmartCacheContainer.displayName = 'SmartCacheContainer';

// 导出所有优化组件
export default {
  OptimizedMessage,
  OptimizedUserItem,
  VirtualizedMessageList,
  OptimizedInput,
  PerformanceMonitor,
  ErrorBoundary,
  SmartCacheContainer,
  useDebounceValue
};