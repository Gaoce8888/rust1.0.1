import puppeteer from 'puppeteer';

async function testPort6006() {
  console.log('🔍 测试客服系统（端口6006）...\n');
  console.log('访问地址:');
  console.log('- 客服端: http://localhost:6006/kefu');
  console.log('- 客户端: http://localhost:6006/kehu\n');
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器窗口
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1400,900'
    ],
    defaultViewport: null
  });
  
  try {
    // 1. 测试客服端
    console.log('1️⃣ 打开客服端 (http://localhost:6006/kefu)...');
    const kefuPage = await browser.newPage();
    
    kefuPage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('连接')) {
        console.log(`[客服端] ${msg.text()}`);
      }
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 检查页面加载
    const kefuPageStatus = await kefuPage.evaluate(() => {
      return {
        title: document.title,
        hasRoot: !!document.getElementById('root'),
        hasLoginButton: !!document.querySelector('button'),
        url: window.location.href
      };
    });
    
    console.log('客服端页面状态:');
    console.log(`  - URL: ${kefuPageStatus.url}`);
    console.log(`  - 标题: ${kefuPageStatus.title}`);
    console.log(`  - React根元素: ${kefuPageStatus.hasRoot ? '✅' : '❌'}`);
    console.log(`  - 有按钮元素: ${kefuPageStatus.hasLoginButton ? '✅' : '❌'}`);
    
    // 2. 测试客户端
    console.log('\n2️⃣ 打开客户端 (http://localhost:6006/kehu)...');
    const kehuPage = await browser.newPage();
    
    kehuPage.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('连接')) {
        console.log(`[客户端] ${msg.text()}`);
      }
    });
    
    await kehuPage.goto('http://localhost:6006/kehu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 检查页面加载
    const kehuPageStatus = await kehuPage.evaluate(() => {
      return {
        title: document.title,
        hasRoot: !!document.getElementById('root'),
        hasInput: !!document.querySelector('textarea, input[type="text"]'),
        url: window.location.href
      };
    });
    
    console.log('客户端页面状态:');
    console.log(`  - URL: ${kehuPageStatus.url}`);
    console.log(`  - 标题: ${kehuPageStatus.title}`);
    console.log(`  - React根元素: ${kehuPageStatus.hasRoot ? '✅' : '❌'}`);
    console.log(`  - 有输入框: ${kehuPageStatus.hasInput ? '✅' : '❌'}`);
    
    // 3. 截图保存
    await kefuPage.screenshot({ path: 'kefu-6006.png', fullPage: true });
    await kehuPage.screenshot({ path: 'kehu-6006.png', fullPage: true });
    
    console.log('\n📸 截图已保存:');
    console.log('  - kefu-6006.png (客服端)');
    console.log('  - kehu-6006.png (客户端)');
    
    // 4. 测试总结
    console.log('\n📊 测试结果:');
    console.log('═══════════════════════════════════════');
    console.log(`客服端 (6006端口): ${kefuPageStatus.hasRoot ? '✅ 正常' : '❌ 异常'}`);
    console.log(`客户端 (6006端口): ${kehuPageStatus.hasRoot ? '✅ 正常' : '❌ 异常'}`);
    console.log('═══════════════════════════════════════');
    
    console.log('\n💡 手动测试步骤:');
    console.log('1. 在客服端窗口:');
    console.log('   - 点击"查看测试账号"');
    console.log('   - 选择账号并登录');
    console.log('2. 在客户端窗口:');
    console.log('   - 发送测试消息');
    console.log('3. 验证消息是否正常传递\n');
    
    console.log('按 Ctrl+C 关闭浏览器');
    
    // 保持浏览器打开
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ 测试出错:', error.message);
    await browser.close();
  }
}

testPort6006().catch(console.error);