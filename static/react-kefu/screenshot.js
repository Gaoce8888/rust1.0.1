import puppeteer from 'puppeteer';

async function takeScreenshot() {
  console.log('启动浏览器...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto('http://localhost:6005/kefu/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: 'current-state.png',
      fullPage: true 
    });
    
    console.log('截图已保存为 current-state.png');
    
  } catch (error) {
    console.error('截图过程出错:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch(console.error);