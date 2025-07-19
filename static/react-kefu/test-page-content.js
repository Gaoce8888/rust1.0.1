import puppeteer from 'puppeteer';

console.log('🔍 检查页面实际内容...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('访问页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待一下确保React渲染完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 获取页面的所有input和button元素
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder,
        label: input.getAttribute('aria-label') || input.previousElementSibling?.textContent || ''
      }));
      
      const buttons = Array.from(document.querySelectorAll('button')).map(button => ({
        text: button.textContent.trim(),
        className: button.className
      }));
      
      return {
        inputs,
        buttons,
        hasLoginForm: document.querySelector('form') !== null,
        pageText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('\n页面元素分析:');
    console.log('- 表单存在:', elements.hasLoginForm);
    console.log('\n输入框:', elements.inputs.length);
    elements.inputs.forEach((input, i) => {
      console.log(`  ${i+1}. 类型: ${input.type}, 名称: ${input.name}, 占位符: ${input.placeholder}`);
    });
    
    console.log('\n按钮:', elements.buttons.length);
    elements.buttons.forEach((button, i) => {
      console.log(`  ${i+1}. ${button.text}`);
    });
    
    console.log('\n页面文本:');
    console.log(elements.pageText);

    // 截图
    await page.screenshot({ path: 'page-content-check.png', fullPage: true });
    console.log('\n截图已保存: page-content-check.png');

  } catch (error) {
    console.error('\n错误:', error);
  } finally {
    await browser.close();
  }
})();