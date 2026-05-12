/**
 * 通用设置标签页组件
 */

import React from 'react';
import {
  Form,
  Select,
  Switch,
  InputNumber,
  Radio,
  Space,
  Typography,
  Card,
} from 'antd';
import {
  BgColorsOutlined,
  GlobalOutlined,
  SafetyOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { AppSettings } from '../../../../types/novel';

const { Text } = Typography;
const { Option } = Select;

interface GeneralSettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const [form] = Form.useForm<AppSettings>();

  const handleValuesChange = (_changedValues: Partial<AppSettings>, allValues: AppSettings) => {
    onChange(allValues);
  };

  return (
    <div className="general-settings-tab">
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onValuesChange={handleValuesChange}
        className="settings-form"
      >
        {/* 外观设置 */}
        <Card
          size="small"
          title={
            <Space>
              <BgColorsOutlined />
              <span>外观设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="theme"
            label="主题模式"
          >
            <Radio.Group>
              <Radio.Button value="light">浅色模式</Radio.Button>
              <Radio.Button value="dark">深色模式</Radio.Button>
              <Radio.Button value="system">跟随系统</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="sidebarCollapsed"
            label="默认收起侧边栏"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 语言设置 */}
        <Card
          size="small"
          title={
            <Space>
              <GlobalOutlined />
              <span>语言设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="language"
            label="界面语言"
          >
            <Select style={{ width: 200 }}>
              <Option value="zh-CN">简体中文</Option>
              <Option value="zh-TW">繁体中文</Option>
              <Option value="en">English</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* 备份设置 */}
        <Card
          size="small"
          title={
            <Space>
              <SafetyOutlined />
              <span>备份设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="backupEnabled"
            label="启用自动备份"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {settings.backupEnabled && (
            <>
              <Form.Item
                name="backupInterval"
                label="备份间隔（小时）"
              >
                <InputNumber
                  min={1}
                  max={168}
                  style={{ width: 200 }}
                />
              </Form.Item>

              <Form.Item
                name="backupCount"
                label="保留备份数量"
              >
                <InputNumber
                  min={1}
                  max={50}
                  style={{ width: 200 }}
                />
              </Form.Item>
            </>
          )}
        </Card>

        {/* 存储设置 */}
        <Card
          size="small"
          title={
            <Space>
              <DatabaseOutlined />
              <span>存储设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="maxRecentNovels"
            label="最近作品显示数量"
          >
            <InputNumber
              min={5}
              max={50}
              style={{ width: 200 }}
            />
          </Form.Item>
        </Card>

        {/* 说明信息 */}
        <Card size="small" style={{ backgroundColor: '#e6f7ff' }}>
          <Text type="secondary">
            提示：部分设置需要重启应用后才能生效。
          </Text>
        </Card>
      </Form>
    </div>
  );
};

export default GeneralSettingsTab;
