 // API 配置文件
// 用于配置前后端通信的基础设置

// API 基础配置
export const API_CONFIG = {
    // WebSocket 服务器地址
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:6006/ws',
    
    // HTTP API 基础地址
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:6006',
    
    // 文件上传配置
    UPLOAD: {
      // 最大文件大小（MB）
      MAX_FILE_SIZE: 10,
      // 最大图片大小（MB）
      MAX_IMAGE_SIZE: 5,
      // 最大语音时长（秒）
      MAX_VOICE_DURATION: 60,
      // 允许的图片类型
      ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      // 允许的文件类型
      ALLOWED_FILE_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ],
    },
    
    // 请求超时配置（毫秒）
    TIMEOUT: {
      DEFAULT: 10000,
      UPLOAD: 30000,
    },
  };
  
  // API 端点
  export const API_ENDPOINTS = {
    // 文件上传 - 统一使用 /api/file/upload
    UPLOAD_FILE: '/api/file/upload',
    UPLOAD_IMAGE: '/api/file/upload',
    UPLOAD_VOICE: '/api/file/upload',
    
    // 消息相关 - 仅用于历史记录查询
    // 消息发送通过 WebSocket 进行，不使用 HTTP API
    GET_MESSAGES: '/api/messages',
    
    // 用户相关
    GET_USER_INFO: '/api/user/info',
    UPDATE_STATUS: '/api/user/status',
  };
  
  // WebSocket 消息类型
  export const WS_MESSAGE_TYPE = {
    // 连接相关
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    HEARTBEAT: 'heartbeat',
    
    // 消息相关
    MESSAGE: 'message',
    MESSAGE_STATUS: 'message_status',
    TYPING: 'typing',
    
    // 用户状态
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
    USER_STATUS: 'user_status',
  };
  
  // HTTP 请求工具函数
  export async function request(endpoint, options = {}) {
    const url = `${API_CONFIG.API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  // 文件上传工具函数
  export async function uploadFile(file, type = 'file') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const endpoint = {
      image: API_ENDPOINTS.UPLOAD_IMAGE,
      voice: API_ENDPOINTS.UPLOAD_VOICE,
      file: API_ENDPOINTS.UPLOAD_FILE,
    }[type] || API_ENDPOINTS.UPLOAD_FILE;
    
    const response = await fetch(`${API_CONFIG.API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return response.json();
  }