import puppeteer from 'puppeteer';

console.log('🔍 测试最终页面...\n');

async function testFinalPage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 监听控制台
    page.on('console', msg => {
      if (!msg.text().includes('Download the React DevTools')) {
        console.log('浏览器控制台:', msg.text());
      }
    });

    // 访问页面
    console.log('访问 http://localhost:6006/kefu/');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查页面内容
    const pageInfo = await page.evaluate(() => {
      const body = document.body;
      const root = document.getElementById('root');
      
      // 检查是否有登录表单
      const hasLoginForm = !!document.querySelector('input[type="password"]') || 
                          !!document.querySelector('input[name="password"]');
      
      // 检查是否在聊天界面
      const isInChat = body.innerText.includes('客服系统') && 
                      !body.innerText.includes('登录');
      
      return {
        title: document.title,
        bodyText: body.innerText.substring(0, 500),
        rootHasContent: root && root.innerHTML.length > 0,
        hasLoginForm: hasLoginForm,
        isInChat: isInChat,
        hasContent: body.innerText.trim().length > 0
      };
    });

    console.log('\n页面状态:');
    console.log('- 标题:', pageInfo.title);
    console.log('- Root元素有内容:', pageInfo.rootHasContent ? '是' : '否');
    console.log('- 页面有内容:', pageInfo.hasContent ? '是' : '否');
    console.log('- 显示登录表单:', pageInfo.hasLoginForm ? '是' : '否');
    console.log('- 在聊天界面:', pageInfo.isInChat ? '是' : '否');
    console.log('\n页面文本预览:');
    console.log(pageInfo.bodyText);

    // 截图
    await page.screenshot({ path: 'final-page-test.png' });
    console.log('\n截图已保存: final-page-test.png');

  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await browser.close();
  }
}

testFinalPage();