import puppeteer from 'puppeteer';

async function debugWebSocketConnection() {
  console.log('🔍 开始调试WebSocket连接...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器以便观察
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true // 打开开发者工具
  });
  
  try {
    // 1. 打开客服端
    console.log('1️⃣ 打开客服端...');
    const kefuPage = await browser.newPage();
    
    // 监听控制台消息
    kefuPage.on('console', msg => {
      console.log(`[客服端] ${msg.type()}: ${msg.text()}`);
    });
    
    // 监听WebSocket
    kefuPage.on('framenavigated', frame => {
      if (frame === kefuPage.mainFrame()) {
        console.log('[客服端] 页面导航完成');
      }
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 等待页面加载
    await kefuPage.waitForTimeout(3000);
    
    // 检查客服端WebSocket状态
    const kefuWsStatus = await kefuPage.evaluate(() => {
      const wsInfo = {
        hasWebSocket: typeof WebSocket !== 'undefined',
        connections: []
      };
      
      // 尝试获取所有WebSocket连接（如果有全局变量）
      if (window.wsClient) {
        wsInfo.connections.push({
          readyState: window.wsClient.readyState,
          url: window.wsClient.url
        });
      }
      
      return wsInfo;
    });
    
    console.log('\n客服端WebSocket状态:', JSON.stringify(kefuWsStatus, null, 2));
    
    // 2. 打开客户端
    console.log('\n2️⃣ 打开客户端...');
    const kehuPage = await browser.newPage();
    
    // 监听控制台消息
    kehuPage.on('console', msg => {
      console.log(`[客户端] ${msg.type()}: ${msg.text()}`);
    });
    
    await kehuPage.goto('http://localhost:6006/kehu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 等待页面加载
    await kehuPage.waitForTimeout(3000);
    
    // 检查客户端WebSocket状态
    const kehuWsStatus = await kehuPage.evaluate(() => {
      const wsInfo = {
        hasWebSocket: typeof WebSocket !== 'undefined',
        connections: []
      };
      
      // 尝试获取WebSocket管理器状态
      if (window.wsManager) {
        wsInfo.connections.push({
          state: window.wsManager.state,
          url: window.wsManager.url
        });
      }
      
      return wsInfo;
    });
    
    console.log('\n客户端WebSocket状态:', JSON.stringify(kehuWsStatus, null, 2));
    
    // 3. 监控网络请求
    console.log('\n3️⃣ 监控WebSocket连接...');
    
    // 设置请求拦截
    await kefuPage.setRequestInterception(true);
    await kehuPage.setRequestInterception(true);
    
    kefuPage.on('request', request => {
      if (request.url().includes('ws://') || request.url().includes('wss://')) {
        console.log(`[客服端] WebSocket请求: ${request.url()}`);
      }
    });
    
    kehuPage.on('request', request => {
      if (request.url().includes('ws://') || request.url().includes('wss://')) {
        console.log(`[客户端] WebSocket请求: ${request.url()}`);
      }
    });
    
    // 等待用户交互
    console.log('\n✅ 调试环境已设置，请在浏览器中进行操作...');
    console.log('按 Ctrl+C 结束调试\n');
    
    // 保持运行
    await new Promise(() => {});
    
  } catch (error) {
    console.error('调试过程出错:', error);
  }
}

debugWebSocketConnection().catch(console.error);