import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 编译CSS样式...\n');

// 从index.html中提取Tailwind CSS内容
const indexPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(indexPath, 'utf-8');

// 提取<style>标签内容
const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.error('❌ 未找到样式内容');
  process.exit(1);
}

const cssContent = styleMatch[1];

// 创建临时CSS文件
const tempCssPath = path.join(__dirname, 'temp-styles.css');
fs.writeFileSync(tempCssPath, cssContent);

// 使用Tailwind CLI编译CSS
console.log('1️⃣ 使用Tailwind CSS编译样式...');
try {
  execSync(`npx tailwindcss -i ${tempCssPath} -o compiled-styles.css --minify`, { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  // 读取编译后的CSS
  const compiledCss = fs.readFileSync(path.join(__dirname, 'compiled-styles.css'), 'utf-8');
  
  // 替换HTML中的样式
  const newHtml = htmlContent.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>\n${compiledCss}\n</style>`
  );
  
  // 写回index.html
  fs.writeFileSync(indexPath, newHtml);
  
  console.log('✅ CSS编译完成并已更新到index.html');
  
  // 清理临时文件
  fs.unlinkSync(tempCssPath);
  fs.unlinkSync(path.join(__dirname, 'compiled-styles.css'));
  
} catch (error) {
  console.error('❌ CSS编译失败:', error.message);
  // 清理临时文件
  if (fs.existsSync(tempCssPath)) fs.unlinkSync(tempCssPath);
  if (fs.existsSync(path.join(__dirname, 'compiled-styles.css'))) {
    fs.unlinkSync(path.join(__dirname, 'compiled-styles.css'));
  }
  process.exit(1);
}