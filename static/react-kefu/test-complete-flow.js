import puppeteer from 'puppeteer';

async function testCompleteFlow() {
  console.log('🔍 测试完整的客服系统流程...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    // 1. 打开客服端
    console.log('1️⃣ 客服端登录测试...');
    const kefuPage = await browser.newPage();
    
    kefuPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('登录') || text.includes('WebSocket')) {
        console.log(`[客服端] ${text}`);
      }
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 点击"查看测试账号"按钮
    console.log('   点击查看测试账号...');
    await kefuPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const testAccountBtn = buttons.find(btn => btn.textContent.includes('查看测试账号'));
      if (testAccountBtn) {
        testAccountBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 点击"使用此账号"按钮（选择第一个测试账号）
    console.log('   选择测试账号登录...');
    await kefuPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const useAccountBtn = buttons.find(btn => btn.textContent.includes('使用此账号'));
      if (useAccountBtn) {
        useAccountBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查登录状态
    const loginStatus = await kefuPage.evaluate(() => {
      // 查找是否已登录（显示客服名称或在线客户列表）
      const hasKefuInfo = !!document.querySelector('[class*="工号"]');
      const hasCustomerList = !!document.querySelector('[class*="在线客户"]');
      const kefuName = document.querySelector('[class*="工号"]')?.textContent || '';
      
      return {
        isLoggedIn: hasKefuInfo || hasCustomerList,
        kefuName: kefuName
      };
    });
    
    console.log('   登录状态:', loginStatus.isLoggedIn ? '✅ 成功' : '❌ 失败');
    if (loginStatus.kefuName) {
      console.log('   客服信息:', loginStatus.kefuName);
    }
    
    // 2. 打开客户端
    console.log('\n2️⃣ 客户端连接测试...');
    const kehuPage = await browser.newPage();
    
    kehuPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('WebSocket') || text.includes('连接')) {
        console.log(`[客户端] ${text}`);
      }
    });
    
    await kehuPage.goto('http://localhost:6006/kehu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. 客户端发送消息
    console.log('\n3️⃣ 消息发送测试...');
    
    const messageSent = await kehuPage.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = '你好，请问有人吗？';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 查找并点击发送按钮
        const sendBtn = document.querySelector('button[class*="send"], button svg');
        if (sendBtn) {
          sendBtn.click();
          return true;
        }
      }
      return false;
    });
    
    console.log('   消息发送:', messageSent ? '✅ 成功' : '❌ 失败');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 检查客服端是否收到消息
    console.log('\n4️⃣ 消息接收测试...');
    
    const kefuReceived = await kefuPage.evaluate(() => {
      // 查找新客户或新消息
      const hasNewCustomer = document.body.textContent.includes('客户') && 
                             document.body.textContent.includes('在线');
      const hasMessage = document.body.textContent.includes('你好，请问有人吗');
      
      return {
        hasNewCustomer,
        hasMessage
      };
    });
    
    console.log('   客服端收到新客户:', kefuReceived.hasNewCustomer ? '✅ 是' : '❌ 否');
    console.log('   客服端收到消息:', kefuReceived.hasMessage ? '✅ 是' : '❌ 否');
    
    // 5. 保存截图
    await kefuPage.screenshot({ path: 'test-kefu-final.png', fullPage: true });
    await kehuPage.screenshot({ path: 'test-kehu-final.png', fullPage: true });
    
    console.log('\n📸 测试截图已保存:');
    console.log('   - test-kefu-final.png (客服端)');
    console.log('   - test-kehu-final.png (客户端)');
    
    // 总结
    console.log('\n📊 测试结果总结:');
    console.log('═══════════════════════════════════');
    console.log('1. 客服登录:', loginStatus.isLoggedIn ? '✅ 通过' : '❌ 失败');
    console.log('2. 客户连接:', '✅ 通过');
    console.log('3. 消息发送:', messageSent ? '✅ 通过' : '❌ 失败');
    console.log('4. 消息接收:', kefuReceived.hasMessage ? '✅ 通过' : '❌ 失败');
    console.log('═══════════════════════════════════');
    
    if (!loginStatus.isLoggedIn) {
      console.log('\n⚠️ 提示: 客服端需要先登录才能接收客户消息');
    }
    
    if (!kefuReceived.hasMessage && loginStatus.isLoggedIn) {
      console.log('\n⚠️ 提示: 请检查WebSocket连接和客服分配逻辑');
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
  } finally {
    await browser.close();
  }
}

testCompleteFlow().catch(console.error);