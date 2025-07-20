import puppeteer from 'puppeteer';

console.log('🔍 清除缓存后测试登录页面...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 先访问页面
    console.log('1️⃣ 访问页面并清除localStorage...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 清除localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 刷新页面
    console.log('2️⃣ 刷新页面...');
    await page.reload({
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查页面内容
    const pageInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // 查找包含特定文本的元素
      const hasLoginText = document.body.innerText.includes('登录') || 
                          document.body.innerText.includes('Sign in') ||
                          document.body.innerText.includes('账号');
      
      const hasKefuSystem = document.body.innerText.includes('客服系统');
      
      return {
        inputCount: inputs.length,
        buttonCount: buttons.length,
        hasLoginText,
        hasKefuSystem,
        pageTitle: document.querySelector('h1')?.textContent || '',
        inputs: inputs.map(input => ({
          type: input.type,
          name: input.name || '',
          placeholder: input.placeholder || '',
          label: input.getAttribute('aria-label') || ''
        })),
        buttons: buttons.slice(0, 10).map(btn => btn.textContent.trim()),
        pageText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('\n页面信息:');
    console.log('- 标题:', pageInfo.pageTitle);
    console.log('- 包含"登录"文本:', pageInfo.hasLoginText);
    console.log('- 包含"客服系统":', pageInfo.hasKefuSystem);
    console.log('- 输入框数量:', pageInfo.inputCount);
    console.log('- 按钮数量:', pageInfo.buttonCount);
    
    console.log('\n输入框详情:');
    pageInfo.inputs.forEach((input, i) => {
      console.log(`  ${i+1}. 类型: ${input.type}, 名称: ${input.name}, 占位符: ${input.placeholder}`);
    });
    
    console.log('\n按钮文本 (前10个):');
    pageInfo.buttons.forEach((btn, i) => {
      console.log(`  ${i+1}. "${btn}"`);
    });
    
    console.log('\n页面文本预览:');
    console.log(pageInfo.pageText);

    // 截图
    await page.screenshot({ path: 'login-clean-test.png', fullPage: true });
    console.log('\n截图已保存: login-clean-test.png');

  } catch (error) {
    console.error('\n错误:', error);
  } finally {
    await browser.close();
  }
})();