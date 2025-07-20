import puppeteer from 'puppeteer';

console.log('🔍 详细检查页面错误...\n');

async function testDetailedError() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });

  try {
    const page = await browser.newPage();
    
    // 拦截所有网络请求
    await page.setRequestInterception(true);
    page.on('request', request => {
      console.log('📡 请求:', request.method(), request.url());
      request.continue();
    });
    
    // 拦截响应
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.jsx') || url.includes('.js')) {
        console.log('📥 响应:', response.status(), url);
        response.text().then(text => {
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.log('❌ JS文件返回了HTML内容:', url);
            console.log('内容预览:', text.substring(0, 200));
          }
        }).catch(() => {});
      }
    });
    
    // 捕获控制台
    page.on('console', msg => {
      console.log(`浏览器 ${msg.type()}:`, msg.text());
    });

    // 访问页面
    console.log('\n访问页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 等待并检查
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 获取网络错误详情
    const networkErrors = await page.evaluate(() => {
      const errors = [];
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        errors.push({
          src: script.src,
          type: script.type,
          async: script.async
        });
      });
      return errors;
    });

    console.log('\n脚本加载情况:', networkErrors);

    // 截图
    await page.screenshot({ path: 'detailed-error.png' });
    console.log('\n截图已保存');
    
    // 保持浏览器打开几秒
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('测试错误:', error);
  } finally {
    await browser.close();
  }
}

testDetailedError();