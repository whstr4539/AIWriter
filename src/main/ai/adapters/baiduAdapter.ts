/**
 * 百度 (文心一言) 适配器
 * 支持百度千帆平台 API
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

// 百度模型列表
const BAIDU_MODELS: AIModelInfo[] = [
  {
    id: 'ernie-4.0-turbo-8k',
    name: 'ERNIE 4.0 Turbo',
    description: '文心大模型4.0 Turbo版',
    maxTokens: 8192,
    supportsVision: false,
  },
  {
    id: 'ernie-4.0-8k-latest',
    name: 'ERNIE 4.0',
    description: '文心大模型4.0版',
    maxTokens: 8192,
    supportsVision: false,
  },
  {
    id: 'ernie-3.5-8k',
    name: 'ERNIE 3.5',
    description: '文心大模型3.5版',
    maxTokens: 8192,
    supportsVision: false,
  },
  {
    id: 'ernie-speed-128k',
    name: 'ERNIE Speed',
    description: '轻量级大模型',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'ernie-lite-8k',
    name: 'ERNIE Lite',
    description: '轻量级大模型',
    maxTokens: 8192,
    supportsVision: false,
  },
];

// 模型到API端点映射
const BAIDU_MODEL_ENDPOINTS: Record<string, string> = {
  'ernie-4.0-turbo-8k': 'ernie-4.0-turbo-8k',
  'ernie-4.0-8k-latest': 'ernie-4.0-8k-latest',
  'ernie-3.5-8k': 'ernie-3.5-8k',
  'ernie-speed-128k': 'ernie-speed-128k',
  'ernie-lite-8k': 'ernie-lite-8k',
};

// 百度 API 响应类型
interface BaiduResponse {
  id: string;
  object: string;
  created: number;
  result: string;
  is_truncated: boolean;
  need_clear_history: boolean;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 百度流式响应类型
interface BaiduStreamResponse {
  id: string;
  object: string;
  created: number;
  sentence_id: number;
  is_end: boolean;
  is_truncated: boolean;
  result: string;
  need_clear_history: boolean;
  finish_reason: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// 百度错误响应
interface BaiduErrorResponse {
  error_code: number;
  error_msg: string;
}

export class BaiduAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'baidu';
  readonly name = '百度 (文心一言)';
  protected readonly defaultBaseUrl = 'https://qianfan.baidubce.com/v2';
  protected readonly apiVersion = 'v2';

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
    const model = this.config?.model || 'ernie-3.5-8k';
    const endpoint = BAIDU_MODEL_ENDPOINTS[model] || model;
    return `/${endpoint}/chat/completions`;
  }

  /**
   * 转换消息格式
   * 百度使用 system 参数而不是 system 角色消息
   */
  private convertMessages(messages: AIGenerateRequest['messages']): {
    system?: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const system = systemMessages.map((m) => m.content).join('\n\n');

    return {
      ...(system ? { system } : {}),
      messages: otherMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    const { system, messages } = this.convertMessages(request.messages);

    return {
      ...(system ? { system } : {}),
      messages,
      temperature: request.temperature ?? this.config?.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 2048,
      stream: request.stream ?? false,
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const baiduResponse = response as BaiduResponse;

    return {
      content: baiduResponse.result || '',
      usage: baiduResponse.usage
        ? {
            promptTokens: baiduResponse.usage.prompt_tokens,
            completionTokens: baiduResponse.usage.completion_tokens,
            totalTokens: baiduResponse.usage.total_tokens,
          }
        : undefined,
      finishReason: baiduResponse.finish_reason,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as BaiduStreamResponse;

      return {
        content: data.result || '',
        finishReason: data.is_end ? data.finish_reason : undefined,
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
      const errorResponse = JSON.parse(data) as BaiduErrorResponse;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      return {
        code: String(errorResponse.error_code) || 'unknown_error',
        message: errorResponse.error_msg || '未知错误',
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
    return BAIDU_MODELS;
  }
}
