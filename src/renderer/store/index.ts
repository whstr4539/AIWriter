import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '../types';

// 应用状态存储
interface AppStore extends AppState {
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
    }),
    {
      name: 'app-storage',
    }
  )
);

// 导出作品存储
export { useNovelStore } from './novelStore';
export * from './novelStore';
