// 测试客服端连接
import WebSocket from 'ws';

console.log('🔍 测试客服端WebSocket连接...\n');

// 客服端连接参数
const kefuParams = {
  user_id: 'kefu_test_' + Date.now(),
  user_type: 'kefu',
  user_name: 'kefu_test',
  session_id: 'session_' + Date.now(),
  timestamp: new Date().toISOString()
};

const queryString = new URLSearchParams(kefuParams).toString();
const wsUrl = `ws://localhost:6006/ws?${queryString}`;

console.log('连接URL:', wsUrl);
console.log('连接参数:', kefuParams);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('\n✅ WebSocket连接成功！');
  
  // 发送登录消息
  const loginMessage = {
    type: 'Login',
    user_id: kefuParams.user_id,
    user_name: kefuParams.user_name,
    timestamp: new Date().toISOString()
  };
  
  console.log('\n发送登录消息:', loginMessage);
  ws.send(JSON.stringify(loginMessage));
  
  // 发送心跳
  setTimeout(() => {
    const heartbeat = {
      type: 'Heartbeat',
      timestamp: new Date().toISOString()
    };
    console.log('\n发送心跳:', heartbeat);
    ws.send(JSON.stringify(heartbeat));
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📥 收到消息:', JSON.stringify(message, null, 2));
    
    // 如果是Welcome消息，记录详细信息
    if (message.type === 'Welcome') {
      console.log('- 服务器欢迎消息');
      console.log('- 用户ID:', message.user_id);
    } else if (message.type === 'OnlineUsers') {
      console.log('- 在线用户列表');
      console.log('- 用户数量:', message.users ? message.users.length : 0);
    }
  } catch (err) {
    console.log('\n📥 收到非JSON消息:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('\n❌ WebSocket错误:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('\n🔌 WebSocket连接关闭');
  console.log('- 关闭代码:', code);
  console.log('- 关闭原因:', reason.toString());
  process.exit(0);
});

// 10秒后关闭连接
setTimeout(() => {
  console.log('\n主动关闭连接...');
  ws.close();
}, 10000);