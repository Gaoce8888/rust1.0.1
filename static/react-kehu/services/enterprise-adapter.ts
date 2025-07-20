import { useState, useEffect, useCallback, useRef } from 'react';

// 类型定义
export interface User {
  id: string;
  name: string;
  role: 'customer' | 'support';
  avatar?: string;
  status: 'online' | 'offline';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: 'text' | 'file' | 'voice';
  time: string;
  status: 'sending' | 'sent' | 'read' | 'error';
  fileUrl?: string;
  fileName?: string;
}

export interface ChatSession {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface EnterpriseAdapterConfig {
  apiUrl: string;
  wsUrl: string;
  debug?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface EnterpriseAdapter {
  connect: () => Promise<void>;
  disconnect: () => void;
  login: (username: string, password: string, role: string) => Promise<User>;
  logout: () => Promise<void>;
  sendMessage: (receiverId: string, text: string, type?: string) => Promise<void>;
  getMessages: (targetUserId: string) => Promise<Message[]>;
  getOnlineUsers: () => Promise<User[]>;
  uploadFile: (file: File) => Promise<string>;
}

// WebSocket 连接管理
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private config: EnterpriseAdapterConfig;
  private onMessage: (data: any) => void;
  private onStatusChange: (connected: boolean) => void;

  constructor(
    config: EnterpriseAdapterConfig,
    onMessage: (data: any) => void,
    onStatusChange: (connected: boolean) => void
  ) {
    this.config = config;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl);
        
        this.ws.onopen = () => {
          if (this.config.debug) console.log('WebSocket connected');
          this.onStatusChange(true);
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.onMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          if (this.config.debug) console.log('WebSocket disconnected');
          this.onStatusChange(false);
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift();
      this.send(data);
    }
  }

  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      if (this.config.debug) console.log('Attempting to reconnect...');
      this.connect().catch(console.error);
    }, this.config.reconnectInterval || 5000);
  }
}

// HTTP API 客户端
class ApiClient {
  private config: EnterpriseAdapterConfig;

  constructor(config: EnterpriseAdapterConfig) {
    this.config = config;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async login(username: string, password: string, role: string): Promise<User> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  async logout(): Promise<void> {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  async getMessages(targetUserId: string): Promise<Message[]> {
    return this.request(`/api/messages/${targetUserId}`);
  }

  async getOnlineUsers(): Promise<User[]> {
    return this.request('/api/users/online');
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.config.apiUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.fileUrl;
  }
}

// 企业级适配器实现
export class EnterpriseAdapterImpl implements EnterpriseAdapter {
  private wsManager: WebSocketManager;
  private apiClient: ApiClient;
  private config: EnterpriseAdapterConfig;
  private currentUser: User | null = null;

  constructor(config: EnterpriseAdapterConfig) {
    this.config = config;
    this.apiClient = new ApiClient(config);
    this.wsManager = new WebSocketManager(
      config,
      this.handleWebSocketMessage.bind(this),
      this.handleConnectionStatusChange.bind(this)
    );
  }

  async connect(): Promise<void> {
    await this.wsManager.connect();
  }

  disconnect(): void {
    this.wsManager.disconnect();
  }

  async login(username: string, password: string, role: string): Promise<User> {
    try {
      this.currentUser = await this.apiClient.login(username, password, role);
      await this.connect();
      return this.currentUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.logout();
      this.disconnect();
      this.currentUser = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async sendMessage(receiverId: string, text: string, type: string = 'text'): Promise<void> {
    const message = {
      type: 'message',
      data: {
        receiverId,
        text,
        messageType: type,
        timestamp: new Date().toISOString(),
      },
    };
    
    this.wsManager.send(message);
  }

  async getMessages(targetUserId: string): Promise<Message[]> {
    return this.apiClient.getMessages(targetUserId);
  }

  async getOnlineUsers(): Promise<User[]> {
    return this.apiClient.getOnlineUsers();
  }

  async uploadFile(file: File): Promise<string> {
    return this.apiClient.uploadFile(file);
  }

  private handleWebSocketMessage(data: any): void {
    if (this.config.debug) {
      console.log('WebSocket message received:', data);
    }
    
    // 这里可以添加消息处理逻辑
    // 例如：更新消息状态、接收新消息等
  }

  private handleConnectionStatusChange(connected: boolean): void {
    if (this.config.debug) {
      console.log('Connection status changed:', connected ? 'connected' : 'disconnected');
    }
  }
}

// React Hooks
export function useEnterpriseAdapter(config: EnterpriseAdapterConfig) {
  const [adapter] = useState(() => new EnterpriseAdapterImpl(config));
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string, role: string) => {
    try {
      setError(null);
      const user = await adapter.login(username, password, role);
      setCurrentUser(user);
      return user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      setError(errorMessage);
      throw err;
    }
  }, [adapter]);

  const logout = useCallback(async () => {
    try {
      await adapter.logout();
      setCurrentUser(null);
      setIsConnected(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [adapter]);

  useEffect(() => {
    return () => {
      adapter.disconnect();
    };
  }, [adapter]);

  return {
    adapter,
    isConnected,
    currentUser,
    error,
    login,
    logout,
  };
}

export function useMessages(targetUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 这里需要从适配器获取消息
      // const newMessages = await adapter.getMessages(targetUserId);
      // setMessages(newMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载消息失败');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const sendMessage = useCallback(async (text: string) => {
    try {
      // 这里需要通过适配器发送消息
      // await adapter.sendMessage(targetUserId, text);
      
      // 临时添加到本地消息列表
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: 'current_user',
        receiverId: targetUserId,
        text,
        type: 'text',
        time: new Date().toLocaleTimeString(),
        status: 'sent',
      };
      
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('发送消息失败:', err);
      throw err;
    }
  }, [targetUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    reload: loadMessages,
  };
}