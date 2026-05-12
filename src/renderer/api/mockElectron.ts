import type { Novel, Chapter, Volume } from '../../types/novel';

interface MockStorage {
  novels: Map<string, Novel>;
  chapters: Map<string, Chapter>;
  volumes: Map<string, Volume>;
}

const mockStorage: MockStorage = {
  novels: new Map(),
  chapters: new Map(),
  volumes: new Map(),
};

const generateId = () => Math.random().toString(36).substring(2, 15);

export const mockElectronAPI = {
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    console.log('Mock IPC call:', channel, args);

    switch (channel) {
      case 'novel:create': {
        const [title, author, description] = args;
        const novel: Novel = {
          id: generateId(),
          title,
          author: author || '',
          description: description || '',
          outline: '',
          status: 'draft',
          wordCount: 0,
          chapterCount: 0,
          volumeCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
        };
        mockStorage.novels.set(novel.id, novel);
        return { success: true, data: novel };
      }

      case 'novel:list': {
        const novels = Array.from(mockStorage.novels.values());
        return { success: true, data: novels };
      }

      case 'novel:get': {
        const [novelId] = args;
        const novel = mockStorage.novels.get(novelId);
        if (novel) return { success: true, data: novel };
        return { success: false, error: '作品不存在' };
      }

      case 'novel:update': {
        const [novelId, updates] = args;
        const novel = mockStorage.novels.get(novelId);
        if (novel) {
          Object.assign(novel, updates, { updatedAt: new Date().toISOString() });
          return { success: true, data: novel };
        }
        return { success: false, error: '作品不存在' };
      }

      case 'novel:delete': {
        const [novelId] = args;
        mockStorage.novels.delete(novelId);
        for (const [key, chapter] of mockStorage.chapters) {
          if (chapter.novelId === novelId) mockStorage.chapters.delete(key);
        }
        for (const [key, volume] of mockStorage.volumes) {
          if (volume.novelId === novelId) mockStorage.volumes.delete(key);
        }
        return { success: true };
      }

      case 'chapter:create': {
        const [novelId, title, order, volumeId] = args;
        const existingChapters = Array.from(mockStorage.chapters.values())
          .filter(c => c.novelId === novelId);
        const chapter: Chapter = {
          id: generateId(),
          novelId,
          volumeId,
          title,
          outline: '',
          content: '',
          order: order ?? existingChapters.length,
          status: 'draft',
          wordCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockStorage.chapters.set(chapter.id, chapter);
        // Update novel chapter count
        const novel = mockStorage.novels.get(novelId);
        if (novel) {
          novel.chapterCount = existingChapters.length + 1;
          novel.updatedAt = new Date().toISOString();
        }
        return { success: true, data: chapter };
      }

      case 'chapter:list': {
        const [novelId] = args;
        const chapters = Array.from(mockStorage.chapters.values())
          .filter(c => c.novelId === novelId)
          .sort((a, b) => a.order - b.order);
        return { success: true, data: chapters };
      }

      case 'chapter:get': {
        const [_novelId, chapterId] = args;
        const chapter = mockStorage.chapters.get(chapterId);
        if (chapter) return { success: true, data: chapter };
        return { success: false, error: '章节不存在' };
      }

      case 'chapter:update': {
        const [_novelId, chapterId, updates] = args;
        const chapter = mockStorage.chapters.get(chapterId);
        if (chapter) {
          Object.assign(chapter, updates, { updatedAt: new Date().toISOString() });
          return { success: true, data: chapter };
        }
        return { success: false, error: '章节不存在' };
      }

      case 'chapter:delete': {
        const [_novelId, chapterId] = args;
        mockStorage.chapters.delete(chapterId);
        return { success: true };
      }

      case 'volume:create': {
        const [novelId, title] = args;
        const existingVolumes = Array.from(mockStorage.volumes.values())
          .filter(v => v.novelId === novelId);
        const volume: Volume = {
          id: generateId(),
          novelId,
          title,
          outline: '',
          order: existingVolumes.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockStorage.volumes.set(volume.id, volume);
        return { success: true, data: volume };
      }

      case 'volume:list': {
        const [novelId] = args;
        const volumes = Array.from(mockStorage.volumes.values())
          .filter(v => v.novelId === novelId)
          .sort((a, b) => a.order - b.order);
        return { success: true, data: volumes };
      }

      case 'volume:get': {
        const [_novelId, volumeId] = args;
        const volume = mockStorage.volumes.get(volumeId);
        if (volume) return { success: true, data: volume };
        return { success: false, error: '卷不存在' };
      }

      case 'volume:update': {
        const [_novelId, volumeId, updates] = args;
        const volume = mockStorage.volumes.get(volumeId);
        if (volume) {
          Object.assign(volume, updates, { updatedAt: new Date().toISOString() });
          return { success: true, data: volume };
        }
        return { success: false, error: '卷不存在' };
      }

      case 'volume:delete': {
        const [_novelId, volumeId] = args;
        mockStorage.volumes.delete(volumeId);
        return { success: true };
      }

      case 'settings:getApp':
      case 'settings:getAI': {
        return { success: true, data: {} };
      }

      case 'settings:saveApp':
      case 'settings:saveAI': {
        return { success: true };
      }

      default:
        console.warn('未实现的 mock IPC 通道:', channel);
        return { success: false, error: '未实现的功能' };
    }
  },

  on: () => {},
  removeListener: () => {},
  once: () => {},
};

export const initMockData = () => {
  const novelId = 'sample-1';
  const sampleNovel: Novel = {
    id: novelId,
    title: '示例作品',
    author: '示例作者',
    description: '这是一个示例作品，点击即可开始编辑。',
    outline: '',
    status: 'writing',
    wordCount: 1250,
    chapterCount: 3,
    volumeCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['示例'],
    lastChapterId: 'sample-chapter-3',
  };
  mockStorage.novels.set(sampleNovel.id, sampleNovel);

  // 创建示例章节
  const sampleChapters: Chapter[] = [
    {
      id: 'sample-chapter-1',
      novelId,
      volumeId: undefined,
      title: '第一章 开端',
      outline: '',
      content: '这是第一章的内容。欢迎使用 AI Writer 开始你的创作之旅。',
      order: 0,
      status: 'completed',
      wordCount: 350,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'sample-chapter-2',
      novelId,
      volumeId: undefined,
      title: '第二章 发展',
      outline: '',
      content: '故事在这里展开，主角踏上了新的旅程...',
      order: 1,
      status: 'writing',
      wordCount: 420,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'sample-chapter-3',
      novelId,
      volumeId: undefined,
      title: '第三章 转折',
      outline: '',
      content: '情节在此发生重大变化，一切开始变得不同...',
      order: 2,
      status: 'draft',
      wordCount: 480,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  sampleChapters.forEach((ch) => mockStorage.chapters.set(ch.id, ch));

  // 创建示例卷
  const sampleVolume: Volume = {
    id: 'sample-volume-1',
    novelId,
    title: '第一卷',
    outline: '',
    order: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  };
  mockStorage.volumes.set(sampleVolume.id, sampleVolume);
};
