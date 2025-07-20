// 用户相关类型
export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  status: 'online' | 'offline' | 'away';
  role: 'customer' | 'agent' | 'admin';
  createdAt: string;
  lastActiveAt: string;
}

// 消息相关类型
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'system';
  sender: User;
  receiver?: User;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    duration?: number; // for voice messages
    imageUrl?: string;
    thumbnailUrl?: string;
  };
}

// 聊天会话类型
export interface ChatSession {
  id: string;
  participants: User[];
  messages: Message[];
  status: 'active' | 'closed' | 'waiting';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department?: string;
  subject?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: number;
  error_code?: string;
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'message' | 'user_join' | 'user_leave' | 'typing' | 'stop_typing' | 'status_update' | 'session_update';
  payload: any;
  timestamp: string;
  sessionId?: string;
}

// 连接状态类型
export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  lastConnected?: string;
}

// 应用状态类型
export interface AppState {
  user: User | null;
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  connectionStatus: ConnectionStatus;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

// 通知类型
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary';
}

// 设置类型
export interface Settings {
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
  };
}

// 表单类型
export interface LoginForm {
  username: string;
  password: string;
  remember: boolean;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  department?: string;
  priority: 'low' | 'normal' | 'high';
}

// 文件上传类型
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

// 搜索结果类型
export interface SearchResult {
  type: 'message' | 'session' | 'user';
  item: Message | ChatSession | User;
  highlights: string[];
  score: number;
}

// 分页类型
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 统计类型
export interface ChatStats {
  totalSessions: number;
  activeSessions: number;
  avgResponseTime: number;
  satisfactionScore: number;
  messagesCount: number;
}

// 主题配置类型
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    background: string;
    surface: string;
    text: string;
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
  };
}