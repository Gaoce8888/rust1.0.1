// 测试客户端客服匹配功能
const WebSocket = require('ws');

// 模拟客户端连接
const customerWs = new WebSocket('ws://localhost:6006/ws?user_id=test_customer_001&session_id=session_001&user_type=kehu');

customerWs.on('open', () => {
  console.log('客户端WebSocket连接成功');
  
  // 延迟1秒后发送客服请求
  setTimeout(() => {
    console.log('发送客服请求...');
    customerWs.send(JSON.stringify({
      type: 'Chat',
      from: 'test_customer_001',
      to: 'system',
      content: '客户请求客服服务',
      content_type: 'text',
      timestamp: new Date().toISOString()
    }));
  }, 1000);
});

customerWs.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('客户端收到消息:', {
    type: message.type,
    timestamp: new Date().toISOString()
  });
  
  // 详细打印重要消息
  if (['AgentAssigned', 'NoAgentAvailable', 'UserJoined', 'OnlineUsers'].includes(message.type)) {
    console.log(`=== ${message.type} 详情 ===`);
    console.log(JSON.stringify(message, null, 2));
  }
});

customerWs.on('error', (error) => {
  console.error('客户端WebSocket错误:', error);
});

customerWs.on('close', () => {
  console.log('客户端WebSocket连接关闭');
});

// 同时模拟一个客服端连接
setTimeout(() => {
  console.log('\n模拟客服端连接...');
  const agentWs = new WebSocket('ws://localhost:6006/ws?user_id=test_agent_001&session_id=session_002&user_type=kefu');
  
  agentWs.on('open', () => {
    console.log('客服端WebSocket连接成功');
  });
  
  agentWs.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('客服端收到消息:', {
      type: message.type,
      from: message.from
    });
  });
  
  agentWs.on('error', (error) => {
    console.error('客服端WebSocket错误:', error);
  });
  
  // 5秒后关闭客服连接，测试客服离线通知
  setTimeout(() => {
    console.log('\n客服端断开连接...');
    agentWs.close();
  }, 5000);
}, 3000);

// 15秒后关闭所有连接
setTimeout(() => {
  customerWs.close();
  process.exit(0);
}, 15000);