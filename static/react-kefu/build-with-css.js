import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 构建客服端生产版本...\n');

// 1. 清理旧的构建
console.log('1️⃣ 清理旧文件...');
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.rmSync(path.join(__dirname, 'dist'), { recursive: true });
}

// 2. 运行Vite构建
console.log('2️⃣ 运行Vite构建...');
execSync('npm run build', { stdio: 'inherit' });

// 3. 编译Tailwind CSS
console.log('3️⃣ 编译Tailwind CSS...');
execSync('npx tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify', { stdio: 'inherit' });

// 4. 修改index.html以包含CSS
console.log('4️⃣ 更新index.html...');
const indexPath = path.join(__dirname, 'dist/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf-8');

// 在</head>前添加CSS链接
const cssLink = '<link rel="stylesheet" href="/kefu/styles.css">';
htmlContent = htmlContent.replace('</head>', `  ${cssLink}\n  </head>`);

fs.writeFileSync(indexPath, htmlContent);

// 5. 复制文件到根目录
console.log('5️⃣ 复制文件到静态目录...');
const filesToCopy = ['index.html', 'styles.css', 'manifest.json'];

filesToCopy.forEach(file => {
  const src = path.join(__dirname, 'dist', file);
  const dest = path.join(__dirname, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`   ✅ ${file}`);
  }
});

// 复制assets目录
const assetsDir = path.join(__dirname, 'dist/assets');
const destAssetsDir = path.join(__dirname, 'assets');

if (fs.existsSync(assetsDir)) {
  if (!fs.existsSync(destAssetsDir)) {
    fs.mkdirSync(destAssetsDir);
  }
  
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    fs.copyFileSync(
      path.join(assetsDir, file),
      path.join(destAssetsDir, file)
    );
  });
  console.log(`   ✅ assets目录 (${files.length}个文件)`);
}

console.log('\n✅ 构建完成！');
console.log('\n访问地址:');
console.log('- 客服端: http://localhost:6006/kefu');
console.log('- 客户端: http://localhost:6006/kehu');