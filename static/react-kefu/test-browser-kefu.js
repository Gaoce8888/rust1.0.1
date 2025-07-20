import puppeteer from 'puppeteer';

console.log('🔍 测试客服端浏览器功能...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('Download the React DevTools')) {
        console.log(`浏览器控制台:`, text);
      }
    });

    // 监听页面错误
    page.on('pageerror', err => {
      console.error('页面错误:', err);
    });

    console.log('1️⃣ 访问客服端页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待React应用加载
    await page.waitForSelector('#root > div', { timeout: 5000 });
    console.log('✅ 页面加载成功');

    // 检查登录界面
    const hasLogin = await page.evaluate(() => {
      return document.querySelector('button') !== null;
    });
    console.log('- 登录界面:', hasLogin ? '存在' : '不存在');

    // 执行快速登录
    console.log('\n2️⃣ 执行快速登录...');
    
    // 点击快速登录按钮
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const quickLoginBtn = buttons.find(btn => btn.textContent.includes('快速登录'));
      if (quickLoginBtn) {
        quickLoginBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 选择第一个账号
    await page.evaluate(() => {
      const accountBtns = Array.from(document.querySelectorAll('button'));
      const firstAccount = accountBtns.find(btn => btn.textContent.includes('客服小王'));
      if (firstAccount) {
        firstAccount.click();
      }
    });

    // 等待WebSocket连接
    console.log('- 等待WebSocket连接...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查连接状态
    const connectionStatus = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('[role="status"]'));
      const statusChip = chips.find(chip => {
        const text = chip.textContent;
        return text.includes('已连接') || text.includes('未连接');
      });
      return statusChip ? statusChip.textContent : '未知';
    });
    console.log('- 连接状态:', connectionStatus);

    // 检查在线客户数
    const onlineCustomers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const customerElement = elements.find(el => el.textContent.includes('在线客户'));
      if (customerElement) {
        const parent = customerElement.parentElement;
        const countElement = parent.querySelector('.text-2xl, .text-3xl, .text-4xl');
        return countElement ? countElement.textContent : '0';
      }
      return '未找到';
    });
    console.log('- 在线客户数:', onlineCustomers);

    // 检查界面元素
    console.log('\n3️⃣ 检查界面元素...');
    const elements = await page.evaluate(() => {
      return {
        hasCustomerList: document.querySelector('[class*="border-r"]') !== null,
        hasChatArea: document.querySelector('[class*="flex-1"][class*="flex-col"]') !== null,
        hasInputArea: document.querySelector('textarea, input[type="text"]') !== null,
        hasSendButton: Array.from(document.querySelectorAll('button')).some(btn => 
          btn.innerHTML.includes('arrow-up') || btn.textContent.includes('发送')
        )
      };
    });
    
    console.log('- 客户列表区域:', elements.hasCustomerList ? '✅' : '❌');
    console.log('- 聊天区域:', elements.hasChatArea ? '✅' : '❌');
    console.log('- 输入区域:', elements.hasInputArea ? '✅' : '❌');
    console.log('- 发送按钮:', elements.hasSendButton ? '✅' : '❌');

    // 截图
    await page.screenshot({ path: 'kefu-browser-test.png', fullPage: true });
    console.log('\n✅ 测试完成，截图已保存: kefu-browser-test.png');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
})();