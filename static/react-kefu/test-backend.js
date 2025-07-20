import puppeteer from 'puppeteer';

async function testBackendRoute() {
  console.log('测试通过Rust后端访问客服端...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    // 通过Rust后端访问
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: 'backend-route.png',
      fullPage: true 
    });
    
    console.log('截图已保存为 backend-route.png');
    
    // 检查样式是否正确加载
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      return body && body.classList.contains('dark');
    });
    
    console.log('深色主题是否生效:', hasStyles);
    
  } catch (error) {
    console.error('测试过程出错:', error);
  } finally {
    await browser.close();
  }
}

testBackendRoute().catch(console.error);