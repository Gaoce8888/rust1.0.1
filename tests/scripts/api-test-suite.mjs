import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// 配置
const BASE_URL = 'http://localhost:6006';
const TEST_RESULTS = [];

// 工具函数
function log(category, endpoint, method, status, message, details = {}) {
  const result = {
    timestamp: new Date().toISOString(),
    category,
    endpoint,
    method,
    status,
    message,
    details
  };
  TEST_RESULTS.push(result);
  console.log(`[${status}] ${method} ${endpoint}: ${message}`);
}

async function testEndpoint(category, method, endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method,
      ...options
    });
    
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    if (response.ok) {
      log(category, endpoint, method, '✅ PASS', `Status: ${response.status}`, { 
        responseData,
        headers: Object.fromEntries(response.headers.entries())
      });
    } else {
      log(category, endpoint, method, '❌ FAIL', `Status: ${response.status}`, { 
        responseData,
        headers: Object.fromEntries(response.headers.entries())
      });
    }
    
    return { success: response.ok, data: responseData, status: response.status };
  } catch (error) {
    log(category, endpoint, method, '❌ ERROR', error.message);
    return { success: false, error: error.message };
  }
}

// 测试套件
async function runTests() {
  console.log('🚀 开始API测试套件\n');
  
  // 1. 客服认证测试
  console.log('\n=== 1. 客服认证 API ===');
  
  // 1.1 客服登录
  const kefuLogin = await testEndpoint('客服认证', 'POST', '/api/kefu/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'kefu001',
      password: '123456'
    })
  });
  
  let sessionToken = null;
  let kefuId = null;
  if (kefuLogin.success && kefuLogin.data) {
    sessionToken = kefuLogin.data.session_token;
    kefuId = kefuLogin.data.kefu_id;
  }
  
  // 1.2 客服状态
  await testEndpoint('客服认证', 'GET', '/api/kefu/status');
  
  // 1.3 客服心跳
  if (kefuId) {
    await testEndpoint('客服认证', 'POST', `/api/kefu/heartbeat?kefu_id=${kefuId}`);
  }
  
  // 2. 通用认证测试
  console.log('\n=== 2. 通用认证 API ===');
  
  // 2.1 通用登录
  await testEndpoint('通用认证', 'POST', '/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'user001',
      password: '123456'
    })
  });
  
  // 2.2 验证会话
  await testEndpoint('通用认证', 'GET', '/auth/validate');
  
  // 2.3 心跳
  await testEndpoint('通用认证', 'POST', '/auth/heartbeat');
  
  // 3. 系统配置API
  console.log('\n=== 3. 系统配置 API ===');
  
  await testEndpoint('系统配置', 'GET', '/api/config');
  await testEndpoint('系统配置', 'GET', '/api/users');
  await testEndpoint('系统配置', 'GET', '/api/users/online');
  await testEndpoint('系统配置', 'GET', '/api/websocket/stats');
  
  // 4. 文件管理API
  console.log('\n=== 4. 文件管理 API ===');
  
  // 4.1 文件列表
  await testEndpoint('文件管理', 'GET', '/api/file/list');
  await testEndpoint('文件管理', 'GET', '/api/file/list?page=1&limit=10');
  
  // 4.2 文件上传（模拟）
  // 注意：实际文件上传需要真实文件
  console.log('[⚠️  SKIP] POST /api/file/upload: 需要真实文件');
  
  // 5. 语音消息API
  console.log('\n=== 5. 语音消息 API ===');
  
  await testEndpoint('语音消息', 'GET', '/api/voice/list');
  console.log('[⚠️  SKIP] POST /api/voice/upload: 需要真实语音文件');
  
  // 6. 模板API
  console.log('\n=== 6. 模板 API ===');
  
  await testEndpoint('模板', 'GET', '/api/template/list');
  
  // 7. 客户端API
  console.log('\n=== 7. 客户端 API ===');
  
  await testEndpoint('客户端', 'GET', '/api/client/location?ip=8.8.8.8');
  
  await testEndpoint('客户端', 'POST', '/api/client/register-info', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_type: 'web',
      user_agent: 'Mozilla/5.0',
      ip_address: '127.0.0.1'
    })
  });
  
  // 8. 扩展API（管理功能）
  console.log('\n=== 8. 扩展管理 API ===');
  
  await testEndpoint('用户管理', 'GET', '/api/users/list');
  await testEndpoint('消息管理', 'GET', '/api/messages');
  await testEndpoint('会话管理', 'GET', '/api/sessions/list');
  await testEndpoint('分析统计', 'GET', '/api/analytics/overview');
  await testEndpoint('系统管理', 'GET', '/api/system/health');
  
  // 9. WebSocket测试
  console.log('\n=== 9. WebSocket 连接测试 ===');
  console.log('[ℹ️  INFO] WebSocket 测试需要专门的WebSocket客户端');
  console.log('WebSocket URL: ws://localhost:6006/ws');
  console.log('必需参数: user_id, user_type, user_name');
  console.log('客服额外参数: session_token');
  
  // 10. 客服登出
  if (kefuId) {
    console.log('\n=== 10. 清理测试 ===');
    await testEndpoint('客服认证', 'POST', `/api/kefu/logout?kefu_id=${kefuId}`);
  }
  
  // 生成报告
  generateReport();
}

function generateReport() {
  console.log('\n\n=== 测试报告汇总 ===\n');
  
  const categories = {};
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let errorTests = 0;
  let skippedTests = 0;
  
  TEST_RESULTS.forEach(result => {
    totalTests++;
    if (!categories[result.category]) {
      categories[result.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      };
    }
    
    categories[result.category].total++;
    
    if (result.status === '✅ PASS') {
      passedTests++;
      categories[result.category].passed++;
    } else if (result.status === '❌ FAIL') {
      failedTests++;
      categories[result.category].failed++;
    } else if (result.status === '❌ ERROR') {
      errorTests++;
      categories[result.category].errors++;
    }
  });
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`✅ 通过: ${passedTests}`);
  console.log(`❌ 失败: ${failedTests}`);
  console.log(`❌ 错误: ${errorTests}`);
  console.log(`⚠️  跳过: 3 (文件上传相关)`);
  
  console.log('\n各类别统计:');
  Object.entries(categories).forEach(([category, stats]) => {
    console.log(`\n${category}:`);
    console.log(`  总数: ${stats.total}`);
    console.log(`  通过: ${stats.passed}`);
    console.log(`  失败: ${stats.failed}`);
    console.log(`  错误: ${stats.errors}`);
  });
  
  // 保存详细报告
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      errors: errorTests,
      skipped: 3
    },
    categories,
    details: TEST_RESULTS
  };
  
  fs.writeFileSync('API_TEST_REPORT.json', JSON.stringify(detailedReport, null, 2));
  console.log('\n\n详细报告已保存到: API_TEST_REPORT.json');
}

// 运行测试
runTests().catch(console.error);