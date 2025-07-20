import puppeteer from 'puppeteer';

async function debugStyles() {
  console.log('启动样式调试...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:6005/kefu/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取计算后的样式
    const styles = await page.evaluate(() => {
      const elements = {
        body: document.body,
        root: document.getElementById('root'),
        firstButton: document.querySelector('button'),
        firstDiv: document.querySelector('div'),
      };
      
      const results = {};
      
      for (const [name, elem] of Object.entries(elements)) {
        if (elem) {
          const computed = window.getComputedStyle(elem);
          results[name] = {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            padding: computed.padding,
            margin: computed.margin,
            border: computed.border,
            display: computed.display,
            position: computed.position,
            className: elem.className
          };
        }
      }
      
      // 检查是否有Tailwind类
      const hasTailwind = document.documentElement.outerHTML.includes('bg-') || 
                         document.documentElement.outerHTML.includes('text-') ||
                         document.documentElement.outerHTML.includes('flex');
      
      // 获取所有外部样式表
      const styleSheets = Array.from(document.styleSheets).map(sheet => {
        try {
          return {
            href: sheet.href,
            rules: sheet.cssRules ? sheet.cssRules.length : 0
          };
        } catch (e) {
          return { href: sheet.href, error: 'Cannot access' };
        }
      });
      
      return {
        elements: results,
        hasTailwind,
        styleSheets,
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className
      };
    });
    
    console.log('\n样式调试结果:');
    console.log('================');
    console.log('包含Tailwind类:', styles.hasTailwind);
    console.log('Body类名:', styles.bodyClasses);
    console.log('HTML类名:', styles.htmlClasses);
    console.log('\n样式表:');
    styles.styleSheets.forEach(sheet => {
      console.log(`- ${sheet.href || 'inline'}: ${sheet.rules || sheet.error} rules`);
    });
    console.log('\n元素样式:');
    Object.entries(styles.elements).forEach(([name, style]) => {
      console.log(`\n${name}:`);
      console.log(`  背景色: ${style.backgroundColor}`);
      console.log(`  文字色: ${style.color}`);
      console.log(`  字体: ${style.fontFamily}`);
      console.log(`  类名: ${style.className}`);
    });
    
    // 获取页面HTML快照
    const html = await page.content();
    const hasStyleTag = html.includes('<style');
    const hasLinkTag = html.includes('<link');
    
    console.log('\n页面检查:');
    console.log('包含<style>标签:', hasStyleTag);
    console.log('包含<link>标签:', hasLinkTag);
    
  } catch (error) {
    console.error('\n调试过程出错:', error);
  } finally {
    await browser.close();
  }
}

debugStyles().catch(console.error);