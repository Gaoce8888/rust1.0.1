import puppeteer from 'puppeteer';

async function debugErrors() {
  console.log('🔍 检查页面加载错误...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 收集所有错误
    const errors = [];
    const logs = [];
    const failedRequests = [];
    
    // 监听控制台
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // 监听请求失败
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        error: request.failure().errorText
      });
    });
    
    // 监听响应
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          error: `HTTP ${response.status()}`
        });
      }
    });
    
    console.log('正在加载客服端页面...');
    
    try {
      await page.goto('http://localhost:6006/kefu', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (error) {
      console.error('页面加载失败:', error.message);
    }
    
    // 等待一会儿收集更多错误
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查页面内容
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasRoot: !!document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML || '',
        bodyClasses: document.body.className,
        scripts: Array.from(document.scripts).map(s => ({
          src: s.src,
          type: s.type,
          async: s.async,
          defer: s.defer
        })),
        links: Array.from(document.querySelectorAll('link')).map(l => ({
          href: l.href,
          rel: l.rel
        }))
      };
    });
    
    // 打印结果
    console.log('\n📊 页面信息:');
    console.log('═══════════════════════════════════════');
    console.log('标题:', pageInfo.title);
    console.log('有根元素:', pageInfo.hasRoot);
    console.log('Body类名:', pageInfo.bodyClasses);
    console.log('根元素内容长度:', pageInfo.rootContent.length);
    
    console.log('\n📦 加载的资源:');
    console.log('脚本文件:');
    pageInfo.scripts.forEach(s => {
      console.log(`  - ${s.src || 'inline'} (type: ${s.type || 'default'})`);
    });
    
    console.log('\n样式文件:');
    pageInfo.links.filter(l => l.rel === 'stylesheet').forEach(l => {
      console.log(`  - ${l.href}`);
    });
    
    if (errors.length > 0) {
      console.log('\n❌ JavaScript错误:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (failedRequests.length > 0) {
      console.log('\n❌ 请求失败:');
      failedRequests.forEach(req => {
        console.log(`  - ${req.url}`);
        console.log(`    错误: ${req.error}`);
      });
    }
    
    // 检查特定问题
    console.log('\n🔍 诊断结果:');
    
    if (!pageInfo.hasRoot) {
      console.log('❌ 缺少根元素 #root');
    }
    
    if (pageInfo.rootContent.length === 0) {
      console.log('❌ React应用未渲染（根元素为空）');
    }
    
    if (!pageInfo.scripts.some(s => s.src && s.src.includes('assets'))) {
      console.log('❌ JavaScript文件未正确加载');
    }
    
    if (!pageInfo.links.some(l => l.href && l.href.includes('.css'))) {
      console.log('❌ CSS文件未加载');
    }
    
    // 尝试获取更多调试信息
    const runtimeInfo = await page.evaluate(() => {
      return {
        hasReact: typeof React !== 'undefined',
        hasReactDOM: typeof ReactDOM !== 'undefined',
        hasViteHMR: !!window.__vite_plugin_react_preamble_installed__,
        windowKeys: Object.keys(window).filter(k => 
          k.startsWith('__') || k.includes('React') || k.includes('vite')
        )
      };
    });
    
    console.log('\n🔧 运行时信息:');
    console.log('React已加载:', runtimeInfo.hasReact);
    console.log('ReactDOM已加载:', runtimeInfo.hasReactDOM);
    console.log('Vite HMR:', runtimeInfo.hasViteHMR);
    console.log('相关全局变量:', runtimeInfo.windowKeys.join(', '));
    
  } catch (error) {
    console.error('调试过程出错:', error);
  } finally {
    await browser.close();
  }
}

debugErrors().catch(console.error);