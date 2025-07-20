import React from 'react';
import EnterpriseKefuApp from './components/EnterpriseApp';

// 企业级客服系统主应用
export default function App() {
  const handleError = (error) => {
    console.error('应用错误:', error);
    // 这里可以添加错误上报逻辑
  };

  const config = {
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:6006/ws',
    wsOptions: {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 1000
    }
  };

  return (
    <EnterpriseKefuApp 
      config={config}
      onError={handleError}
    />
  );
}