import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '../types';

// 应用状态存储
interface AppStore extends AppState {
  // Actions
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      language: 'zh-CN',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setLanguage: (lang) => set({ language: lang }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-storage',
    }
  )
);

// 导出作品存储
export { useNovelStore } from './novelStore';
export * from './novelStore';
