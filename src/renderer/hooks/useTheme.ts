/**
 * 主题管理 Hook
 * 支持浅色/深色/跟随系统三种模式
 */

import { useEffect, useState, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: ThemeMode;
  isDark: boolean;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'app-theme';

export const useTheme = (): UseThemeReturn => {
  // 从本地存储读取主题设置
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      return saved || 'system';
    }
    return 'system';
  });

  // 计算实际生效的主题
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // 检测系统主题偏好
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // 更新实际生效的主题
  const updateEffectiveTheme = useCallback(() => {
    const newEffectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    setEffectiveTheme(newEffectiveTheme);
  }, [theme, getSystemTheme]);

  // 设置主题
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const themes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        updateEffectiveTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateEffectiveTheme]);

  // 主题变化时更新文档
  useEffect(() => {
    updateEffectiveTheme();
  }, [theme, updateEffectiveTheme]);

  // 应用主题到文档
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // 移除旧的主题类
    root.classList.remove('light-theme', 'dark-theme');
    
    // 添加新的主题类
    root.classList.add(`${effectiveTheme}-theme`);
    
    // 设置 data-theme 属性用于 CSS 选择器
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  return {
    theme,
    isDark: effectiveTheme === 'dark',
    effectiveTheme,
    setTheme,
    toggleTheme,
  };
};

export default useTheme;
