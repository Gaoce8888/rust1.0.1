import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { 
  VirtualizedList, 
  OptimizedMessageRenderer, 
  useOptimizedCache, 
  useDebounce, 
  useThrottle,
  PerformanceMonitor 
} from './EnterpriseCore';

// 消息类型枚举
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  VIDEO: 'video',
  SYSTEM: 'system',
  TYPING: 'typing'
};

// 消息优先级
export const MessagePriority = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

// 高性能消息组件
export const EnterpriseMessage = React.memo(({ 
  message, 
  isOwn, 
  showAvatar = true,
  showTimestamp = true,
  onMessageClick,
  onMessageAction,
  priority = MessagePriority.NORMAL
}) => {
  const messageRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(() => {
    onMessageClick?.(message);
  }, [message, onMessageClick]);

  const handleAction = useCallback((action) => {
    onMessageAction?.(message, action);
  }, [message, onMessageAction]);

  const messageClass = useMemo(() => {
    return `enterprise-message ${isOwn ? 'own' : 'other'} ${message.type} ${isHovered ? 'hovered' : ''}`;
  }, [isOwn, message.type, isHovered]);

  const renderMessageContent = () => {
    switch (message.type) {
      case MessageType.TEXT:
        return (
          <div className="message-text" dangerouslySetInnerHTML={{ __html: message.content }} />
        );
      
      case MessageType.IMAGE:
        return (
          <div className="message-image">
            <img 
              src={message.content} 
              alt="图片消息"
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
            {isLoading && <div className="image-loading">加载中...</div>}
          </div>
        );
      
      case MessageType.FILE:
        return (
          <div className="message-file">
            <div className="file-icon">📎</div>
            <div className="file-info">
              <div className="file-name">{message.fileName}</div>
              <div className="file-size">{message.fileSize}</div>
            </div>
            <button onClick={() => handleAction('download')}>下载</button>
          </div>
        );
      
      case MessageType.VOICE:
        return (
          <div className="message-voice">
            <button onClick={() => handleAction('play')}>▶️</button>
            <div className="voice-duration">{message.duration}s</div>
          </div>
        );
      
      case MessageType.SYSTEM:
        return (
          <div className="message-system">
            {message.content}
          </div>
        );
      
      case MessageType.TYPING:
        return (
          <div className="message-typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        );
      
      default:
        return <div className="message-unknown">未知消息类型</div>;
    }
  };

  return (
    <PerformanceMonitor componentName="EnterpriseMessage">
      <div 
        ref={messageRef}
        className={messageClass}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showAvatar && !isOwn && (
          <div className="message-avatar">
            <img src={message.avatar || '/default-avatar.png'} alt="头像" />
          </div>
        )}
        
        <div className="message-content-wrapper">
          {!isOwn && (
            <div className="message-sender">{message.senderName}</div>
          )}
          
          <div className="message-content">
            {renderMessageContent()}
          </div>
          
          {showTimestamp && (
            <div className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          )}
          
          {isHovered && (
            <div className="message-actions">
              <button onClick={() => handleAction('reply')}>回复</button>
              <button onClick={() => handleAction('forward')}>转发</button>
              {isOwn && (
                <button onClick={() => handleAction('edit')}>编辑</button>
              )}
            </div>
          )}
        </div>
      </div>
    </PerformanceMonitor>
  );
});

// 高性能聊天容器
export const EnterpriseChatContainer = React.memo(({ 
  messages = [], 
  currentUser,
  onSendMessage,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className = "",
  maxHeight = 600
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const containerRef = useRef(null);
  const { getCached, setCached } = useOptimizedCache(200);

  // 防抖滚动处理
  const debouncedScrollPosition = useDebounce(scrollPosition, 100);

  // 节流加载更多
  const throttledLoadMore = useThrottle(debouncedScrollPosition, 500);

  useEffect(() => {
    if (throttledLoadMore < 100 && hasMore && !isLoading) {
      onLoadMore?.();
    }
  }, [throttledLoadMore, hasMore, isLoading, onLoadMore]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollPosition(scrollTop);
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  const renderMessage = useCallback((message, index) => {
    const isOwn = message.senderId === currentUser?.id;
    const cacheKey = `message-${message.id}`;
    
    // 检查缓存
    const cachedMessage = getCached(cacheKey);
    if (cachedMessage) {
      return cachedMessage;
    }

    const messageElement = (
      <EnterpriseMessage
        key={message.id || index}
        message={message}
        isOwn={isOwn}
        priority={index < 10 ? MessagePriority.HIGH : MessagePriority.NORMAL}
      />
    );

    // 缓存消息
    setCached(cacheKey, messageElement);
    return messageElement;
  }, [currentUser, getCached, setCached]);

  return (
    <div className={`enterprise-chat-container ${className}`}>
      <div 
        ref={containerRef}
        className="chat-messages"
        style={{ height: maxHeight }}
        onScroll={handleScroll}
      >
        {isLoading && hasMore && (
          <div className="loading-messages">
            <div className="loading-spinner">加载中...</div>
          </div>
        )}
        
        <VirtualizedList
          items={messages}
          itemHeight={80}
          containerHeight={maxHeight}
          renderItem={renderMessage}
          onScroll={handleScroll}
          overscan={10}
        />
        
        {!isAtBottom && (
          <button 
            className="scroll-to-bottom"
            onClick={scrollToBottom}
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
});

// 实时消息输入组件
export const EnterpriseMessageInput = React.memo(({ 
  onSend,
  onTyping,
  placeholder = "输入消息...",
  disabled = false,
  attachments = [],
  quickReplies = [],
  className = ""
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // 防抖输入处理
  const debouncedMessage = useDebounce(message, 300);

  useEffect(() => {
    if (debouncedMessage && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    } else if (!debouncedMessage && isTyping) {
      setIsTyping(false);
      onTyping?.(false);
    }
  }, [debouncedMessage, isTyping, onTyping]);

  const handleSend = useCallback(() => {
    if (!message.trim() && selectedAttachments.length === 0) return;

    const messageData = {
      content: message.trim(),
      attachments: selectedAttachments,
      timestamp: new Date().toISOString(),
      type: selectedAttachments.length > 0 ? MessageType.FILE : MessageType.TEXT
    };

    onSend(messageData);
    setMessage('');
    setSelectedAttachments([]);
    setIsTyping(false);
    onTyping?.(false);
  }, [message, selectedAttachments, onSend, onTyping]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Math.random().toString(36),
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    
    setSelectedAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id) => {
    setSelectedAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  const handleQuickReply = useCallback((reply) => {
    setMessage(reply);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={`enterprise-message-input ${className}`}>
      {/* 快速回复 */}
      {quickReplies.length > 0 && (
        <div className="quick-replies">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              className="quick-reply-btn"
              onClick={() => handleQuickReply(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* 附件预览 */}
      {selectedAttachments.length > 0 && (
        <div className="attachments-preview">
          {selectedAttachments.map(att => (
            <div key={att.id} className="attachment-item">
              <span>{att.name}</span>
              <button onClick={() => removeAttachment(att.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="input-container">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="message-textarea"
        />
        
        <div className="input-actions">
          <button
            className="attachment-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            📎
          </button>
          
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && selectedAttachments.length === 0)}
          >
            发送
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
});

// 消息状态指示器
export const MessageStatusIndicator = React.memo(({ status, timestamp }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return '';
    }
  };

  const getStatusClass = () => {
    return `message-status ${status}`;
  };

  return (
    <div className={getStatusClass()}>
      <span className="status-icon">{getStatusIcon()}</span>
      {timestamp && (
        <span className="status-time">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
});

// 导出所有组件
export default {
  EnterpriseMessage,
  EnterpriseChatContainer,
  EnterpriseMessageInput,
  MessageStatusIndicator,
  MessageType,
  MessagePriority
};