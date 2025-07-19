import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/kehu/',
  server: {
    port: 6004,
    host: '127.0.0.1',
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
  }
}) 
