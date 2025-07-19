// 引入 HeroUI 的 Tailwind 插件
import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  // 指定需要处理的文件路径，用于生成最终的CSS
  content: [
    "./index.html",                   // HTML 文件
    "./src/**/*.{js,ts,jsx,tsx}",    // src目录下的所有文件
    "./*.{js,ts,jsx,tsx}",           // 项目根目录下的所有 JS/TS 文件
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",  // HeroUI 组件库文件
  ],
  theme: {
    extend: {
      colors: {
        // 自定义颜色
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      animation: {
        // 自定义动画
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      fontFamily: {
        // 自定义字体
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      spacing: {
        // 自定义间距
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        // 自定义圆角
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        // 自定义阴影
        'soft': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  darkMode: "class",  // 使用类名控制深色模式
  plugins: [heroui()],  // 使用 HeroUI 插件
};