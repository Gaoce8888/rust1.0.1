import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, User, ChatSession, Message, ContactForm, LoginForm } from '@/types';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add timestamp for cache busting
        config.headers['X-Timestamp'] = Date.now().toString();
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      
      if (response.data.success) {
        return response.data.data as T;
      } else {
        throw new Error(response.data.message || 'API request failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginForm): Promise<{ user: User; token: string }> {
    return this.request({
      method: 'POST',
      url: '/api/auth/login',
      data: credentials,
    });
  }

  async logout(): Promise<void> {
    await this.request({
      method: 'POST',
      url: '/api/auth/logout',
    });
    localStorage.removeItem('auth_token');
  }

  async getCurrentUser(): Promise<User> {
    return this.request({
      method: 'GET',
      url: '/api/auth/me',
    });
  }

  // Chat Sessions
  async getSessions(page = 1, limit = 20): Promise<{ sessions: ChatSession[]; total: number }> {
    return this.request({
      method: 'GET',
      url: '/api/sessions',
      params: { page, limit },
    });
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    return this.request({
      method: 'GET',
      url: `/api/sessions/${sessionId}`,
    });
  }

  async createSession(data: { subject?: string; department?: string; priority?: string }): Promise<ChatSession> {
    return this.request({
      method: 'POST',
      url: '/api/sessions',
      data,
    });
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    return this.request({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}`,
      data: updates,
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    return this.request({
      method: 'POST',
      url: `/api/sessions/${sessionId}/close`,
    });
  }

  // Messages
  async getMessages(sessionId: string, page = 1, limit = 50): Promise<{ messages: Message[]; total: number }> {
    return this.request({
      method: 'GET',
      url: `/api/sessions/${sessionId}/messages`,
      params: { page, limit },
    });
  }

  async sendMessage(sessionId: string, content: string, type: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    return this.request({
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages`,
      data: { content, type },
    });
  }

  async markMessageRead(sessionId: string, messageId: string): Promise<void> {
    return this.request({
      method: 'POST',
      url: `/api/sessions/${sessionId}/messages/${messageId}/read`,
    });
  }

  // File Upload
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request({
      method: 'POST',
      url: '/api/upload',
      data: formData,
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
  }

  // Contact Form
  async submitContactForm(form: ContactForm): Promise<{ sessionId: string }> {
    return this.request({
      method: 'POST',
      url: '/api/contact',
      data: form,
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.request({
      method: 'GET',
      url: '/api/health',
    });
  }

  // User Profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.request({
      method: 'PATCH',
      url: '/api/profile',
      data: updates,
    });
  }

  // Search
  async search(query: string, type?: 'message' | 'session'): Promise<any[]> {
    return this.request({
      method: 'GET',
      url: '/api/search',
      params: { q: query, type },
    });
  }

  // System Stats
  async getStats(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/stats',
    });
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Export individual methods for easier use
export const {
  login,
  logout,
  getCurrentUser,
  getSessions,
  getSession,
  createSession,
  updateSession,
  closeSession,
  getMessages,
  sendMessage,
  markMessageRead,
  uploadFile,
  submitContactForm,
  healthCheck,
  updateProfile,
  search,
  getStats,
} = apiClient;