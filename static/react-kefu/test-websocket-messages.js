// 测试WebSocket消息格式的脚本
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:6006/ws');

ws.on('open', () => {
  console.log('WebSocket连接成功');
  
  // 登录消息
  ws.send(JSON.stringify({
    type: 'Login',
    user_id: 'test_kefu_001',
    user_type: 'Kefu',
    user_name: '测试客服',
    timestamp: new Date().toISOString()
  }));
  
  // 延迟后请求在线用户
  setTimeout(() => {
    console.log('发送GetOnlineUsers请求...');
    ws.send(JSON.stringify({
      type: 'GetOnlineUsers',
      user_id: 'test_kefu_001',
      timestamp: new Date().toISOString()
    }));
  }, 1000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('收到消息:', {
    type: message.type,
    data: message
  });
  
  // 特别关注这些消息类型
  if (['OnlineUsers', 'UserJoined', 'UserLeft', 'Status'].includes(message.type)) {
    console.log(`=== ${message.type} 消息详情 ===`);
    console.log(JSON.stringify(message, null, 2));
  }
});

ws.on('error', (error) => {
  console.error('WebSocket错误:', error);
});

ws.on('close', () => {
  console.log('WebSocket连接关闭');
});

// 10秒后关闭连接
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 10000);