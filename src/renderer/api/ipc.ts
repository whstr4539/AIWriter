/**
 * 渲染进程 IPC API 封装
 * 用于与主进程通信
 */

import type {
  Novel,
  Volume,
  Chapter,
  ChapterInfo,
  AppSettings,
  AISettings,
  ExportOptions,
  ImportResult,
  FileOperationResult,
  StorageStats,
  AIProvider,
  AIModelInfo,
  ImportPreview,
} from '../../types/novel';
import { mockElectronAPI, initMockData } from './mockElectron';

// 检查是否在 Electron 环境中
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;

// 如果不是 Electron 环境，使用 mock API
if (!isElectron) {
  console.log('不在 Electron 环境中，使用 Mock API');
  initMockData();
  (window as any).electron = mockElectronAPI;
}

const ipcRenderer = window.electron;

// IPC 通道名称（必须与主进程定义的一致）
const IPC_CHANNELS = {
  NOVEL: {
    CREATE: 'novel:create',
    LIST: 'novel:list',
    GET: 'novel:get',
    UPDATE: 'novel:update',
    DELETE: 'novel:delete',
  },
  CHAPTER: {
    CREATE: 'chapter:create',
    LIST: 'chapter:list',
    GET: 'chapter:get',
    UPDATE: 'chapter:update',
    DELETE: 'chapter:delete',
  },
  VOLUME: {
    CREATE: 'volume:create',
    LIST: 'volume:list',
    GET: 'volume:get',
    UPDATE: 'volume:update',
    DELETE: 'volume:delete',
  },
  SETTINGS: {
    GET_APP: 'settings:getApp',
    SAVE_APP: 'settings:saveApp',
    GET_AI: 'settings:getAI',
    SAVE_AI: 'settings:saveAI',
  },
  EXPORT: 'export:novel',
  IMPORT: 'import:novel',
  IMPORT_BATCH: 'import:batch',
  IMPORT_PREVIEW: 'import:preview',
  STORAGE: {
    GET_STATS: 'storage:getStats',
    GET_PATH: 'storage:getPath',
    OPEN_FOLDER: 'storage:openFolder',
  },
  DIALOG: {
    SHOW_SAVE: 'dialog:showSave',
    SHOW_OPEN: 'dialog:showOpen',
    SHOW_MESSAGE: 'dialog:showMessage',
  },
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

// ==================== 作品 API ====================

export const novelApi = {
  /**
   * 创建新作品
   */
  create: (
    title: string,
    author?: string,
    description?: string
  ): Promise<FileOperationResult<Novel>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOVEL.CREATE, title, author, description);
  },

  /**
   * 获取作品列表
   */
  getList: (): Promise<FileOperationResult<Novel[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOVEL.LIST);
  },

  /**
   * 获取单个作品
   */
  get: (novelId: string): Promise<FileOperationResult<Novel>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOVEL.GET, novelId);
  },

  /**
   * 更新作品信息
   */
  update: (
    novelId: string,
    updates: Partial<Novel>
  ): Promise<FileOperationResult<Novel>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOVEL.UPDATE, novelId, updates);
  },

  /**
   * 删除作品
   */
  delete: (novelId: string): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOVEL.DELETE, novelId);
  },
};

// ==================== 章节 API ====================

export const chapterApi = {
  /**
   * 创建章节
   */
  create: (
    novelId: string,
    title: string,
    order?: number,
    volumeId?: string
  ): Promise<FileOperationResult<Chapter>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAPTER.CREATE, novelId, title, order, volumeId);
  },

  /**
   * 获取章节列表
   */
  getList: (novelId: string): Promise<FileOperationResult<ChapterInfo[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAPTER.LIST, novelId);
  },

  /**
   * 获取单个章节
   */
  get: (novelId: string, chapterId: string): Promise<FileOperationResult<Chapter>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAPTER.GET, novelId, chapterId);
  },

  /**
   * 更新章节
   */
  update: (
    novelId: string,
    chapterId: string,
    updates: Partial<Chapter>
  ): Promise<FileOperationResult<Chapter>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAPTER.UPDATE, novelId, chapterId, updates);
  },

  /**
   * 删除章节
   */
  delete: (novelId: string, chapterId: string): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAPTER.DELETE, novelId, chapterId);
  },
};

// ==================== 卷 API ====================

export const volumeApi = {
  create: (novelId: string, title: string, order?: number): Promise<FileOperationResult<Volume>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VOLUME.CREATE, novelId, title, order);
  },

  getList: (novelId: string): Promise<FileOperationResult<Volume[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VOLUME.LIST, novelId);
  },

  get: (novelId: string, volumeId: string): Promise<FileOperationResult<Volume>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VOLUME.GET, novelId, volumeId);
  },

  update: (novelId: string, volumeId: string, updates: Partial<Volume>): Promise<FileOperationResult<Volume>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VOLUME.UPDATE, novelId, volumeId, updates);
  },

  delete: (novelId: string, volumeId: string): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VOLUME.DELETE, novelId, volumeId);
  },
};

// ==================== 设置 API ====================

export const settingsApi = {
  /**
   * 获取应用设置
   */
  getApp: (): Promise<FileOperationResult<AppSettings>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_APP);
  },

  /**
   * 保存应用设置
   */
  saveApp: (settings: AppSettings): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SAVE_APP, settings);
  },

  /**
   * 获取AI设置
   */
  getAI: (): Promise<FileOperationResult<AISettings>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_AI);
  },

  /**
   * 保存AI设置
   */
  saveAI: (settings: AISettings): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SAVE_AI, settings);
  },
};

// ==================== 导入导出 API ====================

export const exportImportApi = {
  /**
   * 导出作品
   */
  export: (
    novelId: string,
    options: ExportOptions,
    exportPath: string
  ): Promise<FileOperationResult<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT, novelId, options, exportPath);
  },

  /**
   * 导入作品
   */
  import: (
    importPath: string,
    title?: string
  ): Promise<FileOperationResult<ImportResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT, importPath, title);
  },

  /**
   * 批量导入作品
   */
  batchImport: (
    importPaths: string[]
  ): Promise<FileOperationResult<{ success: number; failed: number; errors: string[] }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_BATCH, importPaths);
  },

  /**
   * 预览导入文件
   */
  previewImport: (importPath: string): Promise<FileOperationResult<ImportPreview>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PREVIEW, importPath);
  },
};

// ==================== 存储 API ====================

export const storageApi = {
  /**
   * 获取存储统计信息
   */
  getStats: (): Promise<FileOperationResult<StorageStats>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORAGE.GET_STATS);
  },

  /**
   * 获取存储路径
   */
  getPath: (): Promise<FileOperationResult<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORAGE.GET_PATH);
  },

  /**
   * 打开存储文件夹
   */
  openFolder: (): Promise<FileOperationResult<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORAGE.OPEN_FOLDER);
  },
};

// ==================== 对话框 API ====================

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  message?: string;
  nameFieldLabel?: string;
  showsTagField?: boolean;
  properties?: string[];
  securityScopedBookmarks?: boolean;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: string[];
  message?: string;
  securityScopedBookmarks?: boolean;
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  cancelId?: number;
  noLink?: boolean;
  normalizeAccessKeys?: boolean;
}

export interface MessageBoxReturnValue {
  response: number;
  checkboxChecked: boolean;
}

export const dialogApi = {
  /**
   * 显示保存对话框
   */
  showSave: (
    options: SaveDialogOptions
  ): Promise<{ success: boolean; data?: string; canceled?: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG.SHOW_SAVE, options);
  },

  /**
   * 显示打开对话框
   */
  showOpen: (
    options: OpenDialogOptions
  ): Promise<{ success: boolean; data?: string[]; canceled?: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG.SHOW_OPEN, options);
  },

  /**
   * 显示消息对话框
   */
  showMessage: (
    options: MessageBoxOptions
  ): Promise<{ success: boolean; data: MessageBoxReturnValue }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG.SHOW_MESSAGE, options);
  },
};

// ==================== AI API ====================

export interface AIStreamChunk {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIGenerateResult {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AITestResult {
  success: boolean;
  message: string;
  latency: number;
  modelAvailable: boolean;
  models?: AIModelInfo[];
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
}

export interface StreamGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
  onChunk: (chunk: AIStreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

const STREAM_EVENTS = {
  CHUNK: 'ai:streamChunk',
  ERROR: 'ai:streamError',
  COMPLETE: 'ai:streamComplete',
};

export const aiApi = {
  generate: (
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    }
  ): Promise<AIGenerateResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.GENERATE, prompt, options);
  },

  /**
   * Streaming generate with automatic event listener setup/teardown.
   */
  streamGenerate: async (
    prompt: string,
    options: StreamGenerateOptions
  ): Promise<void> => {
    const { onChunk, onError, onComplete, ...generateOptions } = options;

    const chunkHandler = (_event: any, chunk: AIStreamChunk) => onChunk(chunk);
    const errorHandler = (_event: any, error: string) => {
      cleanup();
      onError?.(error);
    };
    const completeHandler = () => {
      cleanup();
      onComplete?.();
    };

    const cleanup = () => {
      ipcRenderer.removeListener(STREAM_EVENTS.CHUNK, chunkHandler);
      ipcRenderer.removeListener(STREAM_EVENTS.ERROR, errorHandler);
      ipcRenderer.removeListener(STREAM_EVENTS.COMPLETE, completeHandler);
    };

    ipcRenderer.on(STREAM_EVENTS.CHUNK, chunkHandler);
    ipcRenderer.on(STREAM_EVENTS.ERROR, errorHandler);
    ipcRenderer.on(STREAM_EVENTS.COMPLETE, completeHandler);

    try {
      await ipcRenderer.invoke(IPC_CHANNELS.AI.STREAM_GENERATE, prompt, generateOptions);
    } catch (error) {
      cleanup();
      throw error;
    }
  },

  /**
   * 终止当前正在进行的流式生成
   */
  stopGenerate: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.ABORT);
  },

  testConnection: (settings?: AISettings): Promise<AITestResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.TEST_CONNECTION, settings);
  },

  getModels: (
    settings?: AISettings
  ): Promise<FileOperationResult<AIModelInfo[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.GET_MODELS, settings);
  },

  getProviders: (): Promise<FileOperationResult<ProviderInfo[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.GET_PROVIDERS);
  },

  /**
   * 获取提供商默认基础URL
   */
  getDefaultBaseUrl: (
    provider: AIProvider
  ): Promise<FileOperationResult<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.GET_DEFAULT_BASE_URL, provider);
  },

  /**
   * 获取提供商默认模型
   */
  getDefaultModel: (
    provider: AIProvider
  ): Promise<FileOperationResult<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AI.GET_DEFAULT_MODEL, provider);
  },
};

// ==================== 导出所有 API ====================

export const api = {
  novel: novelApi,
  chapter: chapterApi,
  volume: volumeApi,
  settings: settingsApi,
  exportImport: exportImportApi,
  storage: storageApi,
  dialog: dialogApi,
  ai: aiApi,
};

export default api;
