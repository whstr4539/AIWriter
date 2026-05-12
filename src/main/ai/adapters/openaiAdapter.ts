/**
 * OpenAI 适配器
 * 支持 OpenAI API 和兼容 OpenAI 格式的第三方服务
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

// OpenAI 模型列表
const OPENAI_MODELS: AIModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '最先进的模型，支持文本和图像',
    maxTokens: 128000,
    supportsVision: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: '快速、经济的模型',
    maxTokens: 128000,
    supportsVision: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: '强大的多模态模型',
    maxTokens: 128000,
    supportsVision: true,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: '强大的文本模型',
    maxTokens: 8192,
    supportsVision: false,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: '快速、经济的模型',
    maxTokens: 16385,
    supportsVision: false,
  },
];

// OpenAI API 响应类型
interface OpenAIResponse {
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
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OpenAI 流式响应类型
interface OpenAIStreamResponse {
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

// OpenAI 错误响应
interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export class OpenAIAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'openai';
  readonly name = 'OpenAI';
  protected readonly defaultBaseUrl = 'https://api.openai.com';
  protected readonly apiVersion = 'v1';

  /**
   * 获取请求头
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config?.apiKey || ''}`,
      ...this.config?.headers,
    };
  }

  /**
   * 获取API端点
   */
  protected getEndpoint(): string {
    return `/${this.apiVersion}/chat/completions`;
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    return {
      model: request.model || this.config?.model || 'gpt-4o-mini',
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: request.temperature ?? this.config?.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 2000,
      stream: request.stream ?? false,
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const openaiResponse = response as OpenAIResponse;
    const choice = openaiResponse.choices[0];

    return {
      content: choice?.message?.content || '',
      usage: openaiResponse.usage
        ? {
            promptTokens: openaiResponse.usage.prompt_tokens,
            completionTokens: openaiResponse.usage.completion_tokens,
            totalTokens: openaiResponse.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason,
      model: openaiResponse.model,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as OpenAIStreamResponse;
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
      const errorResponse = JSON.parse(data) as OpenAIErrorResponse;
      const error = errorResponse.error;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      return {
        code: error?.code || 'unknown_error',
        message: error?.message || '未知错误',
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
   */
  async getAvailableModels(): Promise<AIModelInfo[]> {
    return OPENAI_MODELS;
  }
}
