/**
 * AI服务主文件
 * 封装各厂商API调用，提供统一的AI接口
 */

import type { AISettings, AIProvider, AIModelInfo } from '../../types/novel';
import type {
  IAIAdapter,
  AdapterConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
  AIError,
  StreamCallbacks,
  GenerateOptions,
  StreamGenerateOptions,
  AIGenerationResult,
  AITestConnectionResult,
} from './types';

import {
  OpenAIAdapter,
  AnthropicAdapter,
  GoogleAdapter,
  AliyunAdapter,
  BaiduAdapter,
  BytedanceAdapter,
  ZhipuAdapter,
  CustomAdapter,
} from './adapters';

// 提供商信息配置
export const PROVIDER_INFO: Record<
  AIProvider,
  { name: string; description: string; requireApiKey: boolean }
> = {
  openai: {
    name: 'OpenAI',
    description: 'OpenAI GPT 系列模型',
    requireApiKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude 系列模型',
    requireApiKey: true,
  },
  google: {
    name: 'Google',
    description: 'Gemini 系列模型',
    requireApiKey: true,
  },
  aliyun: {
    name: '阿里云',
    description: '通义千问系列模型',
    requireApiKey: true,
  },
  baidu: {
    name: '百度',
    description: '文心一言系列模型',
    requireApiKey: true,
  },
  bytedance: {
    name: '字节跳动',
    description: '豆包系列模型',
    requireApiKey: true,
  },
  zhipu: {
    name: '智谱AI',
    description: 'GLM 系列模型',
    requireApiKey: true,
  },
  custom: {
    name: '自定义',
    description: '自定义 OpenAI 兼容 API',
    requireApiKey: false,
  },
};

export class AIService {
  private adapter: IAIAdapter | null = null;
  private settings: AISettings | null = null;

  /**
   * 创建适配器实例
   */
  private createAdapter(provider: AIProvider): IAIAdapter {
    switch (provider) {
      case 'openai':
        return new OpenAIAdapter();
      case 'anthropic':
        return new AnthropicAdapter();
      case 'google':
        return new GoogleAdapter();
      case 'aliyun':
        return new AliyunAdapter();
      case 'baidu':
        return new BaiduAdapter();
      case 'bytedance':
        return new BytedanceAdapter();
      case 'zhipu':
        return new ZhipuAdapter();
      case 'custom':
        return new CustomAdapter();
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 初始化AI服务
   */
  initialize(settings: AISettings): void {
    this.settings = settings;
    this.adapter = this.createAdapter(settings.provider);

    const config: AdapterConfig = {
      apiKey: settings.apiKey || '',
      baseUrl: settings.baseUrl,
      model: settings.model,
      timeout: settings.timeout || 60000,
      temperature: settings.temperature ?? 0.7,
      maxTokens: settings.maxTokens || 2000,
    };

    this.adapter.initialize(config);
  }

  /**
   * 确保服务已初始化
   */
  private ensureInitialized(): IAIAdapter {
    if (!this.adapter) {
      throw new Error('AI服务未初始化');
    }
    return this.adapter;
  }

  /**
   * 生成内容（非流式）
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<AIGenerationResult> {
    try {
      const adapter = this.ensureInitialized();

      const messages: AIGenerateRequest['messages'] = [];

      // 添加系统提示词
      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      // 添加用户消息
      messages.push({ role: 'user', content: prompt });

      const request: AIGenerateRequest = {
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        model: options?.model,
        stream: false,
      };

      const response = await adapter.generate(request);

      return {
        success: true,
        content: response.content,
        usage: response.usage,
        finishReason: response.finishReason,
      };
    } catch (error) {
      const aiError = error as AIError;
      return {
        success: false,
        error: aiError,
      };
    }
  }

  /**
   * 流式生成内容
   */
  async streamGenerate(
    prompt: string,
    options: StreamGenerateOptions
  ): Promise<void> {
    const adapter = this.ensureInitialized();

    const messages: AIGenerateRequest['messages'] = [];

    // 添加系统提示词
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    // 添加用户消息
    messages.push({ role: 'user', content: prompt });

    const request: AIGenerateRequest = {
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      model: options?.model,
      stream: true,
    };

    const callbacks: StreamCallbacks = {
      onChunk: options.onChunk,
      onError: options.onError || (() => {}),
      onComplete: options.onComplete || (() => {}),
    };

    await adapter.streamGenerate(request, callbacks);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<AITestConnectionResult> {
    try {
      const adapter = this.ensureInitialized();

      // 对于自定义适配器，先验证配置
      if (this.settings?.provider === 'custom') {
        const customAdapter = adapter as CustomAdapter;
        const validation = customAdapter.validateConfig();
        if (!validation.valid) {
          return {
            success: false,
            message: validation.message,
            latency: 0,
            modelAvailable: false,
          };
        }
      }

      const result = await adapter.testConnection();
      const models = await adapter.getAvailableModels();

      return {
        success: result.success,
        message: result.message,
        latency: result.latency,
        modelAvailable: result.success,
        models: models,
      };
    } catch (error) {
      const aiError = error as AIError;
      return {
        success: false,
        message: aiError.message || '测试连接失败',
        latency: 0,
        modelAvailable: false,
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<AIModelInfo[]> {
    const adapter = this.ensureInitialized();
    return await adapter.getAvailableModels();
  }

  /**
   * 获取当前提供商信息
   */
  getProviderInfo(): { name: string; description: string; requireApiKey: boolean } | null {
    if (!this.settings) return null;
    return PROVIDER_INFO[this.settings.provider];
  }

  /**
   * 获取当前设置
   */
  getSettings(): AISettings | null {
    return this.settings;
  }

  /**
   * 更新设置
   */
  updateSettings(settings: AISettings): void {
    // 如果提供商改变，需要重新创建适配器
    if (this.settings?.provider !== settings.provider) {
      this.initialize(settings);
    } else {
      // 否则只更新配置
      this.settings = settings;
      const config: AdapterConfig = {
        apiKey: settings.apiKey || '',
        baseUrl: settings.baseUrl,
        model: settings.model,
        timeout: settings.timeout || 60000,
        temperature: settings.temperature ?? 0.7,
        maxTokens: settings.maxTokens || 2000,
      };
      this.adapter?.initialize(config);
    }
  }

  /**
   * 终止当前正在进行的流式生成
   */
  abort(): void {
    this.adapter?.abortStream();
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.adapter !== null;
  }

  /**
   * 获取所有支持的提供商
   */
  static getSupportedProviders(): { id: AIProvider; name: string; description: string }[] {
    return Object.entries(PROVIDER_INFO).map(([id, info]) => ({
      id: id as AIProvider,
      name: info.name,
      description: info.description,
    }));
  }

  /**
   * 获取提供商的默认基础URL
   */
  static getDefaultBaseUrl(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com';
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'google':
        return 'https://generativelanguage.googleapis.com';
      case 'aliyun':
        return 'https://dashscope.aliyuncs.com';
      case 'baidu':
        return 'https://qianfan.baidubce.com/v2';
      case 'bytedance':
        return 'https://ark.cn-beijing.volces.com';
      case 'zhipu':
        return 'https://open.bigmodel.cn';
      case 'custom':
        return '';
      default:
        return '';
    }
  }

  /**
   * 获取提供商的默认模型
   */
  static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'google':
        return 'gemini-1.5-flash';
      case 'aliyun':
        return 'qwen-turbo';
      case 'baidu':
        return 'ernie-3.5-8k';
      case 'bytedance':
        return 'doubao-pro-32k';
      case 'zhipu':
        return 'glm-4-flash';
      case 'custom':
        return 'default';
      default:
        return '';
    }
  }
}

// 导出单例实例
export const aiService = new AIService();
export default aiService;
