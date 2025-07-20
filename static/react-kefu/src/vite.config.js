import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置
export default defineConfig({
  plugins: [react()],
  base: '/kefu/',
  server: {
    port: 6005,
    host: true, // 允许外部访问
    open: true, // 自动打开浏览器
  },
  preview: {
    port: 6005,
  },
  resolve: {
    extensions: ['.jsx', '.js', '.ts', '.tsx']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // 开启 source map
    minify: 'terser', // 使用 terser 进行压缩
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console
        drop_debugger: true
      },
      mangle: {
        keep_fnames: true // 保留函数名
      }
    }
  }
})