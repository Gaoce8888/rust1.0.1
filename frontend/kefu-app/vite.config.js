import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:6006',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:6006',
        ws: true,
      },
    },
  },
  
  // 构建配置
  build: {
    // 输出到独立的build目录
    outDir: '../../static/kefu-build',
    emptyOutDir: true,
    
    // 资源路径配置
    assetsDir: 'assets',
    
    // 代码分割配置
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库打包到一起
          'react-vendor': ['react', 'react-dom'],
          // 将UI库打包到一起
          'ui-vendor': ['@heroui/react', '@iconify/react', 'framer-motion'],
          // 将工具库分离
          'utils-vendor': ['clsx', 'tailwind-merge', 'usehooks-ts'],
        },
        // 自定义chunk文件名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // 性能优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
        reduce_vars: true,
        dead_code: true,
      },
      mangle: {
        safari10: true,
      },
    },
    
    // 生成source map用于调试
    sourcemap: false,
    
    // 设置打包警告的文件大小限制
    chunkSizeWarningLimit: 1000,
    
    // 压缩选项
    cssCodeSplit: true,
    
    // 优化依赖预构建
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  
  // 依赖优化
  optimizeDeps: {
    include: ['react', 'react-dom', '@heroui/react', '@iconify/react'],
    exclude: ['fs-extra'], // 避免在浏览器环境中打包Node.js模块
  },
  
  // 路径解析配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  
  // 预览配置
  preview: {
    port: 6005,
  },
})