/**
 * 作品数据管理 Store
 * 使用 Zustand 管理作品和章节数据
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Novel,
  Volume,
  Chapter,
  ChapterInfo,
  AutoSaveState,
} from '../../types/novel';
import { api } from '../api/ipc';

// ==================== 状态类型定义 ====================

interface NovelState {
  // 当前选中的作品
  currentNovel: Novel | null;
  // 当前选中的章节
  currentChapter: Chapter | null;
  // 作品列表
  novelList: Novel[];
  // 当前作品的章节列表
  chapterList: ChapterInfo[];
  // 当前作品的卷列表
  volumeList: Volume[];
  // 加载状态
  isLoading: boolean;
  // 错误信息
  error: string | null;
  // 自动保存状态
  autoSave: AutoSaveState;
}

interface NovelActions {
  // 设置当前作品
  setCurrentNovel: (novel: Novel | null) => void;
  // 设置当前章节
  setCurrentChapter: (chapter: Chapter | null) => void;
  // 清除错误
  clearError: () => void;

  // 作品操作
  createNovel: (title: string, author?: string, description?: string) => Promise<Novel | null>;
  loadNovelList: () => Promise<void>;
  loadNovels: () => Promise<void>; // 别名，与 loadNovelList 相同
  loadNovel: (novelId: string) => Promise<Novel | null>;
  updateNovel: (novelId: string, updates: Partial<Novel>) => Promise<Novel | null>;
  deleteNovel: (novelId: string) => Promise<boolean>;

  // 章节操作
  createChapter: (title: string, order?: number, volumeId?: string) => Promise<Chapter | null>;
  loadChapterList: (novelId: string) => Promise<void>;
  loadChapter: (novelId: string, chapterId: string) => Promise<Chapter | null>;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<Chapter | null>;
  deleteChapter: (chapterId: string) => Promise<boolean>;
  updateChapterContent: (content: string) => Promise<Chapter | null>;
  updateChapterTitle: (chapterId: string, title: string) => Promise<Chapter | null>;

  // 卷操作
  createVolume: (title: string, order?: number) => Promise<Volume | null>;
  loadVolumeList: (novelId: string) => Promise<void>;
  updateVolume: (volumeId: string, updates: Partial<Volume>) => Promise<Volume | null>;
  deleteVolume: (volumeId: string) => Promise<boolean>;

  // 确保第一章存在
  ensureFirstChapter: () => Promise<string | null>;

  // 上次编辑位置
  updateLastChapterId: (novelId: string, chapterId: string) => Promise<void>;

  // 自动保存相关
  setAutoSaveState: (state: Partial<AutoSaveState>) => void;
  triggerAutoSave: () => Promise<void>;
  markUnsavedChanges: () => void;
}

type NovelStore = NovelState & NovelActions;

// ==================== Store 实现 ====================

const initialState: NovelState = {
  currentNovel: null,
  currentChapter: null,
  novelList: [],
  chapterList: [],
  volumeList: [],
  isLoading: false,
  error: null,
  autoSave: {
    isSaving: false,
    lastSavedAt: undefined,
    hasUnsavedChanges: false,
    pendingChanges: false,
  },
};

export const useNovelStore = create<NovelStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================== 基础操作 ====================

        setCurrentNovel: (novel) => {
          set({ currentNovel: novel });
          if (novel) {
            get().loadChapterList(novel.id);
            get().loadVolumeList(novel.id);
          } else {
            set({ chapterList: [], volumeList: [], currentChapter: null });
          }
        },

        setCurrentChapter: (chapter) => {
          set({ currentChapter: chapter });
        },

        clearError: () => set({ error: null }),

        // ==================== 作品操作 ====================

        createNovel: async (title, author, description) => {
          set({ isLoading: true, error: null });
          try {
            console.log('store: 调用 api.novel.create', { title, author, description });
            const result = await api.novel.create(title, author, description);
            console.log('store: api 返回结果', result);
            
            if (result.success && result.data) {
              await get().loadNovelList();
              set({ isLoading: false });
              return result.data;
            } else {
              const errorMsg = result.error || '创建作品失败';
              set({ error: errorMsg, isLoading: false });
              throw new Error(errorMsg);
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '创建作品失败';
            set({
              error: errorMsg,
              isLoading: false,
            });
            throw err;
          }
        },

        loadNovelList: async () => {
          set({ isLoading: true, error: null });
          try {
            const result = await api.novel.getList();
            if (result.success && result.data) {
              set({ novelList: result.data, isLoading: false });
            } else {
              set({ error: result.error || '获取作品列表失败', isLoading: false });
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取作品列表失败',
              isLoading: false,
            });
          }
        },

        // loadNovels 是 loadNovelList 的别名
        loadNovels: async () => {
          await get().loadNovelList();
        },

        loadNovel: async (novelId) => {
          set({ isLoading: true, error: null });
          try {
            const result = await api.novel.get(novelId);
            if (result.success && result.data) {
              set({ currentNovel: result.data });
              await get().loadChapterList(novelId);
              await get().loadVolumeList(novelId);
              set({ isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '获取作品失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取作品失败',
              isLoading: false,
            });
            return null;
          }
        },

        updateNovel: async (novelId, updates) => {
          set({ isLoading: true, error: null });
          try {
            const result = await api.novel.update(novelId, updates);
            if (result.success && result.data) {
              const { currentNovel, novelList } = get();
              // 更新当前作品
              if (currentNovel?.id === novelId) {
                set({ currentNovel: result.data });
              }
              // 更新列表中的作品
              const updatedList = novelList.map((n) =>
                n.id === novelId ? result.data! : n
              );
              set({ novelList: updatedList, isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '更新作品失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '更新作品失败',
              isLoading: false,
            });
            return null;
          }
        },

        deleteNovel: async (novelId) => {
          set({ isLoading: true, error: null });
          try {
            const result = await api.novel.delete(novelId);
            if (result.success) {
              const { currentNovel, novelList } = get();
              // 如果删除的是当前作品，清空当前作品
              if (currentNovel?.id === novelId) {
                set({
                  currentNovel: null,
                  currentChapter: null,
                  chapterList: [],
                });
              }
              // 从列表中移除
              const updatedList = novelList.filter((n) => n.id !== novelId);
              set({ novelList: updatedList, isLoading: false });
              return true;
            } else {
              set({ error: result.error || '删除作品失败', isLoading: false });
              return false;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '删除作品失败',
              isLoading: false,
            });
            return false;
          }
        },

        // ==================== 章节操作 ====================

        createChapter: async (title, order, volumeId) => {
          const { currentNovel } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return null;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.chapter.create(currentNovel.id, title, order, volumeId);
            if (result.success && result.data) {
              await get().loadChapterList(currentNovel.id);
              // 更新作品章节数
              await get().loadNovel(currentNovel.id);
              set({ isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '创建章节失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '创建章节失败',
              isLoading: false,
            });
            return null;
          }
        },

        loadChapterList: async (novelId) => {
          try {
            const result = await api.chapter.getList(novelId);
            if (result.success && result.data) {
              set({ chapterList: result.data });
            } else {
              set({ error: result.error || '获取章节列表失败' });
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取章节列表失败',
            });
          }
        },

        loadChapter: async (novelId, chapterId) => {
          set({ isLoading: true, error: null });
          try {
            const result = await api.chapter.get(novelId, chapterId);
            if (result.success && result.data) {
              set({ currentChapter: result.data, isLoading: false });
              get().updateLastChapterId(novelId, chapterId);
              return result.data;
            } else {
              set({ error: result.error || '获取章节失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取章节失败',
              isLoading: false,
            });
            return null;
          }
        },

        updateChapter: async (chapterId, updates) => {
          const { currentNovel, currentChapter } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return null;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.chapter.update(currentNovel.id, chapterId, updates);
            if (result.success && result.data) {
              // 更新当前章节
              if (currentChapter?.id === chapterId) {
                set({ currentChapter: result.data });
              }
              // 更新章节列表
              await get().loadChapterList(currentNovel.id);
              // 更新作品统计
              await get().loadNovel(currentNovel.id);
              set({ isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '更新章节失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '更新章节失败',
              isLoading: false,
            });
            return null;
          }
        },

        deleteChapter: async (chapterId) => {
          const { currentNovel, currentChapter } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return false;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.chapter.delete(currentNovel.id, chapterId);
            if (result.success) {
              // 如果删除的是当前章节，清空当前章节
              if (currentChapter?.id === chapterId) {
                set({ currentChapter: null });
              }
              // 刷新章节列表
              await get().loadChapterList(currentNovel.id);
              // 刷新作品信息
              await get().loadNovel(currentNovel.id);
              set({ isLoading: false });
              return true;
            } else {
              set({ error: result.error || '删除章节失败', isLoading: false });
              return false;
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '删除章节失败',
              isLoading: false,
            });
            return false;
          }
        },

        updateChapterContent: async (content: string) => {
          const { currentNovel, currentChapter } = get();
          if (!currentNovel || !currentChapter) return null;
          if (!content && currentChapter.content) return null;

          try {
            const result = await api.chapter.update(currentNovel.id, currentChapter.id, { content });
            if (result.success && result.data) {
              set({ currentChapter: result.data });
              await get().loadChapterList(currentNovel.id);
              return result.data;
            }
            return null;
          } catch (err) {
            console.error('更新章节内容失败:', err);
            return null;
          }
        },

        updateChapterTitle: async (chapterId: string, title: string) => {
          const { currentNovel } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return null;
          }

          try {
            const result = await api.chapter.update(currentNovel.id, chapterId, { title });
            if (result.success && result.data) {
              await get().loadChapterList(currentNovel.id);
              return result.data;
            }
            return null;
          } catch (err) {
            console.error('更新章节标题失败:', err);
            return null;
          }
        },

        // ==================== 卷操作 ====================

        createVolume: async (title, order) => {
          const { currentNovel } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return null;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.volume.create(currentNovel.id, title, order);
            if (result.success && result.data) {
              await get().loadVolumeList(currentNovel.id);
              await get().loadNovel(currentNovel.id);
              set({ isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '创建卷失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '创建卷失败', isLoading: false });
            return null;
          }
        },

        loadVolumeList: async (novelId) => {
          try {
            const result = await api.volume.getList(novelId);
            if (result.success && result.data) {
              set({ volumeList: result.data });
            } else {
              set({ error: result.error || '获取卷列表失败' });
            }
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '获取卷列表失败' });
          }
        },

        updateVolume: async (volumeId, updates) => {
          const { currentNovel } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return null;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.volume.update(currentNovel.id, volumeId, updates);
            if (result.success && result.data) {
              await get().loadVolumeList(currentNovel.id);
              set({ isLoading: false });
              return result.data;
            } else {
              set({ error: result.error || '更新卷失败', isLoading: false });
              return null;
            }
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '更新卷失败', isLoading: false });
            return null;
          }
        },

        deleteVolume: async (volumeId) => {
          const { currentNovel } = get();
          if (!currentNovel) {
            set({ error: '未选择作品' });
            return false;
          }

          set({ isLoading: true, error: null });
          try {
            const result = await api.volume.delete(currentNovel.id, volumeId);
            if (result.success) {
              await get().loadVolumeList(currentNovel.id);
              await get().loadNovel(currentNovel.id);
              set({ isLoading: false });
              return true;
            } else {
              set({ error: result.error || '删除卷失败', isLoading: false });
              return false;
            }
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '删除卷失败', isLoading: false });
            return false;
          }
        },

        // ==================== 确保第一章存在 ====================

        ensureFirstChapter: async () => {
          const { currentNovel, volumeList, chapterList } = get();
          if (!currentNovel) return null;

          // 如果已有章节，直接返回第一个章节 ID
          if (chapterList.length > 0) {
            return chapterList[0].id;
          }

          // 确保有卷（直接调 API，避免触发 isLoading 变化导致竞态）
          let volId = volumeList[0]?.id;
          if (!volId) {
            const volResult = await api.volume.create(currentNovel.id, '第一卷', 1);
            if (volResult.success && volResult.data) {
              volId = volResult.data.id;
              await get().loadVolumeList(currentNovel.id);
            }
          }

          // 创建第一章（直接调 API）
          const chResult = await api.chapter.create(currentNovel.id, '第一章', 0, volId);
          if (chResult.success && chResult.data) {
            await get().loadChapterList(currentNovel.id);
            await get().loadNovel(currentNovel.id);
            return chResult.data.id;
          }
          return null;
        },

        // ==================== 上次编辑位置 ====================

        updateLastChapterId: async (novelId, chapterId) => {
          const { novelList, currentNovel } = get();
          // Update in-memory novel list
          const updatedList = novelList.map((n) =>
            n.id === novelId ? { ...n, lastChapterId: chapterId } : n
          );
          set({ novelList: updatedList });
          // Update currentNovel if it matches
          if (currentNovel?.id === novelId) {
            set({ currentNovel: { ...currentNovel, lastChapterId: chapterId } });
          }
          // Persist to backend
          try {
            await api.novel.update(novelId, { lastChapterId: chapterId });
          } catch {
            // Non-critical, ignore persistence errors
          }
        },

        // ==================== 自动保存相关 ====================

        setAutoSaveState: (state) => {
          set((prev) => ({
            autoSave: { ...prev.autoSave, ...state },
          }));
        },

        triggerAutoSave: async () => {
          const { currentNovel, currentChapter, autoSave } = get();
          if (!currentNovel || !currentChapter || autoSave.isSaving) {
            return;
          }

          set({
            autoSave: {
              ...autoSave,
              isSaving: true,
            },
          });

          try {
            const result = await api.chapter.update(
              currentNovel.id,
              currentChapter.id,
              { content: currentChapter.content }
            );

            if (result.success) {
              set({
                autoSave: {
                  isSaving: false,
                  hasUnsavedChanges: false,
                  pendingChanges: false,
                  lastSavedAt: new Date().toISOString(),
                },
              });
            } else {
              set({
                autoSave: {
                  ...get().autoSave,
                  isSaving: false,
                },
              });
            }
          } catch (err) {
            set({
              autoSave: {
                ...get().autoSave,
                isSaving: false,
              },
            });
          }
        },

        markUnsavedChanges: () => {
          set((prev) => ({
            autoSave: {
              ...prev.autoSave,
              hasUnsavedChanges: true,
              pendingChanges: true,
            },
          }));
        },
      }),
      {
        name: 'novel-store',
        // 只持久化部分状态
        partialize: (state) => ({
          currentNovel: state.currentNovel,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<NovelState>),
          autoSave: {
            isSaving: false,
            pendingChanges: false,
            hasUnsavedChanges: false,
            lastSavedAt: undefined,
          },
        }),
      }
    ),
    { name: 'novel-store' }
  )
);

// ==================== 选择器 ====================

export const selectCurrentNovel = (state: NovelStore) => state.currentNovel;
export const selectCurrentChapter = (state: NovelStore) => state.currentChapter;
export const selectNovelList = (state: NovelStore) => state.novelList;
export const selectChapterList = (state: NovelStore) => state.chapterList;
export const selectIsLoading = (state: NovelStore) => state.isLoading;
export const selectError = (state: NovelStore) => state.error;
export const selectAutoSave = (state: NovelStore) => state.autoSave;
