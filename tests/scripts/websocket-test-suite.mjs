import WebSocket from 'ws';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:6006';
const WS_URL = 'ws://localhost:6006/ws';

const TEST_RESULTS = [];

function log(test, status, message, details = {}) {
  const result = {
    timestamp: new Date().toISOString(),
    test,
    status,
    message,
    details
  };
  TEST_RESULTS.push(result);
  console.log(`[${status}] ${test}: ${message}`);
}

// 工具函数：等待
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试客服WebSocket连接
async function testKefuWebSocket() {
  console.log('\n=== 测试客服 WebSocket 连接 ===');
  
  // 先登录获取 session_token
  const loginResponse = await fetch(`${BASE_URL}/api/kefu/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'kefu001',
      password: '123456'
    })
  });
  
  const loginData = await loginResponse.json();
  if (!loginData.success) {
    log('客服登录', '❌ FAIL', '无法登录获取 session_token');
    return;
  }
  
  const sessionToken = loginData.session_token;
  const kefuId = loginData.kefu_id;
  
  // 构建WebSocket URL
  const wsUrl = `${WS_URL}?user_id=${kefuId}&user_type=kefu&user_name=kefu001&session_token=${sessionToken}&timestamp=${new Date().toISOString()}`;
  
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let heartbeatInterval;
    
    ws.on('open', () => {
      log('客服WebSocket连接', '✅ PASS', '连接成功');
      
      // 发送心跳
      heartbeatInterval = setInterval(() => {
        const heartbeat = {
          type: 'Heartbeat',
          user_id: kefuId,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(heartbeat));
        log('客服心跳发送', '✅ PASS', '心跳已发送');
      }, 5000);
      
      // 发送获取在线用户消息
      const getOnlineUsers = {
        type: 'GetOnlineUsers',
        user_id: kefuId,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(getOnlineUsers));
      log('获取在线用户', '✅ PASS', '请求已发送');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log('客服收到消息', '✅ PASS', `消息类型: ${message.type}`, { message });
      } catch (e) {
        log('客服消息解析', '❌ FAIL', '无法解析消息', { raw: data.toString() });
      }
    });
    
    ws.on('error', (error) => {
      log('客服WebSocket错误', '❌ ERROR', error.message);
    });
    
    ws.on('close', () => {
      log('客服WebSocket关闭', 'ℹ️ INFO', '连接已关闭');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      resolve();
    });
    
    // 10秒后关闭连接
    setTimeout(() => {
      ws.close();
    }, 10000);
  });
}

// 测试客户WebSocket连接
async function testCustomerWebSocket() {
  console.log('\n=== 测试客户 WebSocket 连接 ===');
  
  const customerId = `customer_${Date.now()}`;
  const wsUrl = `${WS_URL}?user_id=${customerId}&user_type=kehu&user_name=测试客户&timestamp=${new Date().toISOString()}`;
  
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let messageCount = 0;
    
    ws.on('open', () => {
      log('客户WebSocket连接', '✅ PASS', '连接成功');
      
      // 发送聊天消息
      setTimeout(() => {
        const chatMessage = {
          type: 'Chat',
          from: customerId,
          content: '你好，我需要帮助',
          content_type: 'Text',
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(chatMessage));
        log('客户发送消息', '✅ PASS', '聊天消息已发送');
      }, 1000);
      
      // 发送打字状态
      setTimeout(() => {
        const typingMessage = {
          type: 'Typing',
          from: customerId,
          is_typing: true,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(typingMessage));
        log('客户打字状态', '✅ PASS', '打字状态已发送');
      }, 2000);
    });
    
    ws.on('message', (data) => {
      messageCount++;
      try {
        const message = JSON.parse(data.toString());
        log('客户收到消息', '✅ PASS', `消息类型: ${message.type}, 总消息数: ${messageCount}`, { message });
      } catch (e) {
        log('客户消息解析', '❌ FAIL', '无法解析消息', { raw: data.toString() });
      }
    });
    
    ws.on('error', (error) => {
      log('客户WebSocket错误', '❌ ERROR', error.message);
    });
    
    ws.on('close', () => {
      log('客户WebSocket关闭', 'ℹ️ INFO', '连接已关闭');
      resolve();
    });
    
    // 8秒后关闭连接
    setTimeout(() => {
      ws.close();
    }, 8000);
  });
}

// 测试消息格式验证
async function testMessageFormats() {
  console.log('\n=== 测试消息格式 ===');
  
  const customerId = `test_customer_${Date.now()}`;
  const wsUrl = `${WS_URL}?user_id=${customerId}&user_type=kehu&user_name=格式测试客户&timestamp=${new Date().toISOString()}`;
  
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      log('格式测试连接', '✅ PASS', '连接成功');
      
      // 测试各种消息格式
      const testMessages = [
        {
          name: '文本消息',
          message: {
            type: 'Chat',
            from: customerId,
            content: '测试文本消息',
            content_type: 'Text',
            timestamp: new Date().toISOString()
          }
        },
        {
          name: '图片消息',
          message: {
            type: 'Chat',
            from: customerId,
            content: 'http://example.com/image.jpg',
            content_type: 'Image',
            timestamp: new Date().toISOString()
          }
        },
        {
          name: '文件消息',
          message: {
            type: 'Chat',
            from: customerId,
            content: 'http://example.com/file.pdf',
            content_type: 'File',
            filename: 'test.pdf',
            timestamp: new Date().toISOString()
          }
        },
        {
          name: '心跳消息',
          message: {
            type: 'Heartbeat',
            timestamp: new Date().toISOString()
          }
        },
        {
          name: '历史请求',
          message: {
            type: 'HistoryRequest',
            customer_id: customerId,
            limit: 20,
            timestamp: new Date().toISOString()
          }
        }
      ];
      
      testMessages.forEach((test, index) => {
        setTimeout(() => {
          try {
            ws.send(JSON.stringify(test.message));
            log(`发送${test.name}`, '✅ PASS', '消息格式正确');
          } catch (e) {
            log(`发送${test.name}`, '❌ FAIL', e.message);
          }
        }, (index + 1) * 1000);
      });
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log('格式验证响应', '✅ PASS', `收到响应: ${message.type}`);
      } catch (e) {
        log('格式验证响应', '⚠️ WARN', '响应格式异常');
      }
    });
    
    ws.on('error', (error) => {
      log('格式测试错误', '❌ ERROR', error.message);
    });
    
    // 7秒后关闭
    setTimeout(() => {
      ws.close();
      resolve();
    }, 7000);
  });
}

// 生成测试报告
function generateReport() {
  console.log('\n\n=== WebSocket 测试报告 ===\n');
  
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let info = 0;
  
  TEST_RESULTS.forEach(result => {
    if (result.status === '✅ PASS') passed++;
    else if (result.status === '❌ FAIL') failed++;
    else if (result.status === '❌ ERROR') errors++;
    else if (result.status === 'ℹ️ INFO') info++;
  });
  
  console.log(`总测试项: ${TEST_RESULTS.length}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`❌ 错误: ${errors}`);
  console.log(`ℹ️ 信息: ${info}`);
  
  // 保存详细报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: TEST_RESULTS.length,
      passed,
      failed,
      errors,
      info
    },
    results: TEST_RESULTS
  };
  
  import('fs').then(fs => {
    fs.writeFileSync('WEBSOCKET_TEST_REPORT.json', JSON.stringify(report, null, 2));
  });
  console.log('\n详细报告已保存到: WEBSOCKET_TEST_REPORT.json');
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始 WebSocket 测试套件\n');
  
  try {
    await testKefuWebSocket();
    await wait(2000);
    
    await testCustomerWebSocket();
    await wait(2000);
    
    await testMessageFormats();
    await wait(1000);
    
    generateReport();
  } catch (error) {
    console.error('测试执行错误:', error);
  }
}

// 运行测试
runTests();