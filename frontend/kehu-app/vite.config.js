import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 3002,
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
  
  build: {
    outDir: '../../static/kehu-build',
    emptyOutDir: true,
    assetsDir: 'assets',
    
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    minify: 'terser',
    sourcemap: false,
  },
})