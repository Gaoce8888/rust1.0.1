import puppeteer from 'puppeteer';

async function interactiveDebug() {
  console.log('🚀 启动交互式调试环境...\n');
  console.log('这将打开两个浏览器窗口：');
  console.log('1. 客服端 - http://localhost:6006/kefu');
  console.log('2. 客户端 - http://localhost:6006/kehu\n');
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器窗口
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
      '--window-position=0,0'
    ],
    defaultViewport: null,
    devtools: true // 打开开发者工具
  });
  
  try {
    // 1. 打开客服端
    console.log('📌 打开客服端窗口...');
    const kefuPage = await browser.newPage();
    
    // 监听所有控制台消息
    kefuPage.on('console', msg => {
      console.log(`[客服端] ${msg.type()}: ${msg.text()}`);
    });
    
    kefuPage.on('error', err => {
      console.error('[客服端] 页面错误:', err.message);
    });
    
    kefuPage.on('pageerror', err => {
      console.error('[客服端] 页面错误:', err.message);
    });
    
    await kefuPage.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ 客服端页面已加载');
    console.log('   请手动登录客服账号：');
    console.log('   - 点击"查看测试账号"');
    console.log('   - 选择 kefu001 (密码: 123456)');
    console.log('   - 点击"使用此账号"\n');
    
    // 2. 等待一会儿让用户登录
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. 打开客户端
    console.log('📌 打开客户端窗口...');
    const kehuPage = await browser.newPage();
    
    // 监听客户端控制台
    kehuPage.on('console', msg => {
      console.log(`[客户端] ${msg.type()}: ${msg.text()}`);
    });
    
    kehuPage.on('error', err => {
      console.error('[客户端] 页面错误:', err.message);
    });
    
    await kehuPage.goto('http://localhost:6006/kehu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ 客户端页面已加载\n');
    
    // 4. 监控WebSocket连接
    console.log('🔍 监控WebSocket连接状态...\n');
    
    // 定期检查连接状态
    const checkInterval = setInterval(async () => {
      try {
        // 检查客服端状态
        const kefuStatus = await kefuPage.evaluate(() => {
          const status = {
            isLoggedIn: false,
            connectionStatus: 'unknown',
            customerCount: 0
          };
          
          // 检查是否已登录
          const loginElements = document.querySelectorAll('[class*="工号"], [class*="在线客户"]');
          status.isLoggedIn = loginElements.length > 0;
          
          // 检查连接状态
          const statusElements = document.querySelectorAll('[class*="已连接"], [class*="未连接"]');
          if (statusElements.length > 0) {
            status.connectionStatus = statusElements[0].textContent;
          }
          
          // 检查客户数量
          const customerElements = document.querySelectorAll('[class*="客户"][class*="在线"]');
          status.customerCount = customerElements.length;
          
          return status;
        });
        
        // 检查客户端状态
        const kehuStatus = await kehuPage.evaluate(() => {
          const status = {
            connectionStatus: 'unknown',
            canSendMessage: false
          };
          
          // 检查连接状态
          const statusText = document.body.textContent;
          if (statusText.includes('已连接')) {
            status.connectionStatus = '已连接';
          } else if (statusText.includes('客服不在线')) {
            status.connectionStatus = '客服不在线';
          }
          
          // 检查是否可以发送消息
          const textarea = document.querySelector('textarea');
          status.canSendMessage = !!textarea && !textarea.disabled;
          
          return status;
        });
        
        // 显示状态
        console.clear();
        console.log('🚀 客服系统调试监控');
        console.log('═══════════════════════════════════════');
        console.log('📊 客服端状态:');
        console.log(`   登录状态: ${kefuStatus.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}`);
        console.log(`   连接状态: ${kefuStatus.connectionStatus}`);
        console.log(`   在线客户: ${kefuStatus.customerCount} 个`);
        console.log('\n📊 客户端状态:');
        console.log(`   连接状态: ${kehuStatus.connectionStatus}`);
        console.log(`   可发消息: ${kehuStatus.canSendMessage ? '✅ 是' : '❌ 否'}`);
        console.log('═══════════════════════════════════════');
        console.log('\n💡 操作提示:');
        console.log('1. 在客服端窗口登录账号');
        console.log('2. 在客户端窗口发送消息测试');
        console.log('3. 观察两端的消息传递');
        console.log('4. 按 Ctrl+C 结束调试\n');
        
      } catch (error) {
        // 忽略错误，继续监控
      }
    }, 2000);
    
    // 5. 提供一些辅助功能
    console.log('📝 调试命令:');
    console.log('- 在客户端控制台执行: window.wsManager 查看WebSocket管理器');
    console.log('- 在客服端控制台执行: window.wsClient 查看WebSocket客户端');
    console.log('- 查看网络面板的WS连接状态\n');
    
    // 保持运行
    console.log('🎯 调试环境已就绪，请在浏览器窗口中进行操作...\n');
    
    // 等待用户操作
    await new Promise(() => {
      process.on('SIGINT', () => {
        clearInterval(checkInterval);
        console.log('\n👋 正在关闭调试环境...');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ 调试过程出错:', error);
  }
}

console.log('提示: 此脚本将打开浏览器窗口进行交互式调试');
console.log('按 Ctrl+C 可以随时结束调试\n');

interactiveDebug().catch(console.error);