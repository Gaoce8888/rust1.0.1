import puppeteer from 'puppeteer';

console.log('🔍 最终测试客服端...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('1️⃣ 访问客服端页面...');
    await page.goto('http://localhost:6006/kefu/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待React应用加载
    await page.waitForSelector('#root', { timeout: 5000 });
    
    // 获取页面信息
    const pageInfo = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasContent: root.children.length > 0,
        pageText: document.body.innerText.substring(0, 500),
        hasButtons: document.querySelectorAll('button').length,
        hasInputs: document.querySelectorAll('input, textarea').length,
      };
    });

    console.log('\n✅ 页面加载成功！');
    console.log('- React根元素有内容:', pageInfo.hasContent);
    console.log('- 按钮数量:', pageInfo.hasButtons);
    console.log('- 输入框数量:', pageInfo.hasInputs);
    console.log('\n页面文本预览:');
    console.log(pageInfo.pageText);

    // 截图
    await page.screenshot({ path: 'kefu-final-test.png', fullPage: true });
    console.log('\n✅ 截图已保存: kefu-final-test.png');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
})();