import puppeteer from 'puppeteer';

async function debugConsole() {
  console.log('调试控制台错误...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 监听控制台消息
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  // 监听页面错误
  page.on('pageerror', error => {
    console.error('页面错误:', error.message);
  });
  
  // 监听请求失败
  page.on('requestfailed', request => {
    console.error('请求失败:', request.url(), request.failure().errorText);
  });
  
  try {
    await page.goto('http://localhost:6006/kefu', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 检查页面内容
    const html = await page.content();
    console.log('\n页面HTML长度:', html.length);
    
    // 检查脚本和样式加载
    const resources = await page.evaluate(() => {
      const scripts = Array.from(document.scripts).map(s => ({
        src: s.src,
        loaded: s.src ? true : false
      }));
      
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => ({
        href: l.href,
        loaded: true
      }));
      
      return { scripts, links };
    });
    
    console.log('\n加载的脚本:');
    resources.scripts.forEach(s => console.log(' -', s.src || 'inline'));
    
    console.log('\n加载的样式:');
    resources.links.forEach(l => console.log(' -', l.href));
    
    // 检查React是否正确渲染
    const reactStatus = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        rootChildren: root ? root.children.length : 0,
        rootHTML: root ? root.innerHTML.substring(0, 200) : ''
      };
    });
    
    console.log('\nReact渲染状态:');
    console.log('- 有根元素:', reactStatus.hasRoot);
    console.log('- 子元素数量:', reactStatus.rootChildren);
    console.log('- 内容预览:', reactStatus.rootHTML);
    
  } catch (error) {
    console.error('调试过程出错:', error);
  } finally {
    await browser.close();
  }
}

debugConsole().catch(console.error);