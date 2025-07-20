import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

async function buildAndDeploy() {
  console.log('🏗️  构建生产版本...\n');

  try {
    // 1. 清理旧的构建
    console.log('1️⃣ 清理目录...');
    await fs.remove('./dist');
    await fs.ensureDir('./dist');

    // 2. 创建临时的生产版 index.html
    const prodIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>企业级客服系统 - 客服端</title>
  </head>
  <body class="dark text-foreground bg-background">
    <div id="root"></div>
    <script type="module" crossorigin src="/kefu/assets/index.js"></script>
    <link rel="stylesheet" href="/kefu/assets/index.css">
  </body>
</html>`;

    // 保存原始 index.html
    const originalHtml = await fs.readFile('./index.html', 'utf-8');
    await fs.writeFile('./index.html', prodIndexHtml);

    // 3. 构建
    console.log('\n2️⃣ 运行 Vite 构建...');
    execSync('npm run build', { stdio: 'inherit' });

    // 恢复原始 index.html
    await fs.writeFile('./index.html', originalHtml);

    // 4. 检查构建输出
    const distFiles = await fs.readdir('./dist');
    console.log('\n3️⃣ 构建输出文件:');
    distFiles.forEach(file => console.log(`   - ${file}`));

    // 5. 如果有 assets 目录，确保文件名正确
    if (await fs.pathExists('./dist/assets')) {
      const assets = await fs.readdir('./dist/assets');
      console.log('\n   Assets 文件:');
      assets.forEach(file => console.log(`     - ${file}`));

      // 找到实际的 js 和 css 文件
      const jsFile = assets.find(f => f.endsWith('.js'));
      const cssFile = assets.find(f => f.endsWith('.css'));

      if (jsFile || cssFile) {
        // 更新 index.html 中的引用
        let indexContent = await fs.readFile('./dist/index.html', 'utf-8');
        if (jsFile) {
          indexContent = indexContent.replace('/kefu/assets/index.js', `/kefu/assets/${jsFile}`);
        }
        if (cssFile) {
          indexContent = indexContent.replace('/kefu/assets/index.css', `/kefu/assets/${cssFile}`);
        }
        await fs.writeFile('./dist/index.html', indexContent);
      }
    }

    // 6. 部署到服务器目录
    const targetDir = '/root/gaoce8888/rust-chat-1.0.1/static/kefu';
    console.log(`\n4️⃣ 部署到 ${targetDir}...`);
    
    await fs.remove(targetDir);
    await fs.copy('./dist', targetDir);

    console.log('\n✅ 构建和部署完成！');
    console.log(`   访问: http://localhost:6006/kefu/`);

  } catch (error) {
    console.error('\n❌ 构建失败:', error.message);
    process.exit(1);
  }
}

buildAndDeploy();