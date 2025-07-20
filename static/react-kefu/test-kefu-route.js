import puppeteer from 'puppeteer';

async function testKefuRoute() {
  console.log('测试 /kefu 路由...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 测试不带斜杠的路由
    console.log('\n1. 测试 http://localhost:6006/kefu');
    let response = await page.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    
    console.log('   状态码:', response.status());
    console.log('   URL:', page.url());
    
    if (response.status() === 200) {
      await page.screenshot({ path: 'kefu-without-slash.png' });
      console.log('   截图已保存');
      
      // 检查是否加载了正确的内容
      const title = await page.title();
      console.log('   页面标题:', title);
      
      const hasApp = await page.evaluate(() => {
        return !!document.getElementById('root');
      });
      console.log('   包含React根元素:', hasApp);
    }
    
    // 测试带斜杠的路由
    console.log('\n2. 测试 http://localhost:6006/kefu/');
    response = await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle2', 
      timeout: 10000
    });
    
    console.log('   状态码:', response.status());
    console.log('   URL:', page.url());
    
    if (response.status() === 200) {
      await page.screenshot({ path: 'kefu-with-slash.png' });
      console.log('   截图已保存');
    }
    
    // 测试静态资源
    console.log('\n3. 测试静态资源加载');
    response = await page.goto('http://localhost:6006/kefu/assets/index-6005a99c.css', {
      timeout: 10000
    });
    console.log('   CSS文件状态:', response.status());
    
  } catch (error) {
    console.error('测试过程出错:', error.message);
  } finally {
    await browser.close();
  }
}

testKefuRoute().catch(console.error);