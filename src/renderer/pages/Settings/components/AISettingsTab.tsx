/**
 * AI 设置标签页组件
 */

import React, { useState, useCallback } from 'react';
import {
  Form,
  Select,
  Input,
  Slider,
  InputNumber,
  Button,
  Space,
  Card,
  Alert,
  Typography,
  Tooltip,
  message,
} from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { AISettings, AIProvider, AITestResult } from '../../../../types/novel';
import {
  AI_PROVIDER_CONFIGS,
  PROVIDER_OPTIONS,
  TIMEOUT_OPTIONS,
  TEMPERATURE_DESCRIPTION,
  getModelsByProvider,
  getDefaultBaseUrl,
  getModelInfo,
} from '../constants';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface AISettingsTabProps {
  settings: AISettings;
  onChange: (settings: AISettings) => void;
  onTestConnection?: (settings: AISettings) => Promise<AITestResult>;
}

const AISettingsTab: React.FC<AISettingsTabProps> = ({
  settings,
  onChange,
  onTestConnection,
}) => {
  const [form] = Form.useForm<AISettings>();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AITestResult | null>(null);
  const [availableModels, setAvailableModels] = useState(getModelsByProvider(settings.provider));

  // 当提供商改变时更新模型列表
  const handleProviderChange = useCallback(
    (provider: AIProvider) => {
      const models = getModelsByProvider(provider);
      setAvailableModels(models);

      // 自动选择第一个可用模型，或清空（自定义提供商）
      const newModel = models.length > 0 ? models[0].id : '';
      const defaultBaseUrl = getDefaultBaseUrl(provider);

      const newSettings: AISettings = {
        ...settings,
        provider,
        model: newModel,
        baseUrl: provider === 'custom' ? '' : defaultBaseUrl,
      };

      form.setFieldsValue({
        provider,
        model: newModel,
        baseUrl: provider === 'custom' ? '' : defaultBaseUrl,
      });

      onChange(newSettings);
    },
    [settings, form, onChange]
  );

  // 处理表单值变化
  const handleValuesChange = useCallback(
    (changedValues: Partial<AISettings>, allValues: AISettings) => {
      // 如果改变了提供商，处理模型列表更新
      if (changedValues.provider && changedValues.provider !== settings.provider) {
        handleProviderChange(changedValues.provider);
        return;
      }

      onChange(allValues);
    },
    [settings, onChange, handleProviderChange]
  );

  // 测试连接
  const handleTestConnection = async () => {
    if (!onTestConnection) {
      message.warning('测试功能未实现');
      return;
    }

    const values = form.getFieldsValue();

    // 验证必填项
    if (!values.apiKey) {
      message.error('请输入 API Key');
      return;
    }

    if (values.provider === 'custom' && !values.baseUrl) {
      message.error('自定义提供商需要填写 Base URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTestConnection(values);
      setTestResult(result);

      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试连接失败';
      setTestResult({
        success: false,
        message: errorMessage,
      });
      message.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  // 获取当前模型的最大 token 数
  const currentModelInfo = getModelInfo(settings.provider, settings.model);
  const maxTokensLimit = currentModelInfo?.maxTokens || 4096;

  // 获取当前提供商配置
  const providerConfig = AI_PROVIDER_CONFIGS[settings.provider];
  const isCustomProvider = settings.provider === 'custom';

  return (
    <div className="ai-settings-tab">
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onValuesChange={handleValuesChange}
        className="settings-form"
      >
        {/* 提供商选择 */}
        <Form.Item
          name="provider"
          label="AI 提供商"
          rules={[{ required: true, message: '请选择 AI 提供商' }]}
        >
          <Select placeholder="选择 AI 提供商" style={{ width: 300 }}>
            {PROVIDER_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 自定义提供商名称（仅自定义提供商显示） */}
        {isCustomProvider && (
          <Form.Item
            name="customProviderName"
            label="提供商名称"
            rules={[{ required: true, message: '请输入提供商名称' }]}
          >
            <Input placeholder="例如：我的 OpenAI 兼容服务" style={{ width: 400 }} />
          </Form.Item>
        )}

        {/* API Key */}
        <Form.Item
          name="apiKey"
          label={
            <Space>
              API Key
              <Tooltip title="您的 API Key 将被加密存储在本地">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          rules={[{ required: true, message: '请输入 API Key' }]}
        >
          <Input.Password
            placeholder="请输入 API Key"
            style={{ width: 400 }}
            visibilityToggle={{
              visible: apiKeyVisible,
              onVisibleChange: setApiKeyVisible,
            }}
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        {/* Base URL（自定义提供商时必填） */}
        <Form.Item
          name="baseUrl"
          label={
            <Space>
              API Base URL
              {isCustomProvider && <Text type="danger">*</Text>}
            </Space>
          }
          rules={[
            {
              required: isCustomProvider,
              message: '自定义提供商需要填写 Base URL',
            },
          ]}
          extra={
            !isCustomProvider && (
              <Text type="secondary">使用默认值：{providerConfig.defaultBaseUrl}</Text>
            )
          }
        >
          <Input
            placeholder={isCustomProvider ? 'https://api.example.com/v1' : providerConfig.defaultBaseUrl}
            style={{ width: 400 }}
            disabled={!isCustomProvider}
          />
        </Form.Item>

        {/* 模型选择 */}
        <Form.Item
          name="model"
          label="模型"
          rules={[{ required: true, message: '请选择或输入模型名称' }]}
        >
          <Select
            placeholder="选择模型"
            style={{ width: 400 }}
            mode={undefined}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    或直接在下框中输入自定义模型名称：
                  </Text>
                  <Input
                    style={{ marginTop: 4 }}
                    placeholder="输入自定义模型 ID"
                    value={form.getFieldValue('model') && !availableModels.find(m => m.id === form.getFieldValue('model')) ? form.getFieldValue('model') : ''}
                    onChange={(e) => {
                      form.setFieldValue('model', e.target.value);
                      onChange({ ...settings, model: e.target.value });
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </>
            )}
          >
            {availableModels.map((model) => (
              <Option key={model.id} value={model.id}>
                <div>
                  <div>{model.name}</div>
                  {model.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {model.description} (最大 {model.maxTokens.toLocaleString()} tokens)
                    </Text>
                  )}
                </div>
              </Option>
            ))}
            {form.getFieldValue('model') && !availableModels.find(m => m.id === form.getFieldValue('model')) && (
              <Option key={form.getFieldValue('model')} value={form.getFieldValue('model')}>
                <div>
                  <div>自定义: {form.getFieldValue('model')}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>用户自定义模型</Text>
                </div>
              </Option>
            )}
          </Select>
        </Form.Item>

        {/* 温度参数 */}
        <Form.Item
          name="temperature"
          label={
            <Space>
              温度参数 (Temperature)
              <Tooltip title={TEMPERATURE_DESCRIPTION}>
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              onChange={(value) => {
                form.setFieldValue('temperature', value);
                onChange({ ...settings, temperature: value });
              }}
              style={{ flex: 1, maxWidth: 300 }}
            />
            <InputNumber
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              onChange={(value) => {
                form.setFieldValue('temperature', value);
                onChange({ ...settings, temperature: value || 0.7 });
              }}
              style={{ width: 80 }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {settings.temperature < 0.5 && '更确定、更集中的输出'}
              {settings.temperature >= 0.5 && settings.temperature < 1.0 && '平衡创意和确定性'}
              {settings.temperature >= 1.0 && settings.temperature < 1.5 && '更有创意的输出'}
              {settings.temperature >= 1.5 && '高度随机和创造性的输出'}
            </Text>
          </div>
        </Form.Item>

        {/* 最大 Token 数 */}
        <Form.Item
          name="maxTokens"
          label={
            <Space>
              最大 Token 数
              <Tooltip title={`当前模型最大支持 ${maxTokensLimit.toLocaleString()} tokens`}>
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          rules={[
            { required: true, message: '请输入最大 Token 数' },
            {
              type: 'number',
              max: maxTokensLimit,
              message: `不能超过模型最大限制 (${maxTokensLimit.toLocaleString()})`,
            },
          ]}
        >
          <InputNumber
            min={100}
            max={maxTokensLimit}
            step={100}
            style={{ width: 200 }}
            placeholder={`100 - ${maxTokensLimit.toLocaleString()}`}
          />
        </Form.Item>

        {/* 超时设置 */}
        <Form.Item name="timeout" label="请求超时时间">
          <Select style={{ width: 200 }}>
            {TIMEOUT_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 测试连接按钮 */}
        <Form.Item>
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
            loading={testing}
            disabled={testing}
          >
            测试连接
          </Button>
        </Form.Item>

        {/* 测试结果 */}
        {testResult && (
          <Form.Item>
            <Alert
              message={testResult.success ? '连接成功' : '连接失败'}
              description={
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Text>{testResult.message}</Text>
                  {testResult.latency && (
                    <Text type="secondary">响应时间: {testResult.latency}ms</Text>
                  )}
                </Space>
              }
              type={testResult.success ? 'success' : 'error'}
              showIcon
              icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              closable
              onClose={() => setTestResult(null)}
            />
          </Form.Item>
        )}

        {/* 提示信息 */}
        <Card size="small" style={{ marginTop: 16, backgroundColor: '#f6ffed' }}>
          <Paragraph style={{ margin: 0 }}>
            <InfoCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            <Text strong>提示：</Text>
          </Paragraph>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 24 }}>
            <li>API Key 将被加密存储在本地配置文件中</li>
            <li>建议定期更换 API Key 以确保安全</li>
            <li>不同提供商的计费方式可能不同，请注意控制使用量</li>
            <li>如遇到连接问题，请检查网络设置和 API Key 有效性</li>
          </ul>
        </Card>
      </Form>
    </div>
  );
};

export default AISettingsTab;
