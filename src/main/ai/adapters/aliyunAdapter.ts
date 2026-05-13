/**
 * 阿里云 (通义千问) 适配器
 * 支持阿里云百炼/灵积平台 API
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

// 阿里云模型列表
const ALIYUN_MODELS: AIModelInfo[] = [
  {
    id: 'qwen-max',
    name: '通义千问 Max',
    description: '通义千问系列最强大的模型',
    maxTokens: 32768,
    supportsVision: false,
  },
  {
    id: 'qwen-plus',
    name: '通义千问 Plus',
    description: '平衡性能和效果',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'qwen-turbo',
    name: '通义千问 Turbo',
    description: '快速、经济的模型',
    maxTokens: 131072,
    supportsVision: false,
  },
  {
    id: 'qwen-vl-max',
    name: '通义千问 VL Max',
    description: '多模态大模型',
    maxTokens: 32768,
    supportsVision: true,
  },
  {
    id: 'qwen-vl-plus',
    name: '通义千问 VL Plus',
    description: '多模态大模型',
    maxTokens: 32768,
    supportsVision: true,
  },
];

// 阿里云 API 响应类型
interface AliyunResponse {
  output: {
    text: string;
    finish_reason: string;
    choices?: {
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }[];
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

// 阿里云流式响应类型
interface AliyunStreamResponse {
  output: {
    text?: string;
    finish_reason?: string;
    choices?: {
      message?: {
        role?: string;
        content?: string;
      };
      delta?: {
        content?: string;
      };
      finish_reason?: string;
    }[];
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  request_id: string;
}

// 阿里云错误响应
interface AliyunErrorResponse {
  code: string;
  message: string;
  request_id: string;
}

export class AliyunAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'aliyun';
  readonly name = '阿里云 (通义千问)';
  protected readonly defaultBaseUrl = 'https://dashscope.aliyuncs.com';
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
    return `/api/${this.apiVersion}/services/aigc/text-generation/generation`;
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    const system = systemMessages.map((m) => m.content).join('\n\n');

    // 阿里云支持 messages 格式
    const messages = otherMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return {
      model: request.model || this.config?.model || 'qwen-turbo',
      input: {
        ...(system ? { system } : {}),
        messages,
      },
      parameters: {
        temperature: request.temperature ?? this.config?.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config?.maxTokens ?? 2000,
        result_format: 'message',
      },
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const aliyunResponse = response as AliyunResponse;

    // 优先使用 choices 格式
    const choice = aliyunResponse.output?.choices?.[0];
    const content = choice?.message?.content || aliyunResponse.output?.text || '';

    return {
      content,
      usage: aliyunResponse.usage
        ? {
            promptTokens: aliyunResponse.usage.input_tokens,
            completionTokens: aliyunResponse.usage.output_tokens,
            totalTokens: aliyunResponse.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason || aliyunResponse.output?.finish_reason,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(line) as AliyunStreamResponse;

      // 优先使用 choices 格式
      const choice = data.output?.choices?.[0];
      const content = choice?.delta?.content ||
        choice?.message?.content ||
        data.output?.text || '';

      return {
        content,
        finishReason: choice?.finish_reason || data.output?.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
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
      const errorResponse = JSON.parse(data) as AliyunErrorResponse;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      return {
        code: errorResponse.code || 'unknown_error',
        message: errorResponse.message || '未知错误',
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
    const body = this.buildRequestBody(request);
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
    // 阿里云流式请求需要添加 incremental_output 参数
    const requestBody = this.buildRequestBody(request) as { model: string; input: object; parameters?: Record<string, unknown> };
    const body = {
      model: requestBody.model,
      input: requestBody.input,
      parameters: {
        ...(requestBody.parameters || {}),
        incremental_output: true,
      },
    };

    // 修改请求头以支持流式
    if (!this.config) {
      throw this.createError('adapter_not_initialized', '适配器未初始化', 'unknown', false);
    }

    const baseUrl = this.getBaseUrl();
    const endpoint = this.getEndpoint();
    const url = new URL(endpoint, baseUrl);

    const postData = JSON.stringify(body);
    const headers = {
      ...this.getHeaders(),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'text/event-stream',
      'X-DashScope-SSE': 'enable',
    };

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers,
      timeout: this.config.timeout,
    };

    return new Promise((resolve, reject) => {
      const https = require('https');
      let completed = false;

      const req = https.request(options, (res: any) => {
        this.activeStreamRequest = req;
        this.activeStreamResponse = res;
        const statusCode = res.statusCode || 0;

        if (statusCode < 200 || statusCode >= 300) {
          let errorBody = '';
          res.on('data', (chunk: Buffer) => {
            errorBody += chunk.toString();
          });
          res.on('end', () => {
            const error = this.parseErrorResponse(errorBody, statusCode);
            callbacks.onError(error);
            reject(error);
          });
          res.on('error', () => {
            const error = this.createError('stream_error', '流式响应错误', 'network', true);
            callbacks.onError(error);
            reject(error);
          });
          return;
        }

        let buffer = '';

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') {
                if (!completed) {
                  completed = true;
                  callbacks.onComplete();
                  resolve();
                }
                return;
              }

              try {
                const chunk = this.parseStreamLine(data);
                if (chunk) {
                  callbacks.onChunk(chunk);
                }
              } catch (e) {
                // 忽略解析失败的行
              }
            }
          }
        });

        res.on('end', () => {
          this.activeStreamRequest = null;
          this.activeStreamResponse = null;
          if (!completed) {
            completed = true;
            callbacks.onComplete();
            resolve();
          }
        });

        res.on('error', (error: Error) => {
          this.activeStreamRequest = null;
          this.activeStreamResponse = null;
          if (!completed) {
            completed = true;
            const aiError = this.createError('stream_error', error.message, 'network', true);
            callbacks.onError(aiError);
            reject(aiError);
          }
        });
      });

      req.on('error', (error: Error) => {
        this.activeStreamRequest = null;
        this.activeStreamResponse = null;
        const aiError = this.createError('network_error', error.message, 'network', true);
        callbacks.onError(aiError);
        reject(aiError);
      });

      req.on('timeout', () => {
        this.activeStreamRequest = null;
        this.activeStreamResponse = null;
        req.destroy();
        const aiError = this.createError('timeout', '请求超时', 'timeout', true);
        callbacks.onError(aiError);
        reject(aiError);
      });

      req.write(postData);
      req.end();
    });
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
    return ALIYUN_MODELS;
  }
}
