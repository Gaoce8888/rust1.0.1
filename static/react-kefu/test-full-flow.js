import puppeteer from 'puppeteer';

async function testFullFlow() {
  console.log('🔍 测试完整的客服-客户通信流程...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器窗口便于观察
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    // 1. 打开客服端并登录
    console.log('1️⃣ 客服端登录流程...');
    const kefuPage = await browser.newPage();
    
    // 监听所有控制台消息
    kefuPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('WebSocket') || text.includes('连接') || text.includes('登录')) {
        console.log(`[客服端] ${text}`);
      }
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('   等待登录界面加载...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 查找并点击"系统正常"按钮（快速登录）
    const loginSuccess = await kefuPage.evaluate(() => {
      // 查找包含"系统正常"文字的按钮
      const buttons = Array.from(document.querySelectorAll('button'));
      const systemNormalBtn = buttons.find(btn => btn.textContent.includes('系统正常'));
      
      if (systemNormalBtn) {
        systemNormalBtn.click();
        console.log('点击了"系统正常"按钮');
        return true;
      }
      
      // 如果没找到，尝试其他登录方式
      const quickLoginBtn = buttons.find(btn => 
        btn.textContent.includes('快速登录') || 
        btn.textContent.includes('立即体验')
      );
      
      if (quickLoginBtn) {
        quickLoginBtn.click();
        console.log('点击了快速登录按钮');
        return true;
      }
      
      return false;
    });
    
    if (!loginSuccess) {
      console.log('   ⚠️ 未找到登录按钮，尝试手动登录...');
      
      // 尝试填写表单登录
      await kefuPage.evaluate(() => {
        const usernameInput = document.querySelector('input[type="text"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (usernameInput && passwordInput) {
          usernameInput.value = 'kefu001';
          passwordInput.value = '123456';
          
          const loginBtn = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('登录')
          );
          
          if (loginBtn) {
            loginBtn.click();
          }
        }
      });
    }
    
    console.log('   等待登录完成...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查登录状态
    const kefuStatus = await kefuPage.evaluate(() => {
      const status = {
        isLoggedIn: false,
        kefuName: null,
        onlineStatus: null
      };
      
      // 查找在线状态指示器
      const onlineElements = Array.from(document.querySelectorAll('*')).filter(
        el => el.textContent.includes('在线') || el.textContent.includes('名客户在线')
      );
      
      if (onlineElements.length > 0) {
        status.isLoggedIn = true;
        status.onlineStatus = onlineElements[0].textContent;
      }
      
      // 查找客服名称
      const nameElement = document.querySelector('[class*="客服"], [class*="kefu"]');
      if (nameElement) {
        status.kefuName = nameElement.textContent;
      }
      
      return status;
    });
    
    console.log('   客服端状态:', JSON.stringify(kefuStatus, null, 2));
    
    if (!kefuStatus.isLoggedIn) {
      console.log('   ❌ 客服端登录失败！');
      return;
    }
    
    console.log('   ✅ 客服端登录成功！');
    
    // 2. 打开客户端
    console.log('\n2️⃣ 客户端连接流程...');
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
    
    console.log('   等待客户端加载...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查客户端状态
    const kehuConnectionStatus = await kehuPage.evaluate(() => {
      const status = {
        hasUI: false,
        connectionText: null,
        hasInput: false
      };
      
      status.hasUI = !!document.getElementById('root');
      
      // 查找连接状态
      const statusElements = Array.from(document.querySelectorAll('*')).filter(
        el => el.textContent.includes('在线') || 
              el.textContent.includes('连接') ||
              el.textContent.includes('客服')
      );
      
      if (statusElements.length > 0) {
        status.connectionText = statusElements[0].textContent;
      }
      
      // 查找输入框
      status.hasInput = !!(document.querySelector('textarea') || document.querySelector('input[type="text"]'));
      
      return status;
    });
    
    console.log('   客户端状态:', JSON.stringify(kehuConnectionStatus, null, 2));
    
    // 3. 发送测试消息
    console.log('\n3️⃣ 发送测试消息...');
    
    const messageSent = await kehuPage.evaluate(() => {
      // 查找输入框
      const textarea = document.querySelector('textarea');
      const input = document.querySelector('input[type="text"]');
      const messageInput = textarea || input;
      
      if (!messageInput) {
        console.log('未找到输入框');
        return false;
      }
      
      // 输入消息
      messageInput.value = '你好，我需要帮助';
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 查找发送按钮
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(btn => 
        btn.textContent.includes('发送') || 
        btn.querySelector('[class*="send"]') ||
        btn.querySelector('svg')
      );
      
      if (sendBtn) {
        sendBtn.click();
        console.log('点击了发送按钮');
        return true;
      }
      
      // 尝试按回车键发送
      const enterEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      messageInput.dispatchEvent(enterEvent);
      
      return true;
    });
    
    console.log('   消息发送:', messageSent ? '成功' : '失败');
    
    // 等待消息传递
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. 检查客服端是否收到消息
    console.log('\n4️⃣ 检查消息接收...');
    
    const messageReceived = await kefuPage.evaluate(() => {
      const result = {
        hasNewCustomer: false,
        hasMessage: false,
        customerCount: 0
      };
      
      // 查找客户列表
      const customerElements = document.querySelectorAll('[class*="customer"], [class*="客户"]');
      result.customerCount = customerElements.length;
      
      // 查找包含测试消息的元素
      const messageElements = Array.from(document.querySelectorAll('*')).filter(
        el => el.textContent.includes('你好，我需要帮助')
      );
      
      result.hasMessage = messageElements.length > 0;
      result.hasNewCustomer = result.customerCount > 0;
      
      return result;
    });
    
    console.log('   客服端接收状态:', JSON.stringify(messageReceived, null, 2));
    
    // 5. 截图保存
    await kefuPage.screenshot({ path: 'kefu-final.png', fullPage: true });
    await kehuPage.screenshot({ path: 'kehu-final.png', fullPage: true });
    console.log('\n📸 截图已保存: kefu-final.png, kehu-final.png');
    
    // 总结
    console.log('\n📊 测试总结:');
    console.log('   - 客服登录:', kefuStatus.isLoggedIn ? '✅ 成功' : '❌ 失败');
    console.log('   - 客户端连接:', kehuConnectionStatus.hasUI ? '✅ 成功' : '❌ 失败');
    console.log('   - 消息发送:', messageSent ? '✅ 成功' : '❌ 失败');
    console.log('   - 消息接收:', messageReceived.hasMessage ? '✅ 成功' : '❌ 失败');
    
    // 保持浏览器打开以便手动检查
    console.log('\n💡 浏览器窗口将保持打开，您可以手动检查。按 Ctrl+C 结束。');
    await new Promise(() => {}); // 永久等待
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
  }
}

testFullFlow().catch(console.error);