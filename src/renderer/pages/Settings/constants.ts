/**
 * AI 设置页面常量配置
 */

import type { AIProviderConfig, AIProvider } from '../../../types/novel';

// AI 提供商配置映射
export const AI_PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  openai: {
    name: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requireApiKey: true,
    models: [],
  },
  anthropic: {
    name: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requireApiKey: true,
    models: [],
  },
  google: {
    name: 'google',
    label: 'Google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1',
    requireApiKey: true,
    models: [],
  },
  aliyun: {
    name: 'aliyun',
    label: '阿里云',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    requireApiKey: true,
    models: [],
  },
  baidu: {
    name: 'baidu',
    label: '百度',
    defaultBaseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    requireApiKey: true,
    models: [],
  },
  bytedance: {
    name: 'bytedance',
    label: '字节跳动',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    requireApiKey: true,
    models: [],
  },
  zhipu: {
    name: 'zhipu',
    label: '智谱AI',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requireApiKey: true,
    models: [],
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

// 获取指定提供商的默认基础 URL
export function getDefaultBaseUrl(provider: AIProvider): string {
  return AI_PROVIDER_CONFIGS[provider]?.defaultBaseUrl || '';
}
