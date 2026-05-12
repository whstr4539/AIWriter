/**
 * 智谱AI (GLM) 适配器
 * 支持智谱AI开放平台 API
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

// 智谱AI模型列表
const ZHIPU_MODELS: AIModelInfo[] = [
  {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    description: '智谱AI最强大的模型',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'glm-4-0520',
    name: 'GLM-4',
    description: 'GLM-4基础版',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4 Air',
    description: '高性价比模型',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    description: '极速响应模型',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'glm-4v-plus',
    name: 'GLM-4V Plus',
    description: '多模态模型',
    maxTokens: 8192,
    supportsVision: true,
  },
  {
    id: 'glm-4v',
    name: 'GLM-4V',
    description: '多模态模型',
    maxTokens: 8192,
    supportsVision: true,
  },
];

// 智谱AI API 响应类型
interface ZhipuResponse {
  id: string;
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

// 智谱AI流式响应类型
interface ZhipuStreamResponse {
  id: string;
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

// 智谱AI错误响应
interface ZhipuErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export class ZhipuAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'zhipu';
  readonly name = '智谱AI (GLM)';
  protected readonly defaultBaseUrl = 'https://open.bigmodel.cn';
  protected readonly apiVersion = 'v4';

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
    return `/api/paas/${this.apiVersion}/chat/completions`;
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    return {
      model: request.model || this.config?.model || 'glm-4-flash',
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
    const zhipuResponse = response as ZhipuResponse;
    const choice = zhipuResponse.choices[0];

    return {
      content: choice?.message?.content || '',
      usage: zhipuResponse.usage
        ? {
            promptTokens: zhipuResponse.usage.prompt_tokens,
            completionTokens: zhipuResponse.usage.completion_tokens,
            totalTokens: zhipuResponse.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason,
      model: zhipuResponse.model,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as ZhipuStreamResponse;
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
      const errorResponse = JSON.parse(data) as ZhipuErrorResponse;
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
    return ZHIPU_MODELS;
  }
}
