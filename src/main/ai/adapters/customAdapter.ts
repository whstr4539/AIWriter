/**
 * 自定义适配器
 * 支持 OpenAI 兼容格式的自定义 API
 */

import { BaseAdapter } from '../baseAdapter';
import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
  AIError,
  StreamCallbacks,
} from '../types';
import type { AIProvider, AIModelInfo } from '../../../types/novel';

// 自定义模型列表（通用）
const CUSTOM_MODELS: AIModelInfo[] = [
  {
    id: 'custom-model',
    name: '自定义模型',
    description: '用户自定义模型',
    maxTokens: 4096,
    supportsVision: false,
  },
];

// OpenAI 兼容 API 响应类型
interface OpenAICompatibleResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OpenAI 兼容流式响应类型
interface OpenAICompatibleStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// 错误响应
interface ErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
  message?: string;
  error_message?: string;
}

export class CustomAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'custom';
  readonly name = '自定义';
  protected readonly defaultBaseUrl = '';
  protected readonly apiVersion = 'v1';

  /**
   * 获取请求头
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config?.headers,
    };

    // 如果有 API Key，添加认证头
    if (this.config?.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * 获取API端点
   */
  protected getEndpoint(): string {
    // 支持自定义端点路径，默认为 OpenAI 兼容格式
    return '/v1/chat/completions';
  }

  /**
   * 构建请求体
   * 使用 OpenAI 兼容格式
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    return {
      model: request.model || this.config?.model || 'default',
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: request.temperature ?? this.config?.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 2048,
      stream: request.stream ?? false,
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const resp = response as OpenAICompatibleResponse;
    const choice = resp.choices[0];

    return {
      content: choice?.message?.content || '',
      usage: resp.usage
        ? {
            promptTokens: resp.usage.prompt_tokens,
            completionTokens: resp.usage.completion_tokens,
            totalTokens: resp.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason,
      model: resp.model,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as OpenAICompatibleStreamResponse;
      const choice = data.choices[0];

      if (!choice) return null;

      return {
        content: choice.delta?.content || '',
        finishReason: choice.finish_reason || undefined,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * 解析错误响应
   */
  protected parseErrorResponse(data: string, statusCode: number): AIError {
    try {
      const errorResponse = JSON.parse(data) as ErrorResponse;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      // 尝试多种错误格式
      const message =
        errorResponse.error?.message ||
        errorResponse.message ||
        errorResponse.error_message ||
        '未知错误';

      const code =
        errorResponse.error?.code ||
        errorResponse.error?.type ||
        'unknown_error';

      return {
        code,
        message,
        type,
        retryable,
        statusCode,
      };
    } catch {
      return {
        code: 'parse_error',
        message: '解析错误响应失败',
        type: 'unknown',
        retryable: false,
        statusCode,
      };
    }
  }

  /**
   * 生成内容（非流式）
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const body = this.buildRequestBody({ ...request, stream: false });
    const response = await this.makeRequest(body);
    return this.parseResponse(response);
  }

  /**
   * 流式生成内容
   */
  async streamGenerate(
    request: AIGenerateRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const body = this.buildRequestBody({ ...request, stream: true });
    await this.makeStreamRequest(body, callbacks);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency: number }> {
    const startTime = Date.now();

    // 检查是否配置了基础URL
    if (!this.config?.baseUrl) {
      return {
        success: false,
        message: '未配置基础URL',
        latency: 0,
      };
    }

    try {
      const body = this.buildRequestBody({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 5,
        stream: false,
      });

      await this.makeRequest(body);
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: '连接成功',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const aiError = error as AIError;

      return {
        success: false,
        message: aiError.message || '连接失败',
        latency,
      };
    }
  }

  /**
   * 获取可用模型列表
   * 对于自定义适配器，返回用户配置的模型
   */
  async getAvailableModels(): Promise<AIModelInfo[]> {
    if (this.config?.model) {
      return [
        {
          id: this.config.model,
          name: this.config.model,
          description: '自定义模型',
          maxTokens: this.config.maxTokens || 4096,
          supportsVision: false,
        },
      ];
    }
    return CUSTOM_MODELS;
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; message: string } {
    if (!this.config) {
      return { valid: false, message: '适配器未初始化' };
    }

    if (!this.config.baseUrl) {
      return { valid: false, message: '基础URL不能为空' };
    }

    // 验证URL格式
    try {
      new URL(this.config.baseUrl);
    } catch {
      return { valid: false, message: '基础URL格式不正确' };
    }

    return { valid: true, message: '配置有效' };
  }
}
