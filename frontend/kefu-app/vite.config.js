import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库分离
          'react-vendor': ['react', 'react-dom'],
          // 将UI库分离
          'ui-vendor': ['@heroui/react', 'framer-motion'],
          // 将工具库分离
          'utils-vendor': ['clsx', 'tailwind-merge', 'usehooks-ts'],
          // 将图标库分离
          'icons-vendor': ['@iconify/react'],
        },
        // 优化chunk命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 启用Tree Shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console
        drop_debugger: true,
      },
    },
    // 启用源码映射（开发环境）
    sourcemap: false,
    // 设置chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
  // 开发服务器优化
  server: {
    port: 6005,
    host: true,
    // 启用HMR优化
    hmr: {
      overlay: false,
    },
  },
  // 预构建优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@heroui/react',
      'framer-motion',
      'clsx',
      'tailwind-merge',
    ],
  },
  // 性能优化
  esbuild: {
    // 移除开发环境的console和debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})