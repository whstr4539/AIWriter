/**
 * AI服务类型定义
 * 主进程内部使用
 */

import type { AISettings, AIProvider, AIModelInfo } from '../../types/novel';

// AI消息角色
export type AIMessageRole = 'system' | 'user' | 'assistant';

// AI消息
export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

// AI生成请求
export interface AIGenerateRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  model?: string;
}

// AI生成响应（非流式）
export interface AIGenerateResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  model?: string;
}

// AI流式响应块
export interface AIStreamChunk {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// AI错误类型
export type AIErrorType =
  | 'network'
  | 'authentication'
  | 'rate_limit'
  | 'invalid_request'
  | 'server_error'
  | 'timeout'
  | 'unknown';

// AI错误
export interface AIError {
  type: AIErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
}

// 适配器配置
export interface AdapterConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
  // 自定义请求头
  headers?: Record<string, string>;
}

// 流式回调函数
export interface StreamCallbacks {
  onChunk: (chunk: AIStreamChunk) => void;
  onError: (error: AIError) => void;
  onComplete: () => void;
}

// 适配器接口
export interface IAIAdapter {
  readonly provider: AIProvider;
  readonly name: string;

  /**
   * 初始化适配器
   */
  initialize(config: AdapterConfig): void;

  /**
   * 生成内容（非流式）
   */
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;

  /**
   * 流式生成内容
   */
  streamGenerate(
    request: AIGenerateRequest,
    callbacks: StreamCallbacks
  ): Promise<void>;

  /**
   * 测试连接
   */
  testConnection(): Promise<{ success: boolean; message: string; latency: number }>;

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): Promise<AIModelInfo[]>;

  /**
   * 构建请求体
   */
  buildRequestBody(request: AIGenerateRequest): unknown;

  /**
   * 解析响应
   */
  parseResponse(response: unknown): AIGenerateResponse;

  /**
   * 解析流式响应行
   */
  parseStreamLine(line: string): AIStreamChunk | null;
}

// 提供商配置信息
export interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  defaultBaseUrl: string;
  requireApiKey: boolean;
  models: AIModelInfo[];
  supportsStreaming: boolean;
  supportsVision: boolean;
}

// AI服务配置
export interface AIServiceConfig {
  settings: AISettings;
  // 是否启用日志
  enableLogging?: boolean;
  // 最大重试次数
  maxRetries?: number;
  // 重试延迟（毫秒）
  retryDelay?: number;
}

// 生成选项
export interface GenerateOptions {
  // 覆盖默认temperature
  temperature?: number;
  // 覆盖默认maxTokens
  maxTokens?: number;
  // 覆盖默认model
  model?: string;
  // 是否使用流式
  stream?: boolean;
  // 系统提示词
  systemPrompt?: string;
}

// 流式生成选项
export interface StreamGenerateOptions extends GenerateOptions {
  stream: true;
  onChunk: (chunk: AIStreamChunk) => void;
  onError?: (error: AIError) => void;
  onComplete?: () => void;
}

// AI生成结果
export interface AIGenerationResult {
  success: boolean;
  content?: string;
  error?: AIError;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

// 测试连接结果
export interface AITestConnectionResult {
  success: boolean;
  message: string;
  latency: number;
  modelAvailable: boolean;
  models?: AIModelInfo[];
}
