import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  ApiResponse,
  ConnectionRequest,
  ConnectionResponse,
  SendMessageRequest,
  SendMessageResponse,
  LongPollingRequest,
  LongPollingResponse,
  MessageData,
  SystemStatus,
  User
} from '../types';
import { storage, sessionStorage, handleError, retry } from '../utils';

// API配置
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// 默认配置
const DEFAULT_CONFIG: ApiConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// API客户端类
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private socket: Socket | null = null;
  private config: ApiConfig;
  private sessionToken: string | null = null;
  private connectionId: string | null = null;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return instance;
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加认证token
        if (this.sessionToken) {
          config.headers.Authorization = `Bearer ${this.sessionToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token过期，清除本地存储
          this.clearSession();
        }
        return Promise.reject(error);
      }
    );
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      handleError(error, 'Health check failed');
      throw error;
    }
  }

  // 获取系统状态
  async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    try {
      const response = await this.axiosInstance.get('/system/status');
      return response.data;
    } catch (error) {
      handleError(error, 'Get system status failed');
      throw error;
    }
  }

  // 创建连接
  async createConnection(request: ConnectionRequest): Promise<ApiResponse<ConnectionResponse>> {
    try {
      const response = await retry(
        () => this.axiosInstance.post('/connect', request),
        this.config.retryAttempts,
        this.config.retryDelay
      );

      const data = response.data;
      if (data.success && data.data) {
        this.sessionToken = data.data.session_token;
        this.connectionId = data.data.connection_id;
        
        // 保存到本地存储
        storage.set('session_token', this.sessionToken);
        storage.set('connection_id', this.connectionId);
        storage.set('user_info', {
          user_id: request.user_id,
          user_name: request.user_name,
          user_type: request.user_type
        });
      }

      return data;
    } catch (error) {
      handleError(error, 'Create connection failed');
      throw error;
    }
  }

  // 断开连接
  async disconnect(sessionId?: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const id = sessionId || this.connectionId;
      if (!id) {
        throw new Error('No session ID available');
      }

      const response = await this.axiosInstance.post(`/disconnect/${id}`);
      const data = response.data;

      if (data.success) {
        this.clearSession();
      }

      return data;
    } catch (error) {
      handleError(error, 'Disconnect failed');
      throw error;
    }
  }

  // 发送消息
  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<SendMessageResponse>> {
    try {
      if (!this.sessionToken) {
        throw new Error('No session token available');
      }

      const response = await this.axiosInstance.post(
        `/message/${this.sessionToken}`,
        request
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Send message failed');
      throw error;
    }
  }

  // 长轮询获取消息
  async longPolling(request: LongPollingRequest): Promise<ApiResponse<LongPollingResponse>> {
    try {
      const response = await this.axiosInstance.post('/long-polling', request);
      return response.data;
    } catch (error) {
      handleError(error, 'Long polling failed');
      throw error;
    }
  }

  // 获取待处理消息
  async getPendingMessages(lastMessageId?: string): Promise<ApiResponse<MessageData[]>> {
    try {
      if (!this.sessionToken) {
        throw new Error('No session token available');
      }

      const params = lastMessageId ? { last_message_id: lastMessageId } : {};
      const response = await this.axiosInstance.get(
        `/messages/${this.sessionToken}`,
        { params }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Get pending messages failed');
      throw error;
    }
  }

  // 获取统计信息
  async getStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get('/stats');
      return response.data;
    } catch (error) {
      handleError(error, 'Get stats failed');
      throw error;
    }
  }

  // WebSocket连接
  connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          timeout: this.config.timeout,
          auth: {
            token: this.sessionToken
          }
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // 发送WebSocket消息
  sendWebSocketMessage(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  // 监听WebSocket事件
  onWebSocketEvent(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 移除WebSocket事件监听
  offWebSocketEvent(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // 断开WebSocket连接
  disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 检查WebSocket连接状态
  isWebSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 恢复会话
  restoreSession(): boolean {
    const token = storage.get<string>('session_token');
    const connectionId = storage.get<string>('connection_id');
    
    if (token && connectionId) {
      this.sessionToken = token;
      this.connectionId = connectionId;
      return true;
    }
    
    return false;
  }

  // 清除会话
  clearSession(): void {
    this.sessionToken = null;
    this.connectionId = null;
    this.disconnectWebSocket();
    
    storage.remove('session_token');
    storage.remove('connection_id');
    storage.remove('user_info');
  }

  // 获取当前会话信息
  getSessionInfo(): { token: string | null; connectionId: string | null } {
    return {
      token: this.sessionToken,
      connectionId: this.connectionId
    };
  }

  // 获取用户信息
  getUserInfo(): User | null {
    return storage.get<User>('user_info');
  }

  // 通用GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error) {
      handleError(error, `GET ${url} failed`);
      throw error;
    }
  }

  // 通用POST请求
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return response.data;
    } catch (error) {
      handleError(error, `POST ${url} failed`);
      throw error;
    }
  }

  // 通用PUT请求
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put(url, data, config);
      return response.data;
    } catch (error) {
      handleError(error, `PUT ${url} failed`);
      throw error;
    }
  }

  // 通用DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(url, config);
      return response.data;
    } catch (error) {
      handleError(error, `DELETE ${url} failed`);
      throw error;
    }
  }

  // 文件上传
  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.axiosInstance.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      handleError(error, `Upload file failed`);
      throw error;
    }
  }

  // 文件下载
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      handleError(error, `Download file failed`);
      throw error;
    }
  }
}

// 创建全局API客户端实例
export const apiClient = new ApiClient();

// 导出默认实例
export default apiClient;