// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: number;
  error_code?: string;
}

// 连接相关类型
export interface ConnectionRequest {
  user_id: string;
  user_name: string;
  user_type: 'customer' | 'agent' | 'admin';
  session_id?: string;
  metadata?: Record<string, string>;
}

export interface ConnectionResponse {
  connection_id: string;
  websocket_url: string;
  http_fallback_url: string;
  session_token: string;
  expires_at: number;
  server_info: ServerInfo;
}

export interface ServerInfo {
  server_id: string;
  version: string;
  capabilities: string[];
  max_message_size: number;
  heartbeat_interval: number;
}

// 消息相关类型
export interface MessageData {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  message_type: MessageType;
  content: string;
  timestamp: number;
  metadata?: Record<string, string>;
  status?: MessageStatus;
  read_at?: number;
}

export type MessageType = 
  | 'text'
  | 'image'
  | 'file'
  | 'voice'
  | 'video'
  | 'system'
  | 'notification'
  | 'typing'
  | 'read_receipt';

export type MessageStatus = 
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'pending';

export interface SendMessageRequest {
  recipient_id: string;
  message_type: MessageType;
  content: string;
  metadata?: Record<string, string>;
}

export interface SendMessageResponse {
  message_id: string;
  status: string;
  timestamp: number;
}

// 用户相关类型
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  user_type: 'customer' | 'agent' | 'admin';
  status: UserStatus;
  last_seen?: number;
  metadata?: Record<string, any>;
}

export type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

// 会话相关类型
export interface Session {
  id: string;
  user_id: string;
  user_type: 'customer' | 'agent' | 'admin';
  connection_type: ConnectionType;
  created_at: number;
  last_activity: number;
  is_active: boolean;
}

export type ConnectionType = 'websocket' | 'long_polling' | 'server_sent_events';

// 长轮询相关类型
export interface LongPollingRequest {
  session_token: string;
  timeout?: number;
  last_message_id?: string;
}

export interface LongPollingResponse {
  messages: MessageData[];
  next_timeout: number;
  has_more: boolean;
}

// 系统状态类型
export interface SystemStatus {
  server_id: string;
  version: string;
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
  active_connections: number;
  total_messages: number;
  load_balancer_stats: LoadBalancerStats;
  websocket_pool_stats: WebSocketPoolStats;
}

export interface LoadBalancerStats {
  total_requests: number;
  active_servers: number;
  average_response_time: number;
  error_rate: number;
}

export interface WebSocketPoolStats {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  connection_errors: number;
}

// 组件Props类型
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// 聊天相关类型
export interface ChatMessageProps {
  message: MessageData;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

export interface ChatInputProps {
  onSend: (content: string, type: MessageType) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowedTypes?: MessageType[];
}

export interface ChatListProps {
  messages: MessageData[];
  currentUserId: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMessageAction?: (action: string, message: MessageData) => void;
}

// 表单相关类型
export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | undefined;
  };
}

// 通知相关类型
export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: (id: string) => void;
}

// 主题相关类型
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// 性能监控类型
export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateTime: number;
  memoryUsage?: number;
  timestamp: number;
}

// WebSocket事件类型
export interface WebSocketEvent {
  type: 'message' | 'connection' | 'disconnection' | 'error' | 'heartbeat';
  data?: any;
  timestamp: number;
}

// 错误处理类型
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}