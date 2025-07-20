import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取CSS文件内容
const cssPath = path.join(__dirname, 'src/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 读取构建后的index.html
const indexPath = path.join(__dirname, 'dist/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf-8');

// 在<head>标签中插入CSS
const styleTag = `<style>
/* Tailwind CSS and custom styles */
${cssContent}
</style>`;

// 插入CSS到</head>之前
htmlContent = htmlContent.replace('</head>', `${styleTag}\n  </head>`);

// 写回文件
fs.writeFileSync(indexPath, htmlContent);

console.log('✅ CSS已内联到index.html');

// 复制到静态目录
const files = fs.readdirSync(path.join(__dirname, 'dist'));
files.forEach(file => {
  const src = path.join(__dirname, 'dist', file);
  const dest = path.join(__dirname, file);
  
  if (fs.statSync(src).isDirectory()) {
    // 复制目录
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    const subFiles = fs.readdirSync(src);
    subFiles.forEach(subFile => {
      fs.copyFileSync(
        path.join(src, subFile),
        path.join(dest, subFile)
      );
    });
  } else {
    // 复制文件
    fs.copyFileSync(src, dest);
  }
});

console.log('✅ 文件已复制到静态目录');