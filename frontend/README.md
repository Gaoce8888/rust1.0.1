# 前端项目结构说明

## 目录结构

```
frontend/
├── kefu-app/          # 客服端应用
│   ├── src/           # 源代码
│   ├── public/        # 公共资源
│   └── vite.config.js # Vite配置
├── kehu-app/          # 客户端应用
│   ├── src/           # 源代码
│   ├── public/        # 公共资源
│   └── vite.config.js # Vite配置
└── build.sh           # 统一构建脚本
```

## 构建输出

- 客服端构建输出: `/static/kefu-build/`
- 客户端构建输出: `/static/kehu-build/`

## 开发命令

### 1. 开发模式

```bash
# 客服端开发
cd kefu-app
npm install
npm run dev  # 运行在 http://localhost:3001

# 客户端开发
cd kehu-app
npm install
npm run dev  # 运行在 http://localhost:3002
```

### 2. 生产构建

```bash
# 在 frontend 目录下
./build.sh all      # 构建所有应用
./build.sh kefu     # 只构建客服端
./build.sh kehu     # 只构建客户端
```

## 优化特性

1. **代码分割**
   - React库单独打包
   - UI组件库单独打包
   - 按需加载

2. **资源优化**
   - 自动压缩JS/CSS
   - 图片资源优化
   - 生产环境移除console

3. **路径配置**
   - 使用别名简化导入
   - 支持绝对路径导入

## 后端路由配置

后端已配置为自动服务构建后的文件：

- `/kefu` - 客服端应用
- `/kehu` - 客户端应用
- `/` - 主页面

## 部署说明

1. 执行构建命令生成生产文件
2. 后端会自动从构建目录提供服务
3. 无需额外的nginx配置

## 注意事项

- 开发时前端和后端需要同时运行
- WebSocket连接默认指向 `ws://localhost:6006`
- API请求会自动代理到后端服务