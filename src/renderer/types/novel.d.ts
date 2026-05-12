/**
 * 小说/作品相关数据模型类型定义
 */
export type NovelStatus = 'draft' | 'writing' | 'completed' | 'archived';
export type ChapterStatus = 'draft' | 'writing' | 'completed' | 'revised';
export interface Novel {
    id: string;
    title: string;
    author: string;
    description: string;
    cover?: string;
    status: NovelStatus;
    wordCount: number;
    chapterCount: number;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    genre?: string;
    targetWordCount?: number;
}
export interface ChapterInfo {
    id: string;
    novelId: string;
    title: string;
    order: number;
    status: ChapterStatus;
    wordCount: number;
    createdAt: string;
    updatedAt: string;
    summary?: string;
}
export interface Chapter extends ChapterInfo {
    content: string;
    notes?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
}
export interface NovelSettings {
    autoSave: boolean;
    autoSaveInterval: number;
    defaultFontSize: number;
    defaultFontFamily: string;
    theme: 'light' | 'dark' | 'sepia';
    showWordCount: boolean;
    enableSpellCheck: boolean;
}
export interface AppSettings {
    language: 'zh-CN' | 'zh-TW' | 'en';
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    recentNovels: string[];
    maxRecentNovels: number;
    backupEnabled: boolean;
    backupInterval: number;
    backupCount: number;
}
export interface AISettings {
    provider: 'openai' | 'azure' | 'custom';
    apiKey?: string;
    apiEndpoint?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
}
export interface ExportOptions {
    format: 'txt' | 'md' | 'docx' | 'epub' | 'pdf';
    includeTitle: boolean;
    includeAuthor: boolean;
    includeSummary: boolean;
    chapterSeparator: string;
    encoding: 'utf8' | 'gbk';
}
export interface ImportResult {
    success: boolean;
    novel?: Novel;
    chapters?: ChapterInfo[];
    error?: string;
}
export interface FileOperationResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface StorageStats {
    totalNovels: number;
    totalChapters: number;
    totalWordCount: number;
    storageSize: number;
    lastBackupAt?: string;
}
export interface AutoSaveState {
    isSaving: boolean;
    lastSavedAt?: string;
    hasUnsavedChanges: boolean;
    pendingChanges: boolean;
}
//# sourceMappingURL=novel.d.ts.map