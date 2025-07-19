# 前端目录结构优化说明

## 优化内容

### 1. 目录结构重组
- 将源代码与构建产物分离
- 独立的前端开发目录 `/frontend/`
- 统一的构建输出目录 `/static/xxx-build/`

### 2. 新的目录结构

```
项目根目录/
├── frontend/                  # 前端源代码目录
│   ├── kefu-app/             # 客服端应用
│   │   ├── src/              # 源代码
│   │   ├── public/           # 公共资源
│   │   ├── index.html        # 入口HTML
│   │   ├── vite.config.js    # Vite配置
│   │   └── package.json      # 依赖配置
│   ├── kehu-app/             # 客户端应用
│   │   ├── src/              # 源代码
│   │   ├── public/           # 公共资源
│   │   ├── index.html        # 入口HTML
│   │   ├── vite.config.js    # Vite配置
│   │   └── package.json      # 依赖配置
│   ├── build.sh              # 统一构建脚本
│   └── README.md             # 前端说明文档
├── static/                    # 静态资源目录
│   ├── kefu-build/           # 客服端构建输出
│   ├── kehu-build/           # 客户端构建输出
│   ├── react-kefu/           # 原客服端代码（保留兼容）
│   ├── react-kehu/           # 原客户端代码（保留兼容）
│   └── index.html            # 主页
└── src/                      # 后端源代码
    └── routes/
        └── frontend.rs       # 优化后的前端路由
```

### 3. 构建配置优化

#### Vite配置特性：
- **代码分割**: React和UI库分别打包
- **资源优化**: 自动压缩，移除console
- **路径别名**: 简化模块导入
- **构建输出**: 统一输出到 `/static/xxx-build/`

### 4. 后端路由适配

优化后的路由支持：
- 开发版本和构建版本自动切换
- 资源路径自动修正
- 多级目录fallback机制

```rust
// 优先级顺序
1. /static/kefu-build/    # 构建版本
2. /static/react-kefu/dist/  # 旧构建版本
3. /static/react-kefu/     # 开发版本
```

### 5. 使用方式

#### 开发模式
```bash
# 客服端
cd frontend/kefu-app
npm install
npm run dev

# 客户端
cd frontend/kehu-app
npm install
npm run dev
```

#### 生产构建
```bash
cd frontend
./build.sh all  # 构建所有应用
```

### 6. 优化效果

1. **开发体验提升**
   - 源代码与构建产物分离，目录更清晰
   - 支持热更新和快速开发
   - 路径别名简化导入

2. **构建性能优化**
   - 代码分割减少首屏加载时间
   - 资源压缩减小文件体积
   - Tree-shaking移除无用代码

3. **部署更简单**
   - 构建产物集中管理
   - 后端自动识别并服务构建文件
   - 无需额外配置nginx

### 7. 迁移说明

原有的 `/static/react-xxx/` 目录保留以确保兼容性，但建议：
1. 新开发使用 `/frontend/` 目录
2. 逐步迁移旧代码到新结构
3. 使用构建脚本统一管理

### 8. 注意事项

- 确保安装了Node.js和npm
- 首次开发需要运行 `npm install`
- WebSocket连接地址可能需要根据环境调整
- 生产环境记得执行构建命令
