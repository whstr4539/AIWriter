/**
 * AI 设置页面常量配置
 */

import type { AIProviderConfig, AIProvider, AIModelInfo } from '../../../types/novel';

// AI 提供商配置映射
export const AI_PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  openai: {
    name: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requireApiKey: true,
    models: [
      { id: 'gpt-4', name: 'GPT-4', description: '最强大的模型，适合复杂任务', maxTokens: 8192 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 的优化版本，更快更便宜', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速且经济实惠', maxTokens: 16385 },
    ],
  },
  anthropic: {
    name: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requireApiKey: true,
    models: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', description: '最强大的 Claude 模型', maxTokens: 200000 },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: '平衡性能和速度', maxTokens: 200000 },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: '最快的响应速度', maxTokens: 200000 },
    ],
  },
  google: {
    name: 'google',
    label: 'Google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1',
    requireApiKey: true,
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google 的通用模型', maxTokens: 32768 },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: '支持视觉输入', maxTokens: 32768, supportsVision: true },
    ],
  },
  aliyun: {
    name: 'aliyun',
    label: '阿里云',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    requireApiKey: true,
    models: [
      { id: 'qwen-turbo', name: '通义千问 Turbo', description: '快速响应版本', maxTokens: 8000 },
      { id: 'qwen-plus', name: '通义千问 Plus', description: '平衡版本', maxTokens: 32000 },
      { id: 'qwen-max', name: '通义千问 Max', description: '最强性能版本', maxTokens: 32000 },
    ],
  },
  baidu: {
    name: 'baidu',
    label: '百度',
    defaultBaseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    requireApiKey: true,
    models: [
      { id: 'ernie-bot', name: 'ERNIE-Bot', description: '百度文心一言', maxTokens: 4096 },
      { id: 'ernie-bot-turbo', name: 'ERNIE-Bot Turbo', description: '文心一言快速版', maxTokens: 4096 },
    ],
  },
  bytedance: {
    name: 'bytedance',
    label: '字节跳动',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    requireApiKey: true,
    models: [
      { id: 'doubao-pro', name: 'Doubao Pro', description: '豆包专业版', maxTokens: 4096 },
      { id: 'doubao-lite', name: 'Doubao Lite', description: '豆包轻量版', maxTokens: 4096 },
    ],
  },
  zhipu: {
    name: 'zhipu',
    label: '智谱AI',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requireApiKey: true,
    models: [
      { id: 'glm-4', name: 'GLM-4', description: '智谱最新大模型', maxTokens: 128000 },
      { id: 'glm-4-air', name: 'GLM-4 Air', description: '高性价比版本', maxTokens: 128000 },
      { id: 'glm-3-turbo', name: 'GLM-3 Turbo', description: '快速响应版本', maxTokens: 128000 },
    ],
  },
  custom: {
    name: 'custom',
    label: '自定义',
    defaultBaseUrl: '',
    requireApiKey: true,
    models: [], // 自定义提供商，用户自行输入模型名称
  },
};

// 提供商选项（用于下拉选择）
export const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'aliyun', label: '阿里云' },
  { value: 'baidu', label: '百度' },
  { value: 'bytedance', label: '字节跳动' },
  { value: 'zhipu', label: '智谱AI' },
  { value: 'custom', label: '自定义' },
];

// 温度参数说明
export const TEMPERATURE_DESCRIPTION =
  '温度参数控制输出的随机性。较低的值使输出更确定和集中，较高的值使输出更随机和创造性。';

// 默认 AI 设置
export const DEFAULT_AI_SETTINGS = {
  provider: 'openai' as AIProvider,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 30000,
};

// 默认编辑器设置
export const DEFAULT_EDITOR_SETTINGS = {
  autoSave: true,
  autoSaveInterval: 5,
  fontSize: 16,
  fontFamily: 'system-ui',
  lineHeight: 1.8,
  showLineNumbers: false,
  wordWrap: true,
  enableSpellCheck: true,
  enableMarkdownPreview: false,
  toolbarVisible: true,
  defaultWritingMode: 'normal' as const,
};

// 字体选项
export const FONT_FAMILY_OPTIONS = [
  { value: 'system-ui', label: '系统默认' },
  { value: '"Noto Serif SC", "Source Han Serif SC", serif', label: '思源宋体' },
  { value: '"Noto Sans SC", "Source Han Sans SC", sans-serif', label: '思源黑体' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: '"Courier New", monospace', label: '等宽字体' },
];

// 字体大小选项
export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 22, 24];

// 自动保存间隔选项
export const AUTO_SAVE_INTERVAL_OPTIONS = [
  { value: 1, label: '1 分钟' },
  { value: 3, label: '3 分钟' },
  { value: 5, label: '5 分钟' },
  { value: 10, label: '10 分钟' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
];

// 行高选项
export const LINE_HEIGHT_OPTIONS = [
  { value: 1.5, label: '紧凑 (1.5)' },
  { value: 1.8, label: '舒适 (1.8)' },
  { value: 2.0, label: '宽松 (2.0)' },
  { value: 2.5, label: '极宽 (2.5)' },
];

// 超时选项
export const TIMEOUT_OPTIONS = [
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 120000, label: '2 分钟' },
];

// 获取指定提供商的模型列表
export function getModelsByProvider(provider: AIProvider): AIModelInfo[] {
  return AI_PROVIDER_CONFIGS[provider]?.models || [];
}

// 获取指定提供商的默认基础 URL
export function getDefaultBaseUrl(provider: AIProvider): string {
  return AI_PROVIDER_CONFIGS[provider]?.defaultBaseUrl || '';
}

// 获取指定模型信息
export function getModelInfo(provider: AIProvider, modelId: string): AIModelInfo | undefined {
  const models = getModelsByProvider(provider);
  return models.find((m) => m.id === modelId);
}
