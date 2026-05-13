/**
 * Anthropic (Claude) 适配器
 * 支持 Claude API
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

// Anthropic 模型列表
const ANTHROPIC_MODELS: AIModelInfo[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: '最智能的模型，适合复杂任务',
    maxTokens: 200000,
    supportsVision: true,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: '强大的模型，适合复杂任务',
    maxTokens: 200000,
    supportsVision: true,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: '平衡性能和速度',
    maxTokens: 200000,
    supportsVision: true,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: '最快的模型，适合简单任务',
    maxTokens: 200000,
    supportsVision: true,
  },
];

// Anthropic API 响应类型
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: {
    type: string;
    text: string;
  }[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Anthropic 流式响应类型
interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  content_block?: {
    type: string;
    text: string;
  };
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
}

// Anthropic 错误响应
interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'anthropic';
  readonly name = 'Anthropic (Claude)';
  protected readonly defaultBaseUrl = 'https://api.anthropic.com';
  protected readonly apiVersion = '2023-06-01';

  /**
   * 获取请求头
   */
  protected getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config?.apiKey || '',
      'anthropic-version': this.apiVersion,
      ...this.config?.headers,
    };
  }

  /**
   * 获取API端点
   */
  protected getEndpoint(): string {
    return '/v1/messages';
  }

  /**
   * 转换消息格式
   * Anthropic 使用 system 参数而不是 system 角色消息
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
      model: request.model || this.config?.model || 'claude-3-5-sonnet-20241022',
      ...(system ? { system } : {}),
      messages,
      max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 4096,
      temperature: request.temperature ?? this.config?.temperature ?? 0.7,
      stream: request.stream ?? false,
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const anthropicResponse = response as AnthropicResponse;
    const content = anthropicResponse.content
      .map((c) => c.text)
      .join('');

    return {
      content,
      usage: {
        promptTokens: anthropicResponse.usage.input_tokens,
        completionTokens: anthropicResponse.usage.output_tokens,
        totalTokens:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      },
      finishReason: anthropicResponse.stop_reason || undefined,
      model: anthropicResponse.model,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      // makeStreamRequest 已经剥离了 "data: " 前缀，这里直接解析 JSON
      const event = JSON.parse(line) as AnthropicStreamEvent;

      // 内容增量
      if (event.type === 'content_block_delta' && event.delta?.text) {
        return {
          content: event.delta.text,
        };
      }

      // 消息结束
      if (event.type === 'message_stop') {
        return {
          content: '',
          finishReason: 'stop',
        };
      }

      // 使用信息
      if (event.type === 'message_delta' && event.delta?.usage) {
        return {
          content: '',
          usage: {
            promptTokens: event.delta.usage.input_tokens,
            completionTokens: event.delta.usage.output_tokens,
          },
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 解析错误响应
   */
  protected parseErrorResponse(data: string, statusCode: number): AIError {
    try {
      const errorResponse = JSON.parse(data) as AnthropicErrorResponse;
      const error = errorResponse.error;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      return {
        code: error?.type || 'unknown_error',
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
    return ANTHROPIC_MODELS;
  }
}
