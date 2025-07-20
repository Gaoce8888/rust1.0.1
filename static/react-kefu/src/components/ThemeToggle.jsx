import React, { useEffect, useState, memo } from 'react';
import { Switch } from '@heroui/react';
import { Icon } from '@iconify/react';

/**
 * ThemeToggle 主题切换组件（前端专用）
 *
 * 功能：
 * 1. 根据系统偏好或本地存储初始化主题（深色 / 浅色）。
 * 2. 通过切换 Switch 组件为 <html> 元素动态添加 / 移除 `dark` 类名以切换 TailwindCSS 主题。
 * 3. 将用户偏好持久化到 localStorage，以便刷新后仍保持当前主题。
 *
 * 使用示例：
 * ```jsx
 * import ThemeToggle from './components/ThemeToggle';
 *
 * function Toolbar() {
 *   return (
 *     <div className="flex items-center gap-2">
 *       <ThemeToggle />
 *     </div>
 *   );
 * }
 * ```
 */
const ThemeToggle = memo(({ className = '' }) => {
  const [isDark, setIsDark] = useState(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    applyTheme(shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  // 应用主题到 <html> 标签
  const applyTheme = (dark) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // 切换处理
  const handleToggle = (value) => {
    const useDark = value ?? !isDark;
    setIsDark(useDark);
    applyTheme(useDark);
    localStorage.setItem('theme', useDark ? 'dark' : 'light');
  };

  return (
    <Switch
      isSelected={isDark}
      onValueChange={handleToggle}
      size="sm"
      color="primary"
      className={`flex items-center ${className}`}
      startContent={<Icon icon="solar:sun-linear" className="text-warning" />}
      endContent={<Icon icon="solar:moon-linear" className="text-default-400" />}
      aria-label="主题切换开关"
    />
  );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;