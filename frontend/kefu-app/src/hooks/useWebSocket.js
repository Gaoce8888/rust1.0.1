import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketClient } from '../websocket-client';

export const useWebSocket = (url, options = {}) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const wsClientRef = useRef(null);

  const connect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    const client = getWebSocketClient(url, {
      ...options,
      onConnect: () => {
        setConnectionStatus('connected');
        options.onConnect?.();
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
        options.onDisconnect?.();
      },
      onMessage: (data) => {
        handleMessage(data);
        options.onMessage?.(data);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      }
    });

    wsClientRef.current = client;
    client.connect();
  }, [url, options]);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((messageData) => {
    if (wsClientRef.current && connectionStatus === 'connected') {
      return wsClientRef.current.sendMessage(messageData);
    }
    throw new Error('WebSocket not connected');
  }, [connectionStatus]);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'Chat':
        setMessages(prev => [...prev, data]);
        break;
      case 'UserList':
        setCustomers(data.users || []);
        break;
      case 'UserStatus':
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === data.userId 
              ? { ...customer, status: data.status }
              : customer
          )
        );
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connectionStatus,
    messages,
    customers,
    sendMessage,
    connect,
    disconnect
  };
};
