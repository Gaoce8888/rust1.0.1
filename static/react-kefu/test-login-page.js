import puppeteer from 'puppeteer';

console.log('🔍 测试新的登录页面...\n');

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

    console.log('1️⃣ 访问客服端登录页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待登录页面加载
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    console.log('✅ 登录页面加载成功');

    // 获取页面信息
    const pageInfo = await page.evaluate(() => {
      const usernameInput = document.querySelector('input[name="username"]');
      const passwordInput = document.querySelector('input[name="password"]');
      const loginButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('登录')
      );
      const rememberCheckbox = document.querySelector('input[type="checkbox"]');
      const quickButtons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent.includes('客服')
      );

      return {
        hasUsernameInput: !!usernameInput,
        hasPasswordInput: !!passwordInput,
        hasLoginButton: !!loginButton,
        hasRememberMe: !!rememberCheckbox,
        quickAccountsCount: quickButtons.length,
        pageTitle: document.querySelector('h1')?.textContent || '',
        subtitle: document.querySelector('p')?.textContent || ''
      };
    });

    console.log('\n页面元素检查:');
    console.log('- 标题:', pageInfo.pageTitle);
    console.log('- 副标题:', pageInfo.subtitle);
    console.log('- 用户名输入框:', pageInfo.hasUsernameInput ? '✅' : '❌');
    console.log('- 密码输入框:', pageInfo.hasPasswordInput ? '✅' : '❌');
    console.log('- 登录按钮:', pageInfo.hasLoginButton ? '✅' : '❌');
    console.log('- 记住我选项:', pageInfo.hasRememberMe ? '✅' : '❌');
    console.log('- 快速登录账号数:', pageInfo.quickAccountsCount);

    // 测试快速填充功能
    console.log('\n2️⃣ 测试快速填充功能...');
    await page.evaluate(() => {
      const quickButtons = Array.from(document.querySelectorAll('button'));
      const firstQuickAccount = quickButtons.find(btn => btn.textContent.includes('客服小王'));
      if (firstQuickAccount) {
        firstQuickAccount.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查是否填充了账号密码
    const filledValues = await page.evaluate(() => {
      const usernameInput = document.querySelector('input[name="username"]');
      const passwordInput = document.querySelector('input[name="password"]');
      return {
        username: usernameInput?.value || '',
        password: passwordInput?.value || ''
      };
    });

    console.log('- 填充的用户名:', filledValues.username);
    console.log('- 填充的密码:', filledValues.password ? '******' : '(空)');

    // 测试登录功能
    console.log('\n3️⃣ 测试登录功能...');
    await page.evaluate(() => {
      const loginButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('登录') && !btn.textContent.includes('快速')
      );
      if (loginButton) {
        loginButton.click();
      }
    });

    // 等待登录响应
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查是否登录成功（页面是否跳转）
    const afterLogin = await page.evaluate(() => {
      const hasLoginForm = document.querySelector('input[name="username"]') !== null;
      const hasChatInterface = document.querySelector('[class*="chat"]') !== null;
      const errorChip = document.querySelector('[class*="danger"]');
      
      return {
        stillOnLoginPage: hasLoginForm,
        enteredChatInterface: hasChatInterface,
        errorMessage: errorChip?.textContent || ''
      };
    });

    console.log('- 仍在登录页面:', afterLogin.stillOnLoginPage ? '是' : '否');
    console.log('- 进入聊天界面:', afterLogin.enteredChatInterface ? '是' : '否');
    if (afterLogin.errorMessage) {
      console.log('- 错误信息:', afterLogin.errorMessage);
    }

    // 截图
    await page.screenshot({ path: 'login-page-test.png', fullPage: true });
    console.log('\n✅ 测试完成，截图已保存: login-page-test.png');

    // 获取页面文本预览
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n页面文本预览:');
    console.log(pageText.substring(0, 300) + '...');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
})();