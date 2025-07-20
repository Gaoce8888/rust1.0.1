// 引入 HeroUI 的 Tailwind 插件
import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  // 指定需要处理的文件路径，用于生成最终的CSS
  content: [
    "./index.html",                   // HTML 文件
    "./*.{js,ts,jsx,tsx}",           // 项目根目录下的所有 JS/TS 文件
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",  // HeroUI 组件库文件
  ],
  theme: {
    extend: {},  // 扩展默认主题配置
  },
  darkMode: "class",  // 使用类名控制深色模式
  plugins: [heroui()],  // 使用 HeroUI 插件
};