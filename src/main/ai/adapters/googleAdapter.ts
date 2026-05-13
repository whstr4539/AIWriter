/**
 * Google (Gemini) 适配器
 * 支持 Google Gemini API
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

// Google 模型列表
const GOOGLE_MODELS: AIModelInfo[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    description: '最快的多模态模型',
    maxTokens: 1048576,
    supportsVision: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: '强大的多模态模型',
    maxTokens: 2097152,
    supportsVision: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: '快速的多模态模型',
    maxTokens: 1048576,
    supportsVision: true,
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    description: '文本处理模型',
    maxTokens: 32768,
    supportsVision: false,
  },
];

// Google API 响应类型
interface GoogleResponse {
  candidates: {
    content: {
      role: string;
      parts: {
        text?: string;
      }[];
    };
    finishReason: string;
    index: number;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

// Google 流式响应类型
interface GoogleStreamResponse {
  candidates: {
    content: {
      role: string;
      parts: {
        text?: string;
      }[];
    };
    finishReason?: string;
    index: number;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// Google 错误响应
interface GoogleErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GoogleAdapter extends BaseAdapter {
  readonly provider: AIProvider = 'google';
  readonly name = 'Google (Gemini)';
  protected readonly defaultBaseUrl = 'https://generativelanguage.googleapis.com';
  protected readonly apiVersion = 'v1beta';

  /**
   * 获取请求头
   */
  protected getHeaders(): Record<string, string> {
    return {
      ...this.config?.headers,
    };
  }

  /**
   * 获取API端点
   */
  protected getEndpoint(): string {
    const model = this.config?.model || 'gemini-1.5-flash';
    return `/${this.apiVersion}/models/${model}:generateContent?key=${this.config?.apiKey || ''}`;
  }

  /**
   * 获取流式API端点
   */
  protected getStreamEndpoint(): string {
    const model = this.config?.model || 'gemini-1.5-flash';
    return `/${this.apiVersion}/models/${model}:streamGenerateContent?key=${this.config?.apiKey || ''}`;
  }

  /**
   * 转换消息格式
   * Google 使用 contents 格式，system 角色需要特殊处理
   */
  private convertMessages(messages: AIGenerateRequest['messages']): {
    systemInstruction?: { role: 'user' | 'model'; parts: { text: string }[] };
    contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const systemInstruction = systemMessages.length > 0
      ? {
          role: 'user' as const,
          parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }],
        }
      : undefined;

    const contents = otherMessages.map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    return {
      ...(systemInstruction ? { systemInstruction } : {}),
      contents,
    };
  }

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown {
    const { systemInstruction, contents } = this.convertMessages(request.messages);

    return {
      ...(systemInstruction ? { systemInstruction } : {}),
      contents,
      generationConfig: {
        temperature: request.temperature ?? this.config?.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? this.config?.maxTokens ?? 2048,
      },
    };
  }

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse {
    const googleResponse = response as GoogleResponse;
    const candidate = googleResponse.candidates[0];

    const content = candidate?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || '';

    return {
      content,
      usage: googleResponse.usageMetadata
        ? {
            promptTokens: googleResponse.usageMetadata.promptTokenCount,
            completionTokens: googleResponse.usageMetadata.candidatesTokenCount,
            totalTokens: googleResponse.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: candidate?.finishReason,
      model: googleResponse.modelVersion,
    };
  }

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null {
    try {
      // Google 流式响应每行是一个完整的 JSON 对象
      const data = JSON.parse(line) as GoogleStreamResponse;
      const candidate = data.candidates[0];

      if (!candidate) return null;

      const content = candidate.content?.parts
        ?.map((part) => part.text || '')
        .join('') || '';

      return {
        content,
        finishReason: candidate.finishReason,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
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
      const errorResponse = JSON.parse(data) as GoogleErrorResponse;
      const error = errorResponse.error;
      const type = this.getErrorTypeFromStatusCode(statusCode);
      const retryable = this.isRetryableError(statusCode);

      return {
        code: error?.status || 'unknown_error',
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
    if (!this.config) {
      throw this.createError('adapter_not_initialized', '适配器未初始化', 'unknown', false);
    }

    const baseUrl = this.getBaseUrl();
    const endpoint = this.getStreamEndpoint();
    const url = new URL(endpoint, baseUrl);

    const body = this.buildRequestBody(request);
    const postData = JSON.stringify(body);
    const headers = {
      ...this.getHeaders(),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
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
      // Gemini 流式返回的是累积内容，需要记录已处理的长度做 diff
      let previousContentLength = 0;

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
            if (!trimmed) continue;

            try {
              const chunk = this.parseStreamLine(trimmed);
              if (chunk) {
                // Gemini 返回累积内容，只取增量部分
                const delta = chunk.content.slice(previousContentLength);
                previousContentLength = chunk.content.length;

                if (delta) {
                  callbacks.onChunk({ content: delta });
                }
                if (chunk.finishReason) {
                  if (!completed) {
                    completed = true;
                    callbacks.onComplete();
                    resolve();
                  }
                  return;
                }
              }
            } catch (e) {
              // 忽略解析失败的行
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
    return GOOGLE_MODELS;
  }
}
