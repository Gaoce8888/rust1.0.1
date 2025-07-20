import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

console.log('🔍 测试退出登录功能...\n');

async function testLogout() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 监听控制台
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('Download the React DevTools')) {
        console.log('浏览器控制台:', text);
      }
    });

    // 步骤1: 先登录
    console.log('1️⃣ 登录系统...');
    const baseUrl = 'http://localhost:6006';
    
    const loginResponse = await fetch(`${baseUrl}/api/kefu/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'kefu001',
        password: '123456'
      })
    });

    const loginData = await loginResponse.json();
    console.log('登录响应:', loginData.success ? '成功' : '失败');

    // 步骤2: 访问页面并设置登录状态
    console.log('\n2️⃣ 访问客服端页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 设置localStorage
    await page.evaluate((userInfo) => {
      localStorage.setItem('kefu_user', JSON.stringify({
        id: userInfo.kefu_id,
        name: userInfo.real_name,
        username: 'kefu001',
        type: 'kefu',
        sessionToken: userInfo.session_token,
        maxCustomers: userInfo.max_customers
      }));
      localStorage.setItem('kefu_session_token', userInfo.session_token);
    }, loginData);

    // 刷新页面以应用登录状态
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 步骤3: 检查页面状态
    console.log('\n3️⃣ 检查页面状态...');
    const pageInfo = await page.evaluate(() => {
      const settingsButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('设置')
      );
      const connectionStatus = document.querySelector('[role="status"]')?.textContent || '';
      const pageText = document.body.innerText;
      
      return {
        hasSettingsButton: !!settingsButton,
        connectionStatus,
        isInChatInterface: pageText.includes('客服系统') && !pageText.includes('登录'),
        hasUserInfo: pageText.includes('在线') || pageText.includes('工号')
      };
    });

    console.log('- 聊天界面:', pageInfo.isInChatInterface ? '是' : '否');
    console.log('- 设置按钮:', pageInfo.hasSettingsButton ? '存在' : '不存在');
    console.log('- 连接状态:', pageInfo.connectionStatus);
    console.log('- 显示用户信息:', pageInfo.hasUserInfo ? '是' : '否');

    // 步骤4: 点击设置按钮
    if (pageInfo.hasSettingsButton) {
      console.log('\n4️⃣ 点击设置按钮...');
      await page.evaluate(() => {
        const settingsButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('设置')
        );
        if (settingsButton) {
          settingsButton.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 检查设置弹窗
      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        const logoutButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('退出登录')
        );
        
        return {
          hasModal: !!modal,
          hasLogoutButton: !!logoutButton,
          modalTitle: modal?.querySelector('h2')?.textContent || ''
        };
      });

      console.log('- 设置弹窗:', modalInfo.hasModal ? '打开' : '未打开');
      console.log('- 弹窗标题:', modalInfo.modalTitle);
      console.log('- 退出登录按钮:', modalInfo.hasLogoutButton ? '存在' : '不存在');

      // 步骤5: 点击退出登录
      if (modalInfo.hasLogoutButton) {
        console.log('\n5️⃣ 点击退出登录...');
        
        // 截图退出前状态
        await page.screenshot({ path: 'before-logout.png' });
        
        await page.evaluate(() => {
          const logoutButton = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('退出登录')
          );
          if (logoutButton) {
            logoutButton.click();
          }
        });

        // 等待页面刷新或跳转
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 检查退出后状态
        const afterLogout = await page.evaluate(() => {
          const localStorage = window.localStorage;
          return {
            hasKefuUser: localStorage.getItem('kefu_user') !== null,
            hasSessionToken: localStorage.getItem('kefu_session_token') !== null,
            pageText: document.body.innerText.substring(0, 200),
            hasLoginForm: document.querySelector('input[name="username"]') !== null ||
                         document.querySelector('input[name="email"]') !== null,
            isInChatInterface: document.body.innerText.includes('客服系统') && 
                              !document.body.innerText.includes('登录')
          };
        });

        console.log('\n退出后检查:');
        console.log('- localStorage中的用户信息:', afterLogout.hasKefuUser ? '存在' : '已清除');
        console.log('- localStorage中的token:', afterLogout.hasSessionToken ? '存在' : '已清除');
        console.log('- 显示登录表单:', afterLogout.hasLoginForm ? '是' : '否');
        console.log('- 仍在聊天界面:', afterLogout.isInChatInterface ? '是' : '否');
        console.log('- 页面文本预览:', afterLogout.pageText);

        // 截图退出后状态
        await page.screenshot({ path: 'after-logout.png' });
      }
    }

    console.log('\n✅ 测试完成');
    console.log('截图已保存: before-logout.png, after-logout.png');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
}

// 运行测试
testLogout();