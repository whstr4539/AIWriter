/**
 * AI适配器基类
 * 提供通用的HTTP请求处理和错误处理逻辑
 */

import type {
  IAIAdapter,
  AdapterConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
  AIError,
  AIErrorType,
  StreamCallbacks,
} from './types';
import type { AIProvider, AIModelInfo } from '../../types/novel';

// 使用Node.js内置的https模块
import https from 'https';
import http from 'http';
import { URL } from 'url';

export abstract class BaseAdapter implements IAIAdapter {
  abstract readonly provider: AIProvider;
  abstract readonly name: string;

  protected config: AdapterConfig | null = null;
  protected abstract readonly defaultBaseUrl: string;
  protected abstract readonly apiVersion: string;

  /**
   * 初始化适配器
   */
  initialize(config: AdapterConfig): void {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || this.defaultBaseUrl,
    };
  }

  /**
   * 获取完整的基础URL
   */
  protected getBaseUrl(): string {
    return this.config?.baseUrl || this.defaultBaseUrl;
  }

  /**
   * 获取请求头
   */
  protected abstract getHeaders(): Record<string, string>;

  /**
   * 获取API端点路径
   */
  protected abstract getEndpoint(): string;

  /**
   * 发送HTTP请求（非流式）
   */
  protected async makeRequest(body: unknown): Promise<unknown> {
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
    };

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers,
      timeout: this.config.timeout,
    };

    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const statusCode = res.statusCode || 0;

            if (statusCode >= 200 && statusCode < 300) {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } else {
              const error = this.parseErrorResponse(data, statusCode);
              reject(error);
            }
          } catch (e) {
            reject(this.createError('parse_error', '解析响应失败', 'unknown', false));
          }
        });
      });

      req.on('error', (error) => {
        reject(this.createError('network_error', error.message, 'network', true));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(this.createError('timeout', '请求超时', 'timeout', true));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 发送HTTP请求（流式）
   */
  protected async makeStreamRequest(
    body: unknown,
    callbacks: StreamCallbacks
  ): Promise<void> {
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
    };

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers,
      timeout: this.config.timeout,
    };

    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(options, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                callbacks.onComplete();
                resolve();
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
          callbacks.onComplete();
          resolve();
        });

        res.on('error', (error) => {
          const aiError = this.createError('stream_error', error.message, 'network', true);
          callbacks.onError(aiError);
          reject(aiError);
        });
      });

      req.on('error', (error) => {
        const aiError = this.createError('network_error', error.message, 'network', true);
        callbacks.onError(aiError);
        reject(aiError);
      });

      req.on('timeout', () => {
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
   * 解析错误响应
   */
  protected abstract parseErrorResponse(data: string, statusCode: number): AIError;

  /**
   * 创建错误对象
   */
  protected createError(
    code: string,
    message: string,
    type: AIErrorType,
    retryable: boolean,
    statusCode?: number
  ): AIError {
    return {
      code,
      message,
      type,
      retryable,
      statusCode,
    };
  }

  /**
   * 根据HTTP状态码判断错误类型
   */
  protected getErrorTypeFromStatusCode(statusCode: number): AIErrorType {
    switch (statusCode) {
      case 401:
      case 403:
        return 'authentication';
      case 429:
        return 'rate_limit';
      case 400:
      case 422:
        return 'invalid_request';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'server_error';
      case 408:
        return 'timeout';
      default:
        return 'unknown';
    }
  }

  /**
   * 判断错误是否可重试
   */
  protected isRetryableError(statusCode: number): boolean {
    return statusCode === 429 || statusCode >= 500 || statusCode === 408;
  }

  // 抽象方法 - 子类必须实现
  abstract generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  abstract streamGenerate(
    request: AIGenerateRequest,
    callbacks: StreamCallbacks
  ): Promise<void>;
  abstract testConnection(): Promise<{ success: boolean; message: string; latency: number }>;
  abstract getAvailableModels(): Promise<AIModelInfo[]>;
  abstract buildRequestBody(request: AIGenerateRequest): unknown;
  abstract parseResponse(response: unknown): AIGenerateResponse;
  abstract parseStreamLine(line: string): AIStreamChunk | null;
}
