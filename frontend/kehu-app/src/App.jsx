import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// 生成唯一ID的工具函数
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const [messages, setMessages] = useState([
    { id: generateMessageId(), text: '欢迎使用企业级客服系统！', type: 'received' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const [userId] = useState('customer_' + Math.random().toString(36).substr(2, 9));
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.hostname}:6006/ws?user_id=${userId}&user_type=kehu&user_name=客户${userId.substr(-4)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setConnectionStatus('已连接');
      addMessage('系统：连接成功，正在为您分配客服...', 'received');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('消息解析错误:', e);
      }
    };
    
    ws.onclose = () => {
      setConnectionStatus('连接断开');
      setTimeout(connect, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setConnectionStatus('连接错误');
    };
  }, [userId]);

  const handleMessage = useCallback((data) => {
    switch(data.type) {
      case 'Chat':
        if (data.from !== userId) {
          addMessage(`客服: ${data.content}`, 'received');
        }
        break;
      case 'Welcome':
        addMessage(`系统: 欢迎 ${data.user_name}`, 'received');
        break;
      case 'UserJoined':
        if (data.user_type === 'kefu') {
          addMessage(`系统: 客服 ${data.user_name} 已上线`, 'received');
        }
        break;
    }
  }, [userId]);

  const addMessage = useCallback((text, type) => {
    setMessages(prev => [...prev, { 
      id: generateMessageId(),
      text, 
      type 
    }]);
  }, []);

  const sendMessage = useCallback(() => {
    const message = inputValue.trim();
    
    if (message && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msgData = {
        type: 'Chat',
        from: userId,
        content: message,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(msgData));
      addMessage(`我: ${message}`, 'sent');
      setInputValue('');
    }
  }, [inputValue, userId, addMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="container">
      <h1>客户端聊天界面</h1>
      <div className={`status ${connectionStatus === '已连接' ? 'connected' : ''}`}>
        连接状态：{connectionStatus}
      </div>
      
      <div className="chat-container">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
          />
          <button onClick={sendMessage}>发送</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(App);