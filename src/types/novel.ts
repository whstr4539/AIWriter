/**
 * 小说/作品相关数据模型类型定义
 * 共享类型 - 主进程和渲染进程共用
 */

// 作品状态
export type NovelStatus = 'draft' | 'writing' | 'completed' | 'archived';

// 章节状态
export type ChapterStatus = 'draft' | 'writing' | 'completed' | 'revised';

// 作品元数据
export interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  cover?: string;
  status: NovelStatus;
  wordCount: number;
  chapterCount: number;
  volumeCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  genre?: string;
  targetWordCount?: number;
  lastChapterId?: string;
  outline?: string;
}

// 卷
export interface Volume {
  id: string;
  novelId: string;
  title: string;
  order: number;
  description?: string;
  outline?: string;
  createdAt: string;
  updatedAt: string;
}

// 章节信息（用于列表展示）
export interface ChapterInfo {
  id: string;
  novelId: string;
  volumeId?: string;
  title: string;
  order: number;
  status: ChapterStatus;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  outline?: string;
}

// 章节完整内容
export interface Chapter extends ChapterInfo {
  content: string;
  notes?: string;
  aiGenerated?: boolean;
  aiPrompt?: string;
}

// 作品设置
export interface NovelSettings {
  autoSave: boolean;
  autoSaveInterval: number; // 分钟
  defaultFontSize: number;
  defaultFontFamily: string;
  theme: 'light' | 'dark' | 'sepia';
  showWordCount: boolean;
  enableSpellCheck: boolean;
}

// 应用设置
export interface AppSettings {
  language: 'zh-CN' | 'zh-TW' | 'en';
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  recentNovels: string[]; // 最近打开的作品ID列表
  maxRecentNovels: number;
  backupEnabled: boolean;
  backupInterval: number; // 小时
  backupCount: number;
}

// AI 提供商类型
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'aliyun'
  | 'baidu'
  | 'bytedance'
  | 'zhipu'
  | 'custom';

// AI 提供商配置
export interface AIProviderConfig {
  name: string;
  label: string;
  defaultBaseUrl: string;
  models: AIModelInfo[];
  requireApiKey: boolean;
}

// AI 模型信息
export interface AIModelInfo {
  id: string;
  name: string;
  description?: string;
  maxTokens: number;        // 上下文窗口大小
  maxOutputTokens?: number;  // 最大输出 token 数（不填则默认 4096）
  supportsVision?: boolean;
}

// AI 设置
export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  apiKeyEncrypted?: boolean;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  // 自定义提供商设置
  customProviderName?: string;
}

// 编辑器设置
export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number; // 分钟
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  enableSpellCheck: boolean;
  enableMarkdownPreview: boolean;
  toolbarVisible: boolean;
  defaultWritingMode: 'normal' | 'focus';
}

// 导出格式
export type ExportFormat = 'json' | 'md' | 'txt' | 'docx';

// 导出范围
export type ExportScope = 'all' | 'selected';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  selectedChapters?: string[]; // 选中的章节ID列表
  includeTitle: boolean;
  includeAuthor: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
  chapterSeparator: string;
  encoding: 'utf8' | 'gbk';
  compress: boolean; // 是否压缩为zip
}

// 导入文件类型
export type ImportFileType = 'json' | 'md' | 'txt' | 'zip';

// 导入预览信息
export interface ImportPreview {
  title: string;
  author?: string;
  description?: string;
  chapterCount: number;
  wordCount: number;
  chapters?: Array<{
    title: string;
    order: number;
    preview?: string;
  }>;
}

// 导入冲突处理策略
export type ImportConflictStrategy = 'skip' | 'overwrite' | 'rename';

// 导入结果
export interface ImportResult {
  success: boolean;
  novel?: Novel;
  chapters?: ChapterInfo[];
  importedCount?: number;
  skippedCount?: number;
  error?: string;
}

// 导出进度
export interface ExportProgress {
  total: number;
  current: number;
  stage: 'preparing' | 'exporting' | 'compressing' | 'completed';
  message: string;
}

// 导入进度
export interface ImportProgress {
  total: number;
  current: number;
  stage: 'reading' | 'parsing' | 'importing' | 'completed';
  message: string;
}

// 文件操作结果
export interface FileOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 存储统计信息
export interface StorageStats {
  totalNovels: number;
  totalChapters: number;
  totalWordCount: number;
  storageSize: number; // 字节
  lastBackupAt?: string;
}

// 自动保存状态
export interface AutoSaveState {
  isSaving: boolean;
  lastSavedAt?: string;
  hasUnsavedChanges: boolean;
  pendingChanges: boolean;
}

// AI 连接测试结果
export interface AITestResult {
  success: boolean;
  message: string;
  latency?: number;
  modelAvailable?: boolean;
}
