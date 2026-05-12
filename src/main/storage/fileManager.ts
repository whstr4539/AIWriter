/**
 * 文件系统操作管理器
 * 负责作品的创建、读取、更新、删除等操作
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
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
  ImportPreview,
  ImportFileType,
} from '../../types/novel';
import { secureStoreApiKey, secureRetrieveApiKey } from '../utils/crypto';

// 存储路径配置
const getStoragePaths = () => {
  const userDataPath = app.getPath('userData');
  return {
    basePath: path.join(userDataPath, 'novels'),
    settingsPath: path.join(userDataPath, 'settings.json'),
    aiSettingsPath: path.join(userDataPath, 'ai-settings.json'),
    backupPath: path.join(userDataPath, 'backups'),
  };
};

// 确保目录存在
const ensureDir = async (dirPath: string): Promise<void> => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// 生成唯一ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 统计字数
const countWords = (content: string): number => {
  // 中文字符 + 英文单词
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
};

// ==================== 作品操作 ====================

/**
 * 创建新作品
 */
export const createNovel = async (
  title: string,
  author: string = '',
  description: string = ''
): Promise<FileOperationResult<Novel>> => {
  try {
    const { basePath } = getStoragePaths();
    await ensureDir(basePath);

    const novelId = generateId();
    const novelDir = path.join(basePath, novelId);
    const chaptersDir = path.join(novelDir, 'chapters');
    const volumesDir = path.join(novelDir, 'volumes');

    await fs.mkdir(novelDir, { recursive: true });
    await fs.mkdir(chaptersDir, { recursive: true });
    await fs.mkdir(volumesDir, { recursive: true });

    const now = new Date().toISOString();
    const novel: Novel = {
      id: novelId,
      title,
      author,
      description,
      outline: '',
      status: 'draft',
      wordCount: 0,
      chapterCount: 0,
      volumeCount: 0,
      createdAt: now,
      updatedAt: now,
      tags: [],
    };

    await fs.writeFile(
      path.join(novelDir, 'meta.json'),
      JSON.stringify(novel, null, 2),
      'utf-8'
    );

    return { success: true, data: novel };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建作品失败',
    };
  }
};

/**
 * 获取作品列表
 */
export const getNovelList = async (): Promise<FileOperationResult<Novel[]>> => {
  try {
    const { basePath } = getStoragePaths();
    await ensureDir(basePath);

    const novels: Novel[] = [];
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metaPath = path.join(basePath, entry.name, 'meta.json');
          const metaContent = await fs.readFile(metaPath, 'utf-8');
          const novel: Novel = JSON.parse(metaContent);
          novels.push(novel);
        } catch {
          // 跳过无效的作品目录
          continue;
        }
      }
    }

    // 按更新时间排序
    novels.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return { success: true, data: novels };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取作品列表失败',
    };
  }
};

/**
 * 获取单个作品
 */
export const getNovel = async (
  novelId: string
): Promise<FileOperationResult<Novel>> => {
  try {
    const { basePath } = getStoragePaths();
    const metaPath = path.join(basePath, novelId, 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const novel: Novel = JSON.parse(metaContent);
    return { success: true, data: novel };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取作品失败',
    };
  }
};

/**
 * 更新作品信息
 */
export const updateNovel = async (
  novelId: string,
  updates: Partial<Novel>
): Promise<FileOperationResult<Novel>> => {
  try {
    const { basePath } = getStoragePaths();
    const metaPath = path.join(basePath, novelId, 'meta.json');

    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const novel: Novel = JSON.parse(metaContent);

    const updatedNovel: Novel = {
      ...novel,
      ...updates,
      id: novel.id, // 防止ID被修改
      createdAt: novel.createdAt, // 防止创建时间被修改
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      metaPath,
      JSON.stringify(updatedNovel, null, 2),
      'utf-8'
    );

    return { success: true, data: updatedNovel };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新作品失败',
    };
  }
};

/**
 * 删除作品
 */
export const deleteNovel = async (
  novelId: string
): Promise<FileOperationResult<void>> => {
  try {
    const { basePath } = getStoragePaths();
    const novelDir = path.join(basePath, novelId);
    await fs.rm(novelDir, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除作品失败',
    };
  }
};

// ==================== 章节操作 ====================

/**
 * 获取章节列表
 */
export const getChapterList = async (
  novelId: string
): Promise<FileOperationResult<ChapterInfo[]>> => {
  try {
    const { basePath } = getStoragePaths();
    const chaptersDir = path.join(basePath, novelId, 'chapters');
    await ensureDir(chaptersDir);

    const chapters: ChapterInfo[] = [];
    const entries = await fs.readdir(chaptersDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const chapterPath = path.join(chaptersDir, entry.name);
          const chapterContent = await fs.readFile(chapterPath, 'utf-8');
          const chapter: Chapter = JSON.parse(chapterContent);
          chapters.push({
            id: chapter.id,
            novelId: chapter.novelId,
            volumeId: chapter.volumeId,
            title: chapter.title,
            order: chapter.order,
            status: chapter.status,
            wordCount: chapter.wordCount,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
            summary: chapter.summary,
          });
        } catch {
          continue;
        }
      }
    }

    // 按顺序排序
    chapters.sort((a, b) => a.order - b.order);

    return { success: true, data: chapters };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取章节列表失败',
    };
  }
};

/**
 * 获取单个章节
 */
export const getChapter = async (
  novelId: string,
  chapterId: string
): Promise<FileOperationResult<Chapter>> => {
  try {
    const { basePath } = getStoragePaths();
    const chapterPath = path.join(basePath, novelId, 'chapters', `${chapterId}.json`);
    const chapterContent = await fs.readFile(chapterPath, 'utf-8');
    const chapter: Chapter = JSON.parse(chapterContent);
    return { success: true, data: chapter };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取章节失败',
    };
  }
};

/**
 * 创建章节
 */
export const createChapter = async (
  novelId: string,
  title: string,
  order?: number,
  volumeId?: string
): Promise<FileOperationResult<Chapter>> => {
  try {
    const { basePath } = getStoragePaths();
    const chaptersDir = path.join(basePath, novelId, 'chapters');
    await ensureDir(chaptersDir);

    let chapterOrder = order;
    if (chapterOrder === undefined) {
      const existingChapters = await getChapterList(novelId);
      if (existingChapters.success && existingChapters.data) {
        chapterOrder = existingChapters.data.length + 1;
      } else {
        chapterOrder = 1;
      }
    }

    const chapterId = generateId();
    const now = new Date().toISOString();
    const chapter: Chapter = {
      id: chapterId,
      novelId,
      volumeId,
      title,
      outline: '',
      order: chapterOrder,
      status: 'draft',
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
      content: '',
    };

    await fs.writeFile(
      path.join(chaptersDir, `${chapterId}.json`),
      JSON.stringify(chapter, null, 2),
      'utf-8'
    );

    // 更新作品章节数
    const novelResult = await getNovel(novelId);
    if (novelResult.success && novelResult.data) {
      await updateNovel(novelId, {
        chapterCount: novelResult.data.chapterCount + 1,
      });
    }

    return { success: true, data: chapter };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建章节失败',
    };
  }
};

/**
 * 更新章节
 */
export const updateChapter = async (
  novelId: string,
  chapterId: string,
  updates: Partial<Chapter>
): Promise<FileOperationResult<Chapter>> => {
  try {
    const { basePath } = getStoragePaths();
    const chapterPath = path.join(basePath, novelId, 'chapters', `${chapterId}.json`);

    const chapterContent = await fs.readFile(chapterPath, 'utf-8');
    const chapter: Chapter = JSON.parse(chapterContent);

    const newContent = updates.content !== undefined ? updates.content : chapter.content;
    const wordCount = countWords(newContent);

    const updatedChapter: Chapter = {
      ...chapter,
      ...updates,
      id: chapter.id,
      novelId: chapter.novelId,
      createdAt: chapter.createdAt,
      wordCount,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      chapterPath,
      JSON.stringify(updatedChapter, null, 2),
      'utf-8'
    );

    // 更新作品字数统计
    await recalculateNovelStats(novelId);

    return { success: true, data: updatedChapter };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新章节失败',
    };
  }
};

/**
 * 删除章节
 */
export const deleteChapter = async (
  novelId: string,
  chapterId: string
): Promise<FileOperationResult<void>> => {
  try {
    const { basePath } = getStoragePaths();
    const chapterPath = path.join(basePath, novelId, 'chapters', `${chapterId}.json`);
    await fs.unlink(chapterPath);

    // 重新排序剩余章节
    const chaptersResult = await getChapterList(novelId);
    if (chaptersResult.success && chaptersResult.data) {
      const chapters = chaptersResult.data.sort((a, b) => a.order - b.order);
      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].order !== i + 1) {
          const fullChapter = await getChapter(novelId, chapters[i].id);
          if (fullChapter.success && fullChapter.data) {
            await updateChapter(novelId, chapters[i].id, { order: i + 1 });
          }
        }
      }
    }

    // 更新作品章节数
    const novelResult = await getNovel(novelId);
    if (novelResult.success && novelResult.data) {
      await updateNovel(novelId, {
        chapterCount: Math.max(0, novelResult.data.chapterCount - 1),
      });
    }

    await recalculateNovelStats(novelId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除章节失败',
    };
  }
};

/**
 * 重新计算作品统计信息
 */
const recalculateNovelStats = async (novelId: string): Promise<void> => {
  try {
    const chaptersResult = await getChapterList(novelId);
    if (!chaptersResult.success || !chaptersResult.data) return;

    let totalWordCount = 0;
    for (const chapterInfo of chaptersResult.data) {
      totalWordCount += chapterInfo.wordCount;
    }

    await updateNovel(novelId, {
      wordCount: totalWordCount,
      chapterCount: chaptersResult.data.length,
    });
  } catch {
    // 忽略错误
  }
};

// ==================== 卷操作 ====================

export const getVolumeList = async (
  novelId: string
): Promise<FileOperationResult<Volume[]>> => {
  try {
    const { basePath } = getStoragePaths();
    const volumesDir = path.join(basePath, novelId, 'volumes');
    await ensureDir(volumesDir);

    const volumes: Volume[] = [];
    const entries = await fs.readdir(volumesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const volPath = path.join(volumesDir, entry.name);
          const volContent = await fs.readFile(volPath, 'utf-8');
          volumes.push(JSON.parse(volContent));
        } catch {
          continue;
        }
      }
    }

    volumes.sort((a, b) => a.order - b.order);
    return { success: true, data: volumes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取卷列表失败',
    };
  }
};

export const createVolume = async (
  novelId: string,
  title: string,
  order?: number
): Promise<FileOperationResult<Volume>> => {
  try {
    const { basePath } = getStoragePaths();
    const volumesDir = path.join(basePath, novelId, 'volumes');
    await ensureDir(volumesDir);

    let volumeOrder = order;
    if (volumeOrder === undefined) {
      const existingResult = await getVolumeList(novelId);
      volumeOrder = (existingResult.data?.length || 0) + 1;
    }

    const volumeId = generateId();
    const now = new Date().toISOString();
    const volume: Volume = {
      id: volumeId,
      novelId,
      title,
      outline: '',
      order: volumeOrder,
      createdAt: now,
      updatedAt: now,
    };

    await fs.writeFile(
      path.join(volumesDir, `${volumeId}.json`),
      JSON.stringify(volume, null, 2),
      'utf-8'
    );

    const novelResult = await getNovel(novelId);
    if (novelResult.success && novelResult.data) {
      await updateNovel(novelId, {
        volumeCount: novelResult.data.volumeCount + 1,
      });
    }

    return { success: true, data: volume };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建卷失败',
    };
  }
};

export const updateVolume = async (
  novelId: string,
  volumeId: string,
  updates: Partial<Volume>
): Promise<FileOperationResult<Volume>> => {
  try {
    const { basePath } = getStoragePaths();
    const volumePath = path.join(basePath, novelId, 'volumes', `${volumeId}.json`);

    const content = await fs.readFile(volumePath, 'utf-8');
    const volume: Volume = JSON.parse(content);

    const updated: Volume = {
      ...volume,
      ...updates,
      id: volume.id,
      novelId: volume.novelId,
      createdAt: volume.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(volumePath, JSON.stringify(updated, null, 2), 'utf-8');
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新卷失败',
    };
  }
};

export const deleteVolume = async (
  novelId: string,
  volumeId: string
): Promise<FileOperationResult<void>> => {
  try {
    const { basePath } = getStoragePaths();
    const volumePath = path.join(basePath, novelId, 'volumes', `${volumeId}.json`);
    await fs.unlink(volumePath);

    const novelResult = await getNovel(novelId);
    if (novelResult.success && novelResult.data) {
      await updateNovel(novelId, {
        volumeCount: Math.max(0, novelResult.data.volumeCount - 1),
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除卷失败',
    };
  }
};

// ==================== 设置操作 ====================

/**
 * 获取应用设置
 */
export const getAppSettings = async (): Promise<FileOperationResult<AppSettings>> => {
  try {
    const { settingsPath } = getStoragePaths();
    const content = await fs.readFile(settingsPath, 'utf-8');
    const settings: AppSettings = JSON.parse(content);
    return { success: true, data: settings };
  } catch {
    // 返回默认设置
    const defaultSettings: AppSettings = {
      language: 'zh-CN',
      theme: 'system',
      sidebarCollapsed: false,
      recentNovels: [],
      maxRecentNovels: 10,
      backupEnabled: true,
      backupInterval: 24,
      backupCount: 5,
    };
    return { success: true, data: defaultSettings };
  }
};

/**
 * 保存应用设置
 */
export const saveAppSettings = async (
  settings: AppSettings
): Promise<FileOperationResult<void>> => {
  try {
    const { settingsPath } = getStoragePaths();
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存设置失败',
    };
  }
};

/**
 * 获取AI设置
 * 自动解密 API Key
 */
export const getAISettings = async (): Promise<FileOperationResult<AISettings>> => {
  try {
    const { aiSettingsPath } = getStoragePaths();
    const content = await fs.readFile(aiSettingsPath, 'utf-8');
    const settings: AISettings = JSON.parse(content);

    // 解密 API Key
    if (settings.apiKey) {
      try {
        settings.apiKey = secureRetrieveApiKey(settings.apiKey);
      } catch (error) {
        console.error('解密 API Key 失败:', error);
        // 如果解密失败，可能是旧格式，保留原值
      }
    }

    return { success: true, data: settings };
  } catch {
    // 返回默认设置
    const defaultSettings: AISettings = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
    };
    return { success: true, data: defaultSettings };
  }
};

/**
 * 保存AI设置
 * 自动加密 API Key
 */
export const saveAISettings = async (
  settings: AISettings
): Promise<FileOperationResult<void>> => {
  try {
    const { aiSettingsPath } = getStoragePaths();

    // 创建副本以避免修改原始对象
    const settingsToSave: AISettings = { ...settings };

    // 加密 API Key
    if (settingsToSave.apiKey) {
      settingsToSave.apiKey = secureStoreApiKey(settingsToSave.apiKey);
      settingsToSave.apiKeyEncrypted = true;
    }

    await fs.writeFile(aiSettingsPath, JSON.stringify(settingsToSave, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存AI设置失败',
    };
  }
};

// ==================== 导入导出操作 ====================

// 动态导入 archiver（ESM 模块）
const importArchiver = async () => {
  const { default: archiver } = await import('archiver');
  return archiver;
};

// 动态导入 extract-zip（ESM 模块）
const importExtractZip = async () => {
  const { default: extractZip } = await import('extract-zip');
  return extractZip;
};

/**
 * 导出作品为JSON格式（完整备份）
 */
const exportNovelAsJSON = async (
  novel: Novel,
  chapters: Chapter[],
  exportDir: string
): Promise<string> => {
  const exportData = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    novel,
    chapters,
  };

  const fileName = `${sanitizeFileName(novel.title)}.json`;
  const filePath = path.join(exportDir, fileName);

  await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  return filePath;
};

/**
 * 导出作品为Markdown格式
 */
const exportNovelAsMarkdown = async (
  novel: Novel,
  chapters: Chapter[],
  options: ExportOptions,
  exportDir: string
): Promise<string[]> => {
  const exportedFiles: string[] = [];

  // 导出为单个文件
  if (!options.compress) {
    let content = '';

    // 添加元数据
    if (options.includeMetadata) {
      content += '---\n';
      content += `title: ${novel.title}\n`;
      if (options.includeAuthor && novel.author) {
        content += `author: ${novel.author}\n`;
      }
      if (options.includeSummary && novel.description) {
        content += `description: ${novel.description}\n`;
      }
      content += `wordCount: ${novel.wordCount}\n`;
      content += `chapterCount: ${novel.chapterCount}\n`;
      content += `exportedAt: ${new Date().toISOString()}\n`;
      content += '---\n\n';
    }

    // 添加标题
    if (options.includeTitle) {
      content += `# ${novel.title}\n\n`;
    }

    // 添加作者
    if (options.includeAuthor && novel.author) {
      content += `**作者：**${novel.author}\n\n`;
    }

    // 添加简介
    if (options.includeSummary && novel.description) {
      content += `**简介：**${novel.description}\n\n`;
    }

    // 添加章节内容
    for (const chapter of chapters) {
      content += `## ${chapter.title}\n\n`;
      content += chapter.content;
      content += options.chapterSeparator;
    }

    const fileName = `${sanitizeFileName(novel.title)}.md`;
    const filePath = path.join(exportDir, fileName);
    await fs.writeFile(filePath, content, options.encoding as BufferEncoding);
    exportedFiles.push(filePath);
  } else {
    // 每个章节一个文件
    for (const chapter of chapters) {
      let content = '';

      if (options.includeTitle) {
        content += `# ${chapter.title}\n\n`;
      }

      content += chapter.content;

      const fileName = `${String(chapter.order).padStart(3, '0')}_${sanitizeFileName(chapter.title)}.md`;
      const filePath = path.join(exportDir, fileName);
      await fs.writeFile(filePath, content, options.encoding as BufferEncoding);
      exportedFiles.push(filePath);
    }

    // 导出元数据文件
    const metaContent = generateMetadataFile(novel, options);
    const metaPath = path.join(exportDir, 'README.md');
    await fs.writeFile(metaPath, metaContent, options.encoding as BufferEncoding);
    exportedFiles.push(metaPath);
  }

  return exportedFiles;
};

/**
 * 导出作品为TXT格式
 */
const exportNovelAsTXT = async (
  novel: Novel,
  chapters: Chapter[],
  options: ExportOptions,
  exportDir: string
): Promise<string[]> => {
  const exportedFiles: string[] = [];

  if (!options.compress) {
    // 导出为单个文件
    let content = '';

    // 添加标题
    if (options.includeTitle) {
      content += `${novel.title}\n`;
      content += '='.repeat(novel.title.length * 2) + '\n\n';
    }

    // 添加作者
    if (options.includeAuthor && novel.author) {
      content += `作者：${novel.author}\n\n`;
    }

    // 添加简介
    if (options.includeSummary && novel.description) {
      content += `简介：${novel.description}\n\n`;
    }

    // 添加章节内容
    for (const chapter of chapters) {
      content += `${chapter.title}\n`;
      content += '-'.repeat(chapter.title.length * 2) + '\n\n';
      content += stripHtml(chapter.content);
      content += options.chapterSeparator;
    }

    const fileName = `${sanitizeFileName(novel.title)}.txt`;
    const filePath = path.join(exportDir, fileName);
    await fs.writeFile(filePath, content, options.encoding as BufferEncoding);
    exportedFiles.push(filePath);
  } else {
    // 每个章节一个文件
    for (const chapter of chapters) {
      let content = '';

      if (options.includeTitle) {
        content += `${chapter.title}\n`;
        content += '-'.repeat(chapter.title.length * 2) + '\n\n';
      }

      content += stripHtml(chapter.content);

      const fileName = `${String(chapter.order).padStart(3, '0')}_${sanitizeFileName(chapter.title)}.txt`;
      const filePath = path.join(exportDir, fileName);
      await fs.writeFile(filePath, content, options.encoding as BufferEncoding);
      exportedFiles.push(filePath);
    }
  }

  return exportedFiles;
};

/**
 * 导出作品为DOCX格式（简化实现，实际应使用 docx 库）
 */
const exportNovelAsDOCX = async (
  novel: Novel,
  chapters: Chapter[],
  options: ExportOptions,
  exportDir: string
): Promise<string[]> => {
  // 由于 docx 库较大，这里先导出为 HTML 格式，用户可以手动转换
  // 实际项目中可以集成 docx 库
  const exportedFiles: string[] = [];

  let content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${novel.title}</title>
  <style>
    body { font-family: "SimSun", serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { text-align: center; font-size: 24pt; margin-bottom: 20px; }
    h2 { font-size: 16pt; margin-top: 30px; margin-bottom: 15px; }
    .author { text-align: center; color: #666; margin-bottom: 30px; }
    .description { text-align: justify; margin-bottom: 40px; padding: 20px; background: #f5f5f5; }
    p { text-indent: 2em; margin: 0.5em 0; }
  </style>
</head>
<body>
`;

  if (options.includeTitle) {
    content += `<h1>${novel.title}</h1>\n`;
  }

  if (options.includeAuthor && novel.author) {
    content += `<p class="author">作者：${novel.author}</p>\n`;
  }

  if (options.includeSummary && novel.description) {
    content += `<div class="description"><strong>简介：</strong>${novel.description}</div>\n`;
  }

  for (const chapter of chapters) {
    content += `<h2>${chapter.title}</h2>\n`;
    content += chapter.content
      .replace(/\n/g, '</p>\n<p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    content += '\n';
  }

  content += '</body>\n</html>';

  const fileName = `${sanitizeFileName(novel.title)}.html`;
  const filePath = path.join(exportDir, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  exportedFiles.push(filePath);

  return exportedFiles;
};

/**
 * 压缩文件为ZIP
 */
const compressToZip = async (
  sourceDir: string,
  outputPath: string
): Promise<void> => {
  const archiver = await importArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });

  const output = await fs.open(outputPath, 'w');
  const stream = output.createWriteStream();

  return new Promise((resolve, reject) => {
    archive.on('error', (err) => reject(err));
    archive.on('end', () => resolve());

    archive.pipe(stream);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};

/**
 * 导出作品
 */
export const exportNovel = async (
  novelId: string,
  options: ExportOptions,
  exportPath: string
): Promise<FileOperationResult<string>> => {
  try {
    const novelResult = await getNovel(novelId);
    if (!novelResult.success || !novelResult.data) {
      return { success: false, error: '作品不存在' };
    }

    const chaptersResult = await getChapterList(novelId);
    if (!chaptersResult.success || !chaptersResult.data) {
      return { success: false, error: '获取章节失败' };
    }

    const novel = novelResult.data;
    let chapterInfos = chaptersResult.data.sort((a, b) => a.order - b.order);

    // 如果只导出选中章节
    if (options.scope === 'selected' && options.selectedChapters) {
      chapterInfos = chapterInfos.filter(ch => options.selectedChapters?.includes(ch.id));
    }

    // 获取完整章节内容
    const chapters: Chapter[] = [];
    for (const chapterInfo of chapterInfos) {
      const chapterResult = await getChapter(novelId, chapterInfo.id);
      if (chapterResult.success && chapterResult.data) {
        chapters.push(chapterResult.data);
      }
    }

    // 创建临时导出目录
    const tempDir = path.join(app.getPath('temp'), `novel-export-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    let exportedFiles: string[] = [];

    // 根据格式导出
    switch (options.format) {
      case 'json':
        await exportNovelAsJSON(novel, chapters, tempDir);
        break;
      case 'md':
        exportedFiles = await exportNovelAsMarkdown(novel, chapters, options, tempDir);
        break;
      case 'txt':
        exportedFiles = await exportNovelAsTXT(novel, chapters, options, tempDir);
        break;
      case 'docx':
        exportedFiles = await exportNovelAsDOCX(novel, chapters, options, tempDir);
        break;
      default:
        return { success: false, error: '不支持的导出格式' };
    }

    // 如果需要压缩
    if (options.compress) {
      await compressToZip(tempDir, exportPath);
      // 清理临时目录
      await fs.rm(tempDir, { recursive: true, force: true });
    } else {
      // 移动文件到目标路径
      const stats = await fs.stat(exportPath);
      const isDirectory = stats.isDirectory();

      if (isDirectory) {
        // 如果目标是目录，复制所有文件
        for (const file of exportedFiles) {
          const fileName = path.basename(file);
          await fs.copyFile(file, path.join(exportPath, fileName));
        }
        await fs.rm(tempDir, { recursive: true, force: true });
      } else {
        // 如果目标是文件，移动第一个导出的文件
        await fs.rename(exportedFiles[0], exportPath);
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }

    return { success: true, data: exportPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
};

/**
 * 预览导入文件
 */
export const previewImportFile = async (
  importPath: string
): Promise<FileOperationResult<ImportPreview>> => {
  try {
    const ext = path.extname(importPath).toLowerCase();
    const content = await fs.readFile(importPath, 'utf-8');

    // JSON格式
    if (ext === '.json') {
      try {
        const data = JSON.parse(content);
        if (data.novel) {
          return {
            success: true,
            data: {
              title: data.novel.title || '未知作品',
              author: data.novel.author,
              description: data.novel.description,
              chapterCount: data.chapters?.length || 0,
              wordCount: data.novel.wordCount || 0,
              chapters: data.chapters?.map((ch: Chapter, index: number) => ({
                title: ch.title,
                order: ch.order || index + 1,
                preview: ch.content?.substring(0, 100) + '...',
              })),
            },
          };
        }
      } catch {
        // 不是我们的JSON格式
      }
    }

    // Markdown格式
    if (ext === '.md') {
      const lines = content.split('\n');
      let title = path.basename(importPath, '.md');
      let description = '';

      // 解析YAML frontmatter
      if (lines[0] === '---') {
        const endIndex = lines.indexOf('---', 1);
        if (endIndex > 0) {
          const frontmatter = lines.slice(1, endIndex).join('\n');
          const titleMatch = frontmatter.match(/title:\s*(.+)/);
          const authorMatch = frontmatter.match(/author:\s*(.+)/);
          const descMatch = frontmatter.match(/description:\s*(.+)/);

          if (titleMatch) title = titleMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
        }
      } else if (lines[0].startsWith('# ')) {
        title = lines[0].substring(2).trim();
      }

      // 估算章节数（通过 ## 标题）
      const chapterMatches = content.match(/^##\s+.+$/gm);
      const chapterCount = chapterMatches ? chapterMatches.length : 1;

      return {
        success: true,
        data: {
          title,
          description,
          chapterCount,
          wordCount: countWords(content),
        },
      };
    }

    // TXT格式
    if (ext === '.txt') {
      const lines = content.split('\n');
      let title = path.basename(importPath, '.txt');

      // 尝试从第一行获取标题
      if (lines[0] && !lines[0].startsWith('作者') && !lines[0].startsWith('简介')) {
        title = lines[0].trim();
      }

      // 估算章节数
      const chapterMatches = content.match(/^第[一二三四五六七八九十百千]+章|^第\d+章|^Chapter\s+\d+/gmi);
      const chapterCount = chapterMatches ? chapterMatches.length : 1;

      return {
        success: true,
        data: {
          title,
          chapterCount,
          wordCount: countWords(content),
        },
      };
    }

    return { success: false, error: '不支持的文件格式' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '预览导入文件失败',
    };
  }
};

/**
 * 从JSON导入
 */
const importFromJSON = async (
  content: string,
  title?: string
): Promise<FileOperationResult<ImportResult>> => {
  try {
    const data = JSON.parse(content);

    if (!data.novel) {
      return { success: false, error: '无效的JSON格式' };
    }

    const novelResult = await createNovel(
      title || data.novel.title || '导入作品',
      data.novel.author || '',
      data.novel.description || ''
    );

    if (!novelResult.success || !novelResult.data) {
      return { success: false, error: '创建作品失败' };
    }

    const novelId = novelResult.data.id;
    let importedCount = 0;

    // 导入章节
    if (data.chapters && Array.isArray(data.chapters)) {
      for (const chapterData of data.chapters) {
        const chapterResult = await createChapter(
          novelId,
          chapterData.title || `第${chapterData.order || importedCount + 1}章`,
          chapterData.order || importedCount + 1
        );

        if (chapterResult.success && chapterResult.data) {
          await updateChapter(novelId, chapterResult.data.id, {
            content: chapterData.content || '',
            status: chapterData.status || 'draft',
            summary: chapterData.summary,
          });
          importedCount++;
        }
      }
    }

    return {
      success: true,
      data: {
        success: true,
        novel: novelResult.data,
        importedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON导入失败',
    };
  }
};

/**
 * 从Markdown导入
 */
const importFromMarkdown = async (
  content: string,
  title?: string
): Promise<FileOperationResult<ImportResult>> => {
  try {
    const lines = content.split('\n');
    let novelTitle = title || '导入作品';
    let author = '';
    let description = '';
    let contentStartIndex = 0;

    // 解析YAML frontmatter
    if (lines[0] === '---') {
      const endIndex = lines.indexOf('---', 1);
      if (endIndex > 0) {
        const frontmatter = lines.slice(1, endIndex).join('\n');
        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const authorMatch = frontmatter.match(/author:\s*(.+)/);
        const descMatch = frontmatter.match(/description:\s*(.+)/);

        if (titleMatch) novelTitle = titleMatch[1].trim();
        if (authorMatch) author = authorMatch[1].trim();
        if (descMatch) description = descMatch[1].trim();
        contentStartIndex = endIndex + 1;
      }
    } else if (lines[0].startsWith('# ')) {
      novelTitle = lines[0].substring(2).trim();
      contentStartIndex = 1;
    }

    const novelResult = await createNovel(novelTitle, author, description);
    if (!novelResult.success || !novelResult.data) {
      return { success: false, error: '创建作品失败' };
    }

    const novelId = novelResult.data.id;

    // 解析章节（通过 ## 标题分割）
    const chaptersContent: Array<{ title: string; content: string }> = [];
    let currentChapter: { title: string; content: string } | null = null;

    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const chapterMatch = line.match(/^##\s+(.+)$/);

      if (chapterMatch) {
        if (currentChapter) {
          chaptersContent.push(currentChapter);
        }
        currentChapter = { title: chapterMatch[1].trim(), content: '' };
      } else if (currentChapter) {
        currentChapter.content += line + '\n';
      }
    }

    if (currentChapter) {
      chaptersContent.push(currentChapter);
    }

    // 如果没有找到章节，将整个内容作为第一章
    if (chaptersContent.length === 0) {
      chaptersContent.push({
        title: '第一章',
        content: lines.slice(contentStartIndex).join('\n'),
      });
    }

    // 创建章节
    let importedCount = 0;
    for (let i = 0; i < chaptersContent.length; i++) {
      const chapterData = chaptersContent[i];
      const chapterResult = await createChapter(novelId, chapterData.title, i + 1);

      if (chapterResult.success && chapterResult.data) {
        await updateChapter(novelId, chapterResult.data.id, {
          content: chapterData.content.trim(),
        });
        importedCount++;
      }
    }

    return {
      success: true,
      data: {
        success: true,
        novel: novelResult.data,
        importedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Markdown导入失败',
    };
  }
};

/**
 * 从TXT导入
 */
const importFromTXT = async (
  content: string,
  title?: string
): Promise<FileOperationResult<ImportResult>> => {
  try {
    const lines = content.split('\n');
    let novelTitle = title || '导入作品';

    // 尝试从第一行获取标题
    if (lines[0] && !lines[0].startsWith('作者') && !lines[0].startsWith('简介')) {
      novelTitle = lines[0].trim();
    }

    const novelResult = await createNovel(novelTitle);
    if (!novelResult.success || !novelResult.data) {
      return { success: false, error: '创建作品失败' };
    }

    const novelId = novelResult.data.id;

    // 解析章节（通过章节标题模式分割）
    const chapterPattern = /^第[一二三四五六七八九十百千]+章|^第\d+章|^Chapter\s+\d+/i;
    const chaptersContent: Array<{ title: string; content: string }> = [];
    let currentChapter: { title: string; content: string } | null = null;

    for (const line of lines) {
      if (chapterPattern.test(line.trim())) {
        if (currentChapter) {
          chaptersContent.push(currentChapter);
        }
        currentChapter = { title: line.trim(), content: '' };
      } else if (currentChapter) {
        currentChapter.content += line + '\n';
      }
    }

    if (currentChapter) {
      chaptersContent.push(currentChapter);
    }

    // 如果没有找到章节，将整个内容作为第一章
    if (chaptersContent.length === 0) {
      chaptersContent.push({
        title: '第一章',
        content: content,
      });
    }

    // 创建章节
    let importedCount = 0;
    for (let i = 0; i < chaptersContent.length; i++) {
      const chapterData = chaptersContent[i];
      const chapterResult = await createChapter(novelId, chapterData.title, i + 1);

      if (chapterResult.success && chapterResult.data) {
        await updateChapter(novelId, chapterResult.data.id, {
          content: chapterData.content.trim(),
        });
        importedCount++;
      }
    }

    return {
      success: true,
      data: {
        success: true,
        novel: novelResult.data,
        importedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'TXT导入失败',
    };
  }
};

/**
 * 从ZIP导入
 */
const importFromZIP = async (
  importPath: string,
  title?: string
): Promise<FileOperationResult<ImportResult>> => {
  try {
    const extractZip = await importExtractZip();
    const tempDir = path.join(app.getPath('temp'), `novel-import-${Date.now()}`);

    await fs.mkdir(tempDir, { recursive: true });
    await extractZip(importPath, { dir: tempDir });

    // 查找JSON文件
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    const jsonFile = entries.find(e => e.isFile() && e.name.endsWith('.json'));

    if (jsonFile) {
      const content = await fs.readFile(path.join(tempDir, jsonFile.name), 'utf-8');
      const result = await importFromJSON(content, title);
      await fs.rm(tempDir, { recursive: true, force: true });
      return result;
    }

    // 查找Markdown文件
    const mdFile = entries.find(e => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md');
    if (mdFile) {
      const content = await fs.readFile(path.join(tempDir, mdFile.name), 'utf-8');
      const result = await importFromMarkdown(content, title);
      await fs.rm(tempDir, { recursive: true, force: true });
      return result;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
    return { success: false, error: 'ZIP文件中未找到可导入的内容' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ZIP导入失败',
    };
  }
};

/**
 * 导入作品
 */
export const importNovel = async (
  importPath: string,
  title?: string
): Promise<FileOperationResult<ImportResult>> => {
  try {
    const ext = path.extname(importPath).toLowerCase();

    switch (ext) {
      case '.json':
        const jsonContent = await fs.readFile(importPath, 'utf-8');
        return await importFromJSON(jsonContent, title);
      case '.md':
        const mdContent = await fs.readFile(importPath, 'utf-8');
        return await importFromMarkdown(mdContent, title);
      case '.txt':
        const txtContent = await fs.readFile(importPath, 'utf-8');
        return await importFromTXT(txtContent, title);
      case '.zip':
        return await importFromZIP(importPath, title);
      default:
        return { success: false, error: '不支持的文件格式' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
    };
  }
};

/**
 * 批量导入作品
 */
export const batchImportNovels = async (
  importPaths: string[]
): Promise<FileOperationResult<{ success: number; failed: number; errors: string[] }>> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const importPath of importPaths) {
    const result = await importNovel(importPath);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`${path.basename(importPath)}: ${result.error}`);
    }
  }

  return { success: true, data: { success, failed, errors } };
};

// ==================== 工具函数 ====================

/**
 * 清理文件名中的非法字符
 */
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
};

/**
 * 去除HTML标签
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
};

/**
 * 生成元数据文件内容
 */
const generateMetadataFile = (novel: Novel, options: ExportOptions): string => {
  let content = `# ${novel.title}\n\n`;

  if (options.includeAuthor && novel.author) {
    content += `**作者：**${novel.author}\n\n`;
  }

  if (options.includeSummary && novel.description) {
    content += `**简介：**\n\n${novel.description}\n\n`;
  }

  content += '---\n\n';
  content += '## 章节列表\n\n';

  return content;
};

// ==================== 统计信息 ====================

/**
 * 获取存储统计信息
 */
export const getStorageStats = async (): Promise<FileOperationResult<StorageStats>> => {
  try {
    const { basePath } = getStoragePaths();
    await ensureDir(basePath);

    const novelsResult = await getNovelList();
    const novels = novelsResult.success ? novelsResult.data || [] : [];

    let totalChapters = 0;
    let totalWordCount = 0;

    for (const novel of novels) {
      totalChapters += novel.chapterCount;
      totalWordCount += novel.wordCount;
    }

    // 计算存储大小
    let storageSize = 0;
    const calculateDirSize = async (dirPath: string): Promise<number> => {
      let size = 0;
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            size += await calculateDirSize(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            size += stats.size;
          }
        }
      } catch {
        // 忽略错误
      }
      return size;
    };

    storageSize = await calculateDirSize(basePath);

    const stats: StorageStats = {
      totalNovels: novels.length,
      totalChapters,
      totalWordCount,
      storageSize,
    };

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取统计信息失败',
    };
  }
};

/**
 * 获取存储路径
 */
export const getStoragePath = (): string => {
  const { basePath } = getStoragePaths();
  return basePath;
};
