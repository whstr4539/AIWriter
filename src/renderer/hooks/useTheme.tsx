import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: ThemeMode;
  isDark: boolean;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'app-theme';
const ThemeContext = createContext<UseThemeReturn | null>(null);

function useThemeInternal(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      return saved || 'system';
    }
    return 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [effectiveTheme, setTheme]);

  // 同步 effectiveTheme
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setEffectiveTheme(resolved);
  }, [theme, getSystemTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(getSystemTheme());
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme, getSystemTheme]);

  // 应用 CSS 变量
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${effectiveTheme}-theme`);
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  return {
    theme,
    isDark: effectiveTheme === 'dark',
    effectiveTheme,
    setTheme,
    toggleTheme,
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useThemeInternal();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): UseThemeReturn => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
};

export default useTheme;
