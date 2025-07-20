import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, Message, User, ConnectionStatus } from '@/types';
import { useAppStore } from '@/store';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.socket?.connected) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3030';
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      auth: {
        token: localStorage.getItem('auth_token'),
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      useAppStore.getState().setConnectionStatus({
        connected: true,
        reconnecting: false,
        lastConnected: new Date().toISOString(),
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      useAppStore.getState().setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: reason,
      });

      // Attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      
      useAppStore.getState().setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: error.message,
      });

      this.scheduleReconnect();
    });

    // Message events
    this.socket.on('message', (data: WebSocketMessage) => {
      this.handleMessage(data);
    });

    this.socket.on('new_message', (message: Message) => {
      const { currentSession, addMessage } = useAppStore.getState();
      if (currentSession) {
        addMessage(currentSession.id, message);
      }
    });

    this.socket.on('message_status', (data: { messageId: string; status: string; sessionId: string }) => {
      const { updateMessage } = useAppStore.getState();
      updateMessage(data.sessionId, data.messageId, { status: data.status as any });
    });

    this.socket.on('user_joined', (user: User) => {
      useAppStore.getState().addNotification({
        type: 'info',
        title: '用户加入',
        message: `${user.name} 加入了聊天`,
      });
    });

    this.socket.on('user_left', (user: User) => {
      useAppStore.getState().addNotification({
        type: 'info',
        title: '用户离开',
        message: `${user.name} 离开了聊天`,
      });
    });

    this.socket.on('typing', (data: { userId: string; sessionId: string; isTyping: boolean }) => {
      // Handle typing indicators
      console.log('Typing indicator:', data);
    });

    this.socket.on('session_update', (sessionData: any) => {
      const { updateSession } = useAppStore.getState();
      updateSession(sessionData.id, sessionData);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      useAppStore.getState().addNotification({
        type: 'error',
        title: '连接错误',
        message: error.message || '发生未知错误',
      });
    });
  }

  private handleMessage(data: WebSocketMessage) {
    const { type, payload, sessionId } = data;
    
    switch (type) {
      case 'message':
        if (sessionId) {
          useAppStore.getState().addMessage(sessionId, payload as Message);
        }
        break;
      
      case 'user_join':
        useAppStore.getState().addNotification({
          type: 'info',
          title: '用户加入',
          message: `${payload.name} 加入了聊天`,
        });
        break;
      
      case 'user_leave':
        useAppStore.getState().addNotification({
          type: 'info',
          title: '用户离开',
          message: `${payload.name} 离开了聊天`,
        });
        break;
      
      case 'status_update':
        if (sessionId) {
          useAppStore.getState().updateSession(sessionId, payload);
        }
        break;
      
      default:
        console.log('Unknown message type:', type);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      useAppStore.getState().setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: '连接失败，请刷新页面重试',
      });
      return;
    }

    useAppStore.getState().setConnectionStatus({
      connected: false,
      reconnecting: true,
    });

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  // Public methods
  public sendMessage(sessionId: string, content: string, type: 'text' | 'image' | 'file' = 'text') {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('send_message', {
      sessionId,
      content,
      type,
    });
  }

  public joinSession(sessionId: string) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('join_session', { sessionId });
  }

  public leaveSession(sessionId: string) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('leave_session', { sessionId });
  }

  public sendTyping(sessionId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('typing', { sessionId, isTyping });
  }

  public updateUserStatus(status: 'online' | 'away' | 'offline') {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('status_update', { status });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Create and export WebSocket service instance
export const wsService = new WebSocketService();

// Export for use in components
export default WebSocketService;