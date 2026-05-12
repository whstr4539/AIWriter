/**
 * AI提示词模板系统
 * 为每种AI操作预置提示词模板，支持用户自定义提示词
 */

// AI操作类型
export type AIOperationType = 'continue' | 'rewrite' | 'expand' | 'polish' | 'generateChapter' | 'generateOutline';

// 写作风格
export type WritingStyle = 'formal' | 'casual' | 'suspense' | 'romantic' | 'epic' | 'humorous';

// 章节长度
export type ChapterLength = 'short' | 'medium' | 'long' | 'extraLong';

// 提示词模板参数
interface PromptTemplateParams {
  selectedText: string;
  contextText?: string;
  chapterTitle?: string;
  novelTitle?: string;
}

// 大纲生成参数
interface OutlinePromptParams {
  outlineType: 'novel' | 'volume' | 'chapter';
  novelTitle?: string;
  referenceInfo?: string;
  additionalPrompts?: string;
}

// 章节生成参数
interface ChapterPromptParams {
  outline: string;
  style: WritingStyle;
  length: ChapterLength;
  novelTitle?: string;
  characters?: string;
  keyPoints?: string;
  additionalPrompts?: string;
}

// 提示词模板配置
interface PromptTemplateConfig {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

// 默认提示词模板
const defaultTemplates: Record<AIOperationType, PromptTemplateConfig> = {
  continue: {
    name: '续写',
    description: '根据选中内容继续写作',
    systemPrompt: `你是一位专业的小说创作助手，擅长根据已有内容进行合理的续写。
请保持原文的风格、语气和人物设定，创作出连贯、自然的内容延续。
续写内容应当：
1. 与原文情节逻辑连贯
2. 保持人物性格一致性
3. 延续原文的写作风格
4. 推动情节自然发展`,
    userPromptTemplate: `请根据以下内容进行续写：

【前文内容】
{{selectedText}}

【上下文】
{{contextText}}

要求：
- 续写长度约500-800字
- 保持与原文一致的风格和语气
- 情节发展要自然合理
- 可以适当增加环境描写和人物心理描写`,
  },

  rewrite: {
    name: '改写',
    description: '对选中内容进行改写',
    systemPrompt: `你是一位专业的小说编辑，擅长对文本进行改写和优化。
改写时应当：
1. 保持原意不变
2. 优化表达方式
3. 调整句式结构
4. 提升文字质量
5. 保持人物设定和情节逻辑`,
    userPromptTemplate: `请对以下内容进行改写：

【原文】
{{selectedText}}

【上下文】
{{contextText}}

改写要求：
- 保持原意和情节不变
- 优化语言表达，使其更加流畅
- 可以调整句式结构
- 提升整体的文学性和可读性
- 输出改写后的完整内容`,
  },

  expand: {
    name: '扩写',
    description: '扩展选中内容',
    systemPrompt: `你是一位擅长细节描写的小说创作助手，能够对简写的场景进行丰富扩展。
扩写时应当：
1. 增加环境描写
2. 丰富人物心理活动
3. 细化动作和对话
4. 增加感官细节
5. 保持情节主线不变`,
    userPromptTemplate: `请对以下内容进行扩写：

【原文】
{{selectedText}}

【上下文】
{{contextText}}

扩写要求：
- 将内容扩展至原来的2-3倍长度
- 增加详细的环境描写
- 丰富人物的心理活动和情感变化
- 细化动作、神态和对话
- 增加视觉、听觉等感官细节
- 保持情节主线不变`,
  },

  polish: {
    name: '润色',
    description: '优化选中内容的表达',
    systemPrompt: `你是一位资深的文学编辑，专注于文字润色和语言优化。
润色时应当：
1. 修正语法和用词错误
2. 优化句子结构
3. 提升文字的文学性
4. 增强表达的表现力
5. 保持原文的风格特色`,
    userPromptTemplate: `请对以下内容进行润色：

【原文】
{{selectedText}}

【上下文】
{{contextText}}

润色要求：
- 修正语法错误和不当用词
- 优化句子结构，使其更加流畅
- 提升文字的文学性和表现力
- 增强描写的生动性
- 保持原文的风格和语气
- 输出润色后的完整内容`,
  },

  generateChapter: {
    name: '生成章节',
    description: '根据大纲生成完整章节',
    systemPrompt: `你是一位专业的小说作家，擅长根据大纲创作完整的小说章节。
创作时应当：
1. 严格遵循大纲要求
2. 保持情节连贯性
3. 塑造鲜明的人物形象
4. 营造适当的氛围
5. 注意节奏把控
6. 设置合理的悬念和高潮`,
    userPromptTemplate: `请根据以下信息创作小说章节：

【作品名称】
{{novelTitle}}

【章节大纲】
{{outline}}

【写作风格】
{{style}}

【章节长度】
{{length}}

【出场人物】
{{characters}}

【关键情节点】
{{keyPoints}}

【额外要求】
{{additionalPrompts}}

创作要求：
- 严格按照大纲展开情节
- 人物性格要鲜明一致
- 场景描写要生动具体
- 对话要符合人物身份
- 注意情节的节奏把控
- 适当设置悬念和转折
- 章节标题要吸引人`,
  },

  generateOutline: {
    name: '生成大纲',
    description: '为作品/卷/章生成创作大纲',
    systemPrompt: `你是一位资深的网络文学编辑和创作顾问，精通各类网文题材的创作规律。
你擅长：
1. 搭建完整的故事框架和世界观
2. 设计层层递进的爽点和爆点
3. 规划人物成长弧光和关系网
4. 把控节奏张弛，设置悬念和高潮
5. 安排伏笔和转折，提升读者粘性`,
    userPromptTemplate: `请根据以下信息生成创作大纲：

【作品名称】
{{novelTitle}}

【大纲类型】
{{outlineType}}

【参考信息】
{{referenceInfo}}

【额外要求】
{{additionalPrompts}}

大纲要求：
- 结构清晰，层层递进
- 明确每一阶段的冲突和爽点
- 标注关键转折和高潮位置
- 人物关系要相互交织推动剧情
- 节奏张弛有度，悬念迭起
- 兼顾逻辑严密和戏剧张力`,
  },
};

// 写作风格描述
const writingStyleDescriptions: Record<WritingStyle, string> = {
  formal: '正式严谨，语言规范，结构清晰',
  casual: '轻松活泼，语言通俗，节奏轻快',
  suspense: '悬疑紧张，氛围营造，节奏紧凑',
  romantic: '浪漫唯美，情感细腻，描写优美',
  epic: '史诗宏大，气势磅礴，场面宏大',
  humorous: '幽默诙谐，轻松搞笑，妙趣横生',
};

// 章节长度描述
const chapterLengthDescriptions: Record<ChapterLength, { wordCount: string; description: string }> = {
  short: {
    wordCount: '1000-2000字',
    description: '简短精炼，适合过渡章节或情节铺垫',
  },
  medium: {
    wordCount: '2000-4000字',
    description: '适中长度，适合一般情节发展',
  },
  long: {
    wordCount: '4000-6000字',
    description: '较长篇幅，适合重要情节或高潮',
  },
  extraLong: {
    wordCount: '6000字以上',
    description: '超长篇幅，适合大场面或关键转折',
  },
};

/**
 * 提示词模板管理类
 */
export class PromptTemplate {
  private static customTemplates: Partial<Record<AIOperationType, PromptTemplateConfig>> = {};

  /**
   * 获取提示词模板
   */
  static getTemplate(type: AIOperationType): PromptTemplateConfig {
    return this.customTemplates[type] || defaultTemplates[type];
  }

  /**
   * 设置自定义提示词模板
   */
  static setCustomTemplate(type: AIOperationType, template: PromptTemplateConfig): void {
    this.customTemplates[type] = template;
    // 保存到本地存储
    this.saveToStorage();
  }

  /**
   * 重置为默认模板
   */
  static resetToDefault(type: AIOperationType): void {
    delete this.customTemplates[type];
    this.saveToStorage();
  }

  /**
   * 获取所有模板
   */
  static getAllTemplates(): Record<AIOperationType, PromptTemplateConfig> {
    return {
      ...defaultTemplates,
      ...this.customTemplates,
    };
  }

  /**
   * 构建提示词
   */
  static build(type: AIOperationType, params: PromptTemplateParams): string {
    const template = this.getTemplate(type);
    let prompt = template.userPromptTemplate;

    // 替换变量
    prompt = prompt.replace(/{{selectedText}}/g, params.selectedText || '');
    prompt = prompt.replace(/{{contextText}}/g, params.contextText || '');
    prompt = prompt.replace(/{{chapterTitle}}/g, params.chapterTitle || '');
    prompt = prompt.replace(/{{novelTitle}}/g, params.novelTitle || '');

    // 组合系统提示词和用户提示词
    return `${template.systemPrompt}\n\n${prompt}`;
  }

  /**
   * 构建章节生成提示词
   */
  static buildChapterPrompt(params: ChapterPromptParams): string {
    const template = this.getTemplate('generateChapter');
    let prompt = template.userPromptTemplate;

    // 替换变量
    prompt = prompt.replace(/{{novelTitle}}/g, params.novelTitle || '未命名作品');
    prompt = prompt.replace(/{{outline}}/g, params.outline || '');
    prompt = prompt.replace(/{{style}}/g, writingStyleDescriptions[params.style]);
    prompt = prompt.replace(/{{length}}/g, chapterLengthDescriptions[params.length].wordCount);
    prompt = prompt.replace(/{{characters}}/g, params.characters || '根据情节需要安排');
    prompt = prompt.replace(/{{keyPoints}}/g, params.keyPoints || '按照大纲自然展开');
    prompt = prompt.replace(/{{additionalPrompts}}/g, params.additionalPrompts || '无');

    // 组合系统提示词和用户提示词
    return `${template.systemPrompt}\n\n${prompt}`;
  }

  /**
   * 构建大纲生成提示词
   */
  static buildOutlinePrompt(params: OutlinePromptParams): string {
    const template = this.getTemplate('generateOutline');
    const outlineTypeLabels: Record<string, string> = {
      novel: '总纲（作品级别，涵盖整体世界观、主线剧情、人物关系网、分卷规划）',
      volume: '卷纲（卷级别，涵盖本卷主线、关键冲突、人物成长弧、各章衔接）',
      chapter: '章纲（章节级别，涵盖具体场景、情节推进、人物对话要点、悬念设置）',
    };

    let prompt = template.userPromptTemplate;
    prompt = prompt.replace(/{{novelTitle}}/g, params.novelTitle || '未命名作品');
    prompt = prompt.replace(/{{outlineType}}/g, outlineTypeLabels[params.outlineType] || params.outlineType);
    prompt = prompt.replace(/{{referenceInfo}}/g, params.referenceInfo || '无');
    prompt = prompt.replace(/{{additionalPrompts}}/g, params.additionalPrompts || '无');

    return `${template.systemPrompt}\n\n${prompt}`;
  }

  /**
   * 获取写作风格描述
   */
  static getWritingStyleDescription(style: WritingStyle): string {
    return writingStyleDescriptions[style];
  }

  /**
   * 获取章节长度描述
   */
  static getChapterLengthDescription(length: ChapterLength): { wordCount: string; description: string } {
    return chapterLengthDescriptions[length];
  }

  /**
   * 获取所有写作风格
   */
  static getAllWritingStyles(): Record<WritingStyle, string> {
    return { ...writingStyleDescriptions };
  }

  /**
   * 获取所有章节长度选项
   */
  static getAllChapterLengths(): Record<ChapterLength, { wordCount: string; description: string }> {
    return { ...chapterLengthDescriptions };
  }

  /**
   * 从本地存储加载自定义模板
   */
  static loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_prompt_templates');
      if (stored) {
        this.customTemplates = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载提示词模板失败:', error);
    }
  }

  /**
   * 保存自定义模板到本地存储
   */
  private static saveToStorage(): void {
    try {
      localStorage.setItem('ai_prompt_templates', JSON.stringify(this.customTemplates));
    } catch (error) {
      console.error('保存提示词模板失败:', error);
    }
  }

  /**
   * 导出模板配置
   */
  static exportTemplates(): string {
    return JSON.stringify(this.getAllTemplates(), null, 2);
  }

  /**
   * 导入模板配置
   */
  static importTemplates(jsonString: string): boolean {
    try {
      const templates = JSON.parse(jsonString);
      this.customTemplates = templates;
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('导入模板失败:', error);
      return false;
    }
  }
}

// 初始化时从存储加载
PromptTemplate.loadFromStorage();

export default PromptTemplate;
