import puppeteer from 'puppeteer';

async function testClientKefuConnection() {
  console.log('🔍 测试客户端与客服端连接...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // 1. 打开客服端并登录
    console.log('1️⃣ 打开客服端并登录...');
    const kefuPage = await browser.newPage();
    
    // 监听控制台消息
    kefuPage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('连接')) {
        console.log(`[客服端] ${msg.text()}`);
      }
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 等待登录界面
    await kefuPage.waitForTimeout(2000);
    
    // 执行登录
    await kefuPage.evaluate(() => {
      // 查找并点击快速登录按钮
      const quickLoginBtns = Array.from(document.querySelectorAll('button'));
      const quickLoginBtn = quickLoginBtns.find(btn => 
        btn.textContent.includes('快速登录') || 
        btn.textContent.includes('体验')
      );
      if (quickLoginBtn) {
        quickLoginBtn.click();
        console.log('点击了快速登录按钮');
      }
    });
    
    await kefuPage.waitForTimeout(3000);
    
    // 检查登录状态
    const kefuLoginStatus = await kefuPage.evaluate(() => {
      const loginInfo = {
        isLoggedIn: false,
        hasWebSocket: false,
        wsState: null
      };
      
      // 检查是否已登录（查找客服名称或在线状态）
      const onlineStatus = document.querySelector('[class*="在线"]');
      const kefuName = document.querySelector('[class*="客服"]');
      loginInfo.isLoggedIn = !!(onlineStatus || kefuName);
      
      // 检查WebSocket
      if (window.wsClient) {
        loginInfo.hasWebSocket = true;
        loginInfo.wsState = window.wsClient.readyState;
      }
      
      return loginInfo;
    });
    
    console.log('客服端状态:', JSON.stringify(kefuLoginStatus, null, 2));
    
    // 2. 打开客户端
    console.log('\n2️⃣ 打开客户端...');
    const kehuPage = await browser.newPage();
    
    // 监听控制台消息
    kehuPage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('连接')) {
        console.log(`[客户端] ${msg.text()}`);
      }
    });
    
    await kehuPage.goto('http://localhost:6006/kehu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await kehuPage.waitForTimeout(3000);
    
    // 检查客户端WebSocket连接
    const kehuStatus = await kehuPage.evaluate(() => {
      const status = {
        hasWebSocket: false,
        connectionStatus: null,
        hasUI: false
      };
      
      // 检查UI元素
      status.hasUI = !!document.getElementById('root');
      
      // 检查WebSocket管理器
      if (window.wsManager || window.WebSocketManager) {
        status.hasWebSocket = true;
      }
      
      // 检查连接状态显示
      const statusElement = document.querySelector('[class*="连接"]');
      if (statusElement) {
        status.connectionStatus = statusElement.textContent;
      }
      
      return status;
    });
    
    console.log('客户端状态:', JSON.stringify(kehuStatus, null, 2));
    
    // 3. 尝试发送消息
    console.log('\n3️⃣ 测试消息发送...');
    
    // 在客户端输入消息
    const messageSent = await kehuPage.evaluate(() => {
      // 查找输入框
      const input = document.querySelector('textarea, input[type="text"]');
      if (input) {
        input.value = '你好，我需要帮助';
        
        // 触发输入事件
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
        
        // 查找发送按钮
        const sendBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('发送') || 
                 btn.querySelector('[class*="send"]')
        );
        
        if (sendBtn) {
          sendBtn.click();
          return true;
        }
      }
      return false;
    });
    
    console.log('消息发送状态:', messageSent ? '成功' : '失败');
    
    // 等待消息传递
    await kehuPage.waitForTimeout(2000);
    
    // 4. 检查客服端是否收到消息
    const kefuReceivedMessage = await kefuPage.evaluate(() => {
      // 查找消息列表
      const messages = document.querySelectorAll('[class*="message"], [class*="chat"]');
      
      for (const msg of messages) {
        if (msg.textContent.includes('你好，我需要帮助')) {
          return true;
        }
      }
      
      // 检查客户列表是否有新客户
      const customerList = document.querySelectorAll('[class*="customer"], [class*="客户"]');
      return customerList.length > 0;
    });
    
    console.log('客服端收到消息:', kefuReceivedMessage ? '是' : '否');
    
    // 5. 截图
    await kefuPage.screenshot({ path: 'kefu-debug.png', fullPage: true });
    await kehuPage.screenshot({ path: 'kehu-debug.png', fullPage: true });
    console.log('\n截图已保存: kefu-debug.png, kehu-debug.png');
    
  } catch (error) {
    console.error('测试过程出错:', error);
  } finally {
    await browser.close();
  }
}

testClientKefuConnection().catch(console.error);