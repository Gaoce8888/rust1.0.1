import puppeteer from 'puppeteer';

async function debugPage() {
  console.log('启动调试浏览器...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 监听控制台输出
  page.on('console', msg => {
    console.log(`[浏览器控制台 ${msg.type()}]:`, msg.text());
  });
  
  // 监听页面错误
  page.on('error', err => {
    console.error('[页面错误]:', err);
  });
  
  // 监听页面崩溃
  page.on('pageerror', err => {
    console.error('[页面JavaScript错误]:', err.toString());
  });
  
  // 监听请求失败
  page.on('requestfailed', request => {
    console.error('[请求失败]:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('访问页面: http://localhost:6005/kefu/');
    await page.goto('http://localhost:6005/kefu/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 等待一下让页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取页面内容
    const content = await page.content();
    console.log('\n页面标题:', await page.title());
    
    // 检查是否有特定元素
    const hasRoot = await page.$('#root') !== null;
    console.log('React根元素存在:', hasRoot);
    
    // 执行JavaScript获取更多信息
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasReact: !!window.React,
        errors: window.__errors || [],
        bodyText: document.body.innerText.substring(0, 200)
      };
    });
    
    console.log('\n页面信息:', pageInfo);
    
    // 截图
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('\n已保存截图: debug-screenshot.png');
    
  } catch (error) {
    console.error('\n调试过程出错:', error);
  } finally {
    await browser.close();
  }
}

// 运行调试
debugPage().catch(console.error);