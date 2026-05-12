/**
 * 字节跳动 (豆包) 适配器
 * 支持火山引擎 API
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

// 字节跳动模型列表
const BYTEDANCE_MODELS: AIModelInfo[] = [
  {
    id: 'doubao-pro-128k',
    name: '豆包 Pro',
    description: '豆包专业版，支持128K上下文',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'doubao-pro-32k',
    name: '豆包 Pro 32K',
    description: '豆包专业版，支持32K上下文',
    maxTokens: 32768,
    supportsVision: false,
  },
  {
    id: 'doubao-lite-128k',
    name: '豆包 Lite',
    description: '豆包轻量版，支持128K上下文',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'doubao-lite-32k',
    name: '豆包 Lite 32K',
    description: '豆包轻量版，支持32K上下文',
    maxTokens: 32768,
    supportsVision: false,
  },
  {
    id: 'doubao-vision-pro-32k',
    name: '豆包视觉 Pro',
    description: '豆包视觉专业版',
    maxTokens: 32768,
    supportsVision: true,
  },
];

// 字节跳动 API 响应类型
interface BytedanceResponse {
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

// 字节跳动流式响应类型
interface BytedanceStreamResponse {
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

// 字节跳动错误响应
interface BytedanceErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export class BytedanceAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'bytedance';
  readonly name = '字节跳动 (豆包)';
  protected readonly defaultBaseUrl = 'https://ark.cn-beijing.volces.com';
  protected readonly apiVersion = 'v3';

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
    return `/api/${this.apiVersion}/chat/completions`;
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    return {
      model: request.model || this.config?.model || 'doubao-pro-32k',
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: request.temperature ?? this.config?.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 4096,
      stream: request.stream ?? false,
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const bytedanceResponse = response as BytedanceResponse;
    const choice = bytedanceResponse.choices[0];

    return {
      content: choice?.message?.content || '',
      usage: bytedanceResponse.usage
        ? {
            promptTokens: bytedanceResponse.usage.prompt_tokens,
            completionTokens: bytedanceResponse.usage.completion_tokens,
            totalTokens: bytedanceResponse.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason,
      model: bytedanceResponse.model,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as BytedanceStreamResponse;
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
      const errorResponse = JSON.parse(data) as BytedanceErrorResponse;
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
    return BYTEDANCE_MODELS;
  }
}
