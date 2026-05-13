/**
 * IPC 通信处理器
 * 处理渲染进程与主进程之间的通信
 */

import { ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import type {
  Novel,
  Volume,
  Chapter,
  ChapterInfo,
  AppSettings,
  AISettings,
  ExportOptions,
  FileOperationResult,
  StorageStats,
  AITestResult,
  ImportPreview,
} from '../../types/novel';

import {
  createNovel,
  getNovelList,
  getNovel,
  updateNovel,
  deleteNovel,
  getChapterList,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  getVolumeList,
  createVolume,
  updateVolume,
  deleteVolume,
  getAppSettings,
  saveAppSettings,
  getAISettings,
  saveAISettings,
  exportNovel,
  importNovel,
  batchImportNovels,
  previewImportFile,
  getStorageStats,
  getStoragePath,
} from '../storage/fileManager';

import { aiService, AIService } from '../ai/aiService';
import type { AIStreamChunk } from '../ai/types';

// IPC 通道名称定义
export const IPC_CHANNELS = {
  // 作品相关
  NOVEL: {
    CREATE: 'novel:create',
    LIST: 'novel:list',
    GET: 'novel:get',
    UPDATE: 'novel:update',
    DELETE: 'novel:delete',
  },
  // 章节相关
  CHAPTER: {
    CREATE: 'chapter:create',
    LIST: 'chapter:list',
    GET: 'chapter:get',
    UPDATE: 'chapter:update',
    DELETE: 'chapter:delete',
  },
  // 卷相关
  VOLUME: {
    CREATE: 'volume:create',
    LIST: 'volume:list',
    GET: 'volume:get',
    UPDATE: 'volume:update',
    DELETE: 'volume:delete',
  },
  // 设置相关
  SETTINGS: {
    GET_APP: 'settings:getApp',
    SAVE_APP: 'settings:saveApp',
    GET_AI: 'settings:getAI',
    SAVE_AI: 'settings:saveAI',
  },
  // 导入导出
  EXPORT: 'export:novel',
  IMPORT: 'import:novel',
  IMPORT_BATCH: 'import:batch',
  IMPORT_PREVIEW: 'import:preview',
  // 存储相关
  STORAGE: {
    GET_STATS: 'storage:getStats',
    GET_PATH: 'storage:getPath',
    OPEN_FOLDER: 'storage:openFolder',
  },
  // 对话框
  DIALOG: {
    SHOW_SAVE: 'dialog:showSave',
    SHOW_OPEN: 'dialog:showOpen',
    SHOW_MESSAGE: 'dialog:showMessage',
  },
  // AI相关
  AI: {
    GENERATE: 'ai:generate',
    STREAM_GENERATE: 'ai:streamGenerate',
    ABORT: 'ai:abort',
    TEST_CONNECTION: 'ai:testConnection',
    GET_MODELS: 'ai:getModels',
    GET_PROVIDERS: 'ai:getProviders',
    GET_DEFAULT_BASE_URL: 'ai:getDefaultBaseUrl',
    GET_DEFAULT_MODEL: 'ai:getDefaultModel',
  },
} as const;

/**
 * 注册所有 IPC 处理器
 */
export async function registerIpcHandlers(): Promise<void> {
  // ==================== 作品操作 ====================

  ipcMain.handle(
    IPC_CHANNELS.NOVEL.CREATE,
    async (_event, title: string, author?: string, description?: string) => {
      return await createNovel(title, author, description);
    }
  );

  ipcMain.handle(IPC_CHANNELS.NOVEL.LIST, async () => {
    return await getNovelList();
  });

  ipcMain.handle(IPC_CHANNELS.NOVEL.GET, async (_event, novelId: string) => {
    return await getNovel(novelId);
  });

  ipcMain.handle(
    IPC_CHANNELS.NOVEL.UPDATE,
    async (_event, novelId: string, updates: Partial<Novel>) => {
      return await updateNovel(novelId, updates);
    }
  );

  ipcMain.handle(IPC_CHANNELS.NOVEL.DELETE, async (_event, novelId: string) => {
    return await deleteNovel(novelId);
  });

  // ==================== 章节操作 ====================

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER.CREATE,
    async (_event, novelId: string, title: string, order?: number, volumeId?: string) => {
      return await createChapter(novelId, title, order, volumeId);
    }
  );

  ipcMain.handle(IPC_CHANNELS.CHAPTER.LIST, async (_event, novelId: string) => {
    return await getChapterList(novelId);
  });

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER.GET,
    async (_event, novelId: string, chapterId: string) => {
      return await getChapter(novelId, chapterId);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER.UPDATE,
    async (
      _event,
      novelId: string,
      chapterId: string,
      updates: Partial<Chapter>
    ) => {
      return await updateChapter(novelId, chapterId, updates);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER.DELETE,
    async (_event, novelId: string, chapterId: string) => {
      return await deleteChapter(novelId, chapterId);
    }
  );

  // ==================== 卷操作 ====================

  ipcMain.handle(IPC_CHANNELS.VOLUME.CREATE, async (_event, novelId: string, title: string, order?: number) => {
    return await createVolume(novelId, title, order);
  });

  ipcMain.handle(IPC_CHANNELS.VOLUME.LIST, async (_event, novelId: string) => {
    return await getVolumeList(novelId);
  });

  ipcMain.handle(IPC_CHANNELS.VOLUME.GET, async (_event, novelId: string, volumeId: string) => {
    const result = await getVolumeList(novelId);
    if (result.success && result.data) {
      const volume = result.data.find(v => v.id === volumeId);
      if (volume) return { success: true, data: volume };
      return { success: false, error: '卷不存在' };
    }
    return { success: false, error: result.error || '获取卷失败' };
  });

  ipcMain.handle(IPC_CHANNELS.VOLUME.UPDATE, async (_event, novelId: string, volumeId: string, updates: Partial<Volume>) => {
    return await updateVolume(novelId, volumeId, updates);
  });

  ipcMain.handle(IPC_CHANNELS.VOLUME.DELETE, async (_event, novelId: string, volumeId: string) => {
    return await deleteVolume(novelId, volumeId);
  });

  // ==================== 设置操作 ====================

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_APP, async () => {
    return await getAppSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.SAVE_APP,
    async (_event, settings: AppSettings) => {
      return await saveAppSettings(settings);
    }
  );

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_AI, async () => {
    return await getAISettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.SAVE_AI,
    async (_event, settings: AISettings) => {
      const result = await saveAISettings(settings);
      // 同步更新 aiService 单例，确保后续生成使用最新配置
      if (result.success) {
        aiService.updateSettings(settings);
      }
      return result;
    }
  );

  // ==================== 导入导出 ====================

  ipcMain.handle(
    IPC_CHANNELS.EXPORT,
    async (
      _event,
      novelId: string,
      options: ExportOptions,
      exportPath: string
    ) => {
      return await exportNovel(novelId, options, exportPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPORT,
    async (_event, importPath: string, title?: string) => {
      return await importNovel(importPath, title);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPORT_BATCH,
    async (_event, importPaths: string[]) => {
      return await batchImportNovels(importPaths);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPORT_PREVIEW,
    async (_event, importPath: string) => {
      return await previewImportFile(importPath);
    }
  );

  // ==================== 存储相关 ====================

  ipcMain.handle(IPC_CHANNELS.STORAGE.GET_STATS, async () => {
    return await getStorageStats();
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE.GET_PATH, () => {
    return { success: true, data: getStoragePath() };
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE.OPEN_FOLDER, async () => {
    try {
      const storagePath = getStoragePath();
      await shell.openPath(storagePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '打开文件夹失败',
      };
    }
  });

  // ==================== 对话框 ====================

  ipcMain.handle(
    IPC_CHANNELS.DIALOG.SHOW_SAVE,
    async (_event, options: Electron.SaveDialogOptions) => {
      const result = await dialog.showSaveDialog(options);
      return {
        success: !result.canceled,
        data: result.filePath,
        canceled: result.canceled,
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DIALOG.SHOW_OPEN,
    async (_event, options: Electron.OpenDialogOptions) => {
      const result = await dialog.showOpenDialog(options);
      return {
        success: !result.canceled,
        data: result.filePaths,
        canceled: result.canceled,
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DIALOG.SHOW_MESSAGE,
    async (_event, options: Electron.MessageBoxOptions) => {
      const result = await dialog.showMessageBox(options);
      return {
        success: true,
        data: result,
      };
    }
  );

  // ==================== AI操作 ====================

  // 初始化AI服务（如果有设置）
  const aiSettings = await getAISettings();
  if (aiSettings.success && aiSettings.data) {
    aiService.initialize(aiSettings.data);
  }

  // AI生成内容（非流式）
  ipcMain.handle(
    IPC_CHANNELS.AI.GENERATE,
    async (_event, prompt: string, options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    }) => {
      try {
        // 确保AI服务已初始化
        if (!aiService.isInitialized()) {
          const settings = await getAISettings();
          if (settings.success && settings.data) {
            aiService.initialize(settings.data);
          } else {
            return {
              success: false,
              error: 'AI服务未配置，请先配置AI设置',
            };
          }
        }

        const result = await aiService.generate(prompt, options);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'AI生成失败',
        };
      }
    }
  );

  // AI流式生成内容
  ipcMain.handle(
    IPC_CHANNELS.AI.STREAM_GENERATE,
    async (event, prompt: string, options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    }) => {
      try {
        // 确保AI服务已初始化
        if (!aiService.isInitialized()) {
          const settings = await getAISettings();
          if (settings.success && settings.data) {
            aiService.initialize(settings.data);
          } else {
            event.sender.send('ai:streamError', 'AI服务未配置，请先配置AI设置');
            return { success: false };
          }
        }

        await aiService.streamGenerate(prompt, {
          ...options,
          stream: true,
          onChunk: (chunk: AIStreamChunk) => {
            event.sender.send('ai:streamChunk', chunk);
          },
          onError: (error) => {
            event.sender.send('ai:streamError', error.message);
          },
          onComplete: () => {
            event.sender.send('ai:streamComplete');
          },
        });

        return { success: true };
      } catch (error) {
        event.sender.send('ai:streamError', error instanceof Error ? error.message : 'AI生成失败');
        return { success: false };
      }
    }
  );

  // 终止流式生成
  ipcMain.handle(
    IPC_CHANNELS.AI.ABORT,
    async () => {
      try {
        aiService.abort();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '终止生成失败',
        };
      }
    }
  );

  // 测试AI连接
  ipcMain.handle(
    IPC_CHANNELS.AI.TEST_CONNECTION,
    async (_event, settings?: AISettings) => {
      try {
        // 如果提供了设置，使用提供的设置进行测试
        if (settings) {
          const tempService = new AIService();
          tempService.initialize(settings);
          const result = await tempService.testConnection();
          return result;
        }

        // 否则使用当前配置
        if (!aiService.isInitialized()) {
          const savedSettings = await getAISettings();
          if (savedSettings.success && savedSettings.data) {
            aiService.initialize(savedSettings.data);
          } else {
            return {
              success: false,
              message: 'AI服务未配置',
              latency: 0,
              modelAvailable: false,
            };
          }
        }

        return await aiService.testConnection();
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '测试连接失败',
          latency: 0,
          modelAvailable: false,
        };
      }
    }
  );

  // 获取可用模型列表
  ipcMain.handle(
    IPC_CHANNELS.AI.GET_MODELS,
    async (_event, settings?: AISettings) => {
      try {
        if (settings) {
          const tempService = new AIService();
          tempService.initialize(settings);
          const models = await tempService.getAvailableModels();
          return { success: true, data: models };
        }

        if (!aiService.isInitialized()) {
          const savedSettings = await getAISettings();
          if (savedSettings.success && savedSettings.data) {
            aiService.initialize(savedSettings.data);
          } else {
            return { success: false, error: 'AI服务未配置' };
          }
        }

        const models = await aiService.getAvailableModels();
        return { success: true, data: models };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取模型列表失败',
        };
      }
    }
  );

  // 获取支持的提供商列表
  ipcMain.handle(
    IPC_CHANNELS.AI.GET_PROVIDERS,
    async () => {
      const providers = AIService.getSupportedProviders();
      return { success: true, data: providers };
    }
  );

  // 获取提供商默认基础URL
  ipcMain.handle(
    IPC_CHANNELS.AI.GET_DEFAULT_BASE_URL,
    async (_event, provider: string) => {
      const baseUrl = AIService.getDefaultBaseUrl(provider as any);
      return { success: true, data: baseUrl };
    }
  );

  // 获取提供商默认模型
  ipcMain.handle(
    IPC_CHANNELS.AI.GET_DEFAULT_MODEL,
    async (_event, provider: string) => {
      const model = AIService.getDefaultModel(provider as any);
      return { success: true, data: model };
    }
  );
}

/**
 * 注销所有 IPC 处理器
 */
export function unregisterIpcHandlers(): void {
  // 作品
  ipcMain.removeHandler(IPC_CHANNELS.NOVEL.CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.NOVEL.LIST);
  ipcMain.removeHandler(IPC_CHANNELS.NOVEL.GET);
  ipcMain.removeHandler(IPC_CHANNELS.NOVEL.UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.NOVEL.DELETE);

  // 章节
  ipcMain.removeHandler(IPC_CHANNELS.CHAPTER.CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.CHAPTER.LIST);
  ipcMain.removeHandler(IPC_CHANNELS.CHAPTER.GET);
  ipcMain.removeHandler(IPC_CHANNELS.CHAPTER.UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.CHAPTER.DELETE);

  // 卷
  ipcMain.removeHandler(IPC_CHANNELS.VOLUME.CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.VOLUME.LIST);
  ipcMain.removeHandler(IPC_CHANNELS.VOLUME.GET);
  ipcMain.removeHandler(IPC_CHANNELS.VOLUME.UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.VOLUME.DELETE);

  // 设置
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.GET_APP);
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.SAVE_APP);
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.GET_AI);
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS.SAVE_AI);

  // 导入导出
  ipcMain.removeHandler(IPC_CHANNELS.EXPORT);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_BATCH);
  ipcMain.removeHandler(IPC_CHANNELS.IMPORT_PREVIEW);

  // 存储
  ipcMain.removeHandler(IPC_CHANNELS.STORAGE.GET_STATS);
  ipcMain.removeHandler(IPC_CHANNELS.STORAGE.GET_PATH);
  ipcMain.removeHandler(IPC_CHANNELS.STORAGE.OPEN_FOLDER);

  // 对话框
  ipcMain.removeHandler(IPC_CHANNELS.DIALOG.SHOW_SAVE);
  ipcMain.removeHandler(IPC_CHANNELS.DIALOG.SHOW_OPEN);
  ipcMain.removeHandler(IPC_CHANNELS.DIALOG.SHOW_MESSAGE);

  // AI
  ipcMain.removeHandler(IPC_CHANNELS.AI.GENERATE);
  ipcMain.removeHandler(IPC_CHANNELS.AI.STREAM_GENERATE);
  ipcMain.removeHandler(IPC_CHANNELS.AI.ABORT);
  ipcMain.removeHandler(IPC_CHANNELS.AI.TEST_CONNECTION);
  ipcMain.removeHandler(IPC_CHANNELS.AI.GET_MODELS);
  ipcMain.removeHandler(IPC_CHANNELS.AI.GET_PROVIDERS);
  ipcMain.removeHandler(IPC_CHANNELS.AI.GET_DEFAULT_BASE_URL);
  ipcMain.removeHandler(IPC_CHANNELS.AI.GET_DEFAULT_MODEL);
}
