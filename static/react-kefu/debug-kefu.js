import puppeteer from 'puppeteer';

console.log('🔍 开始调试客服端页面...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      console.log(`浏览器控制台 [${msg.type()}]:`, msg.text());
    });

    // 监听页面错误
    page.on('error', err => {
      console.error('页面错误:', err);
    });

    // 监听页面崩溃
    page.on('pageerror', err => {
      console.error('页面JavaScript错误:', err);
    });

    // 监听网络请求
    page.on('request', request => {
      console.log(`📡 请求: ${request.method()} ${request.url()}`);
    });

    // 监听网络响应
    page.on('response', response => {
      console.log(`📥 响应: ${response.status()} ${response.url()}`);
    });

    console.log('正在访问: http://localhost:6006/kefu/');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('\n页面加载完成');

    // 获取页面标题
    const title = await page.title();
    console.log('页面标题:', title);

    // 检查页面内容
    const pageContent = await page.evaluate(() => {
      return {
        // 检查根元素
        rootElement: document.getElementById('root') ? '存在' : '不存在',
        rootContent: document.getElementById('root')?.innerHTML || '空',
        // 检查body类
        bodyClasses: document.body.className,
        // 检查是否有React应用
        reactRoot: document.querySelector('#root')?.children.length || 0,
        // 检查是否有错误信息
        errorElements: document.querySelectorAll('.error, [class*="error"]').length,
        // 获取所有脚本标签
        scripts: Array.from(document.querySelectorAll('script')).map(s => ({
          src: s.src,
          type: s.type,
          content: s.innerHTML.substring(0, 100)
        })),
        // 检查全局变量
        globalVars: {
          React: typeof window.React !== 'undefined',
          ReactDOM: typeof window.ReactDOM !== 'undefined',
          importMeta: typeof window.import !== 'undefined'
        }
      };
    });

    console.log('\n页面内容分析:');
    console.log('- 根元素#root:', pageContent.rootElement);
    console.log('- 根元素内容:', pageContent.rootContent.substring(0, 100) + '...');
    console.log('- Body类名:', pageContent.bodyClasses);
    console.log('- React根元素子元素数:', pageContent.reactRoot);
    console.log('- 错误元素数量:', pageContent.errorElements);
    console.log('- 全局变量:', pageContent.globalVars);
    console.log('\n脚本标签:');
    pageContent.scripts.forEach((script, index) => {
      console.log(`  ${index + 1}. ${script.type} - ${script.src || '内联脚本'}`);
    });

    // 等待一下看是否有异步加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 再次检查内容
    const finalCheck = await page.evaluate(() => {
      return {
        rootHasContent: document.getElementById('root')?.children.length > 0,
        hasLoginForm: document.querySelector('form') !== null,
        hasChatInterface: document.querySelector('[class*="chat"]') !== null,
        visibleText: document.body.innerText.substring(0, 200)
      };
    });

    console.log('\n最终检查:');
    console.log('- 根元素有内容:', finalCheck.rootHasContent);
    console.log('- 有登录表单:', finalCheck.hasLoginForm);
    console.log('- 有聊天界面:', finalCheck.hasChatInterface);
    console.log('- 可见文本:', finalCheck.visibleText);

    // 截图
    await page.screenshot({ path: 'kefu-debug.png', fullPage: true });
    console.log('\n已保存截图: kefu-debug.png');

  } catch (error) {
    console.error('调试过程出错:', error);
  } finally {
    await browser.close();
  }
})();