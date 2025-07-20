import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { 
  MessageData, 
  User, 
  ConnectionRequest, 
  SendMessageRequest,
  SystemStatus 
} from '../types';
import { storage, debounce, throttle } from '../utils';

// 基础状态管理Hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storage.get<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

// 会话状态管理Hook
export function useSession() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    // 恢复会话
    const restored = apiClient.restoreSession();
    if (restored) {
      setIsConnected(true);
      setUser(apiClient.getUserInfo());
      setConnectionId(apiClient.getSessionInfo().connectionId);
    }
  }, []);

  const connect = useCallback(async (request: ConnectionRequest) => {
    try {
      const response = await apiClient.createConnection(request);
      if (response.success && response.data) {
        setIsConnected(true);
        setUser({
          id: request.user_id,
          name: request.user_name,
          user_type: request.user_type,
          status: 'online'
        });
        setConnectionId(response.data.connection_id);
        return response.data;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await apiClient.disconnect();
      setIsConnected(false);
      setUser(null);
      setConnectionId(null);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, []);

  return {
    isConnected,
    user,
    connectionId,
    connect,
    disconnect
  };
}

// 消息管理Hook
export function useMessages(recipientId?: string) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // 获取消息
  const fetchMessages = useCallback(async (lastId?: string) => {
    if (!recipientId) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.getPendingMessages(lastId);
      if (response.success && response.data) {
        if (lastId) {
          setMessages(prev => [...response.data!, ...prev]);
        } else {
          setMessages(response.data);
        }
        setHasMore(response.data.length > 0);
        if (response.data.length > 0) {
          lastMessageIdRef.current = response.data[response.data.length - 1].message_id;
        }
      }
    } catch (error) {
      console.error('Fetch messages failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recipientId]);

  // 发送消息
  const sendMessage = useCallback(async (content: string, type: string = 'text') => {
    if (!recipientId) return;
    
    const request: SendMessageRequest = {
      recipient_id: recipientId,
      message_type: type as any,
      content
    };

    try {
      const response = await apiClient.sendMessage(request);
      if (response.success && response.data) {
        const newMessage: MessageData = {
          message_id: response.data.message_id,
          sender_id: apiClient.getUserInfo()?.id || '',
          recipient_id: recipientId,
          message_type: type as any,
          content,
          timestamp: response.data.timestamp,
          status: 'sent'
        };
        setMessages(prev => [...prev, newMessage]);
        return response.data;
      }
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  }, [recipientId]);

  // 添加消息
  const addMessage = useCallback((message: MessageData) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 更新消息状态
  const updateMessageStatus = useCallback((messageId: string, status: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.message_id === messageId 
          ? { ...msg, status: status as any }
          : msg
      )
    );
  }, []);

  // 加载更多消息
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchMessages(lastMessageIdRef.current || undefined);
    }
  }, [isLoading, hasMore, fetchMessages]);

  useEffect(() => {
    if (recipientId) {
      fetchMessages();
    }
  }, [recipientId, fetchMessages]);

  return {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    addMessage,
    updateMessageStatus,
    loadMore,
    fetchMessages
  };
}

// WebSocket连接Hook
export function useWebSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(async () => {
    if (!url) return;
    
    try {
      setError(null);
      await apiClient.connectWebSocket(url);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    apiClient.disconnectWebSocket();
    setIsConnected(false);
    setError(null);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const reconnect = useCallback((delay: number = 5000) => {
    disconnect();
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, disconnect]);

  // 监听连接状态
  useEffect(() => {
    const checkConnection = () => {
      const connected = apiClient.isWebSocketConnected();
      setIsConnected(connected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // 监听WebSocket事件
  useEffect(() => {
    if (!isConnected) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = (err: any) => setError(err.message);

    apiClient.onWebSocketEvent('connect', handleConnect);
    apiClient.onWebSocketEvent('disconnect', handleDisconnect);
    apiClient.onWebSocketEvent('error', handleError);

    return () => {
      apiClient.offWebSocketEvent('connect', handleConnect);
      apiClient.offWebSocketEvent('disconnect', handleDisconnect);
      apiClient.offWebSocketEvent('error', handleError);
    };
  }, [isConnected]);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    reconnect
  };
}

// 系统状态Hook
export function useSystemStatus() {
  const { data: systemStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => apiClient.getSystemStatus(),
    refetchInterval: 30000, // 30秒刷新一次
    staleTime: 10000, // 10秒内不重新获取
  });

  return {
    systemStatus: systemStatus?.data,
    isLoading,
    error,
    refetch
  };
}

// 性能监控Hook
export function usePerformanceMonitor(componentName: string) {
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    renderCountRef.current = 0;

    return () => {
      const unmountTime = performance.now();
      const totalTime = unmountTime - mountTimeRef.current;
      console.log(`${componentName} unmounted after ${totalTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  useEffect(() => {
    renderCountRef.current += 1;
    const renderTime = performance.now() - mountTimeRef.current;
    console.log(`${componentName} rendered ${renderCountRef.current} times, took ${renderTime.toFixed(2)}ms`);
  });

  return {
    renderCount: renderCountRef.current,
    mountTime: mountTimeRef.current
  };
}

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

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

// 节流Hook
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// 窗口大小Hook
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// 滚动位置Hook
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: window.pageXOffset,
    y: window.pageYOffset,
  });

  useEffect(() => {
    const handleScroll = throttle(() => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset,
      });
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollPosition;
}

// 网络状态Hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// 媒体查询Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// 点击外部Hook
export function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// 键盘事件Hook
export function useKeyPress(targetKey: string): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(true);
      }
    };

    const upHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
}

// 表单验证Hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Record<keyof T, (value: any) => string | undefined>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback((field: keyof T, value: any) => {
    const validator = validationSchema[field];
    return validator ? validator(value) : undefined;
  }, [validationSchema]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validate(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [touched, validate]);

  const setTouchedField = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validate(field, values[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [validate, values]);

  const isValid = useMemo(() => {
    return Object.keys(validationSchema).every(field => {
      const error = validate(field as keyof T, values[field as keyof T]);
      return !error;
    });
  }, [validationSchema, validate, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouchedField,
    reset
  };
}

// 异步操作Hook
export function useAsync<T, E = any>() {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: E | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, loading: false, error: error as E });
      throw error;
    }
  }, []);

  return { ...state, execute };
}