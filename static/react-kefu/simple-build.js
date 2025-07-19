import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🏗️  简单构建和部署...\n');

try {
  // 1. 确保 index.html 是正确的开发版本
  const devIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>企业级客服系统 - 客服端</title>
    <script type="module">const injectTime = performance.now(); window.__vite_plugin_react_preamble_installed__ = true;</script>
  </head>
  <body class="dark text-foreground bg-background">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  fs.writeFileSync('./index.html', devIndexHtml);
  console.log('✅ 创建了开发版 index.html');

  // 2. 清理旧文件
  execSync('rm -rf dist', { stdio: 'inherit' });

  // 3. 运行构建
  console.log('\n运行 Vite 构建...');
  execSync('npx vite build --base=/kefu/', { stdio: 'inherit' });

  // 4. 检查构建输出
  if (!fs.existsSync('./dist')) {
    throw new Error('构建失败：dist 目录不存在');
  }

  console.log('\n构建文件:');
  const distFiles = fs.readdirSync('./dist');
  distFiles.forEach(file => console.log(`  - ${file}`));

  // 5. 部署
  const targetDir = '/root/gaoce8888/rust-chat-1.0.1/static/kefu';
  console.log(`\n部署到 ${targetDir}...`);
  
  execSync(`rm -rf ${targetDir}`, { stdio: 'inherit' });
  execSync(`cp -r ./dist ${targetDir}`, { stdio: 'inherit' });
  
  // 6. 恢复开发版 index.html（保持 /kefu/src/index.jsx 路径）
  const finalIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>企业级客服系统 - 客服端</title>
    <script type="module">const injectTime = performance.now(); window.__vite_plugin_react_preamble_installed__ = true;</script>
  </head>
  <body class="dark text-foreground bg-background">
    <div id="root"></div>
    <script type="module" src="/kefu/src/index.jsx"></script>
  </body>
</html>`;
  
  fs.writeFileSync('./index.html', finalIndexHtml);

  console.log('\n✅ 部署完成！');
  console.log('   访问: http://localhost:6006/kefu/');
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}