// 测试客服端完整流程：登录 -> WebSocket连接
import WebSocket from 'ws';
import fetch from 'node-fetch';

console.log('🔍 测试客服端完整流程...\n');

const baseUrl = 'http://localhost:6006';

// 客服账号信息
const kefuCredentials = {
  username: 'kefu001',
  password: '123456'
};

async function testKefuFlow() {
  try {
    // 步骤1: 登录
    console.log('1️⃣ 登录客服系统...');
    console.log('- 用户名:', kefuCredentials.username);
    
    const loginResponse = await fetch(`${baseUrl}/api/kefu/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kefuCredentials)
    });

    const loginData = await loginResponse.json();
    console.log('- 登录响应:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('❌ 登录失败:', loginData.message);
      return;
    }

    console.log('✅ 登录成功！');
    console.log('- 客服ID:', loginData.kefu_id);
    console.log('- 真实姓名:', loginData.real_name);
    console.log('- Session Token:', loginData.session_token);

    // 步骤2: 使用session_token连接WebSocket
    console.log('\n2️⃣ 连接WebSocket...');
    
    const wsParams = {
      user_id: loginData.kefu_id,
      user_type: 'kefu',
      user_name: loginData.real_name || loginData.kefu_id,
      session_id: `session_${Date.now()}`,
      session_token: loginData.session_token,
      timestamp: new Date().toISOString()
    };

    const queryString = new URLSearchParams(wsParams).toString();
    const wsUrl = `ws://localhost:6006/ws?${queryString}`;
    
    console.log('- WebSocket URL:', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('\n✅ WebSocket连接成功！');
      
      // 发送测试消息
      setTimeout(() => {
        const message = {
          type: 'Chat',
          content: '测试消息',
          to_user_id: 'system',
          timestamp: new Date().toISOString()
        };
        console.log('\n发送测试消息:', message);
        ws.send(JSON.stringify(message));
      }, 1000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('\n📥 收到消息:', JSON.stringify(message, null, 2));
        
        if (message.type === 'Welcome') {
          console.log('- 收到欢迎消息');
        } else if (message.type === 'OnlineUsers') {
          console.log('- 在线用户数:', message.users ? message.users.length : 0);
        } else if (message.type === 'OnlineCustomers') {
          console.log('- 在线客户数:', message.customers ? message.customers.length : 0);
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
      
      // 登出
      testLogout(loginData.kefu_id);
    });

    // 10秒后关闭连接
    setTimeout(() => {
      console.log('\n准备关闭连接...');
      ws.close();
    }, 10000);

  } catch (error) {
    console.error('\n❌ 测试过程出错:', error.message);
  }
}

async function testLogout(kefuId) {
  try {
    console.log('\n3️⃣ 登出客服系统...');
    const logoutResponse = await fetch(`${baseUrl}/api/kefu/logout?kefu_id=${kefuId}`, {
      method: 'POST'
    });
    
    if (logoutResponse.ok) {
      console.log('✅ 登出成功');
    } else {
      console.log('❌ 登出失败');
    }
  } catch (error) {
    console.error('登出错误:', error.message);
  }
  
  process.exit(0);
}

// 运行测试
testKefuFlow();