/**
 * 编辑器设置标签页组件
 */

import React from 'react';
import {
  Form,
  Select,
  Switch,
  Radio,
  Space,
  Typography,
  Card,
} from 'antd';
import {
  EditOutlined,
  FontSizeOutlined,
  ColumnWidthOutlined,
  AlignLeftOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { EditorSettings } from '../../../../types/novel';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  AUTO_SAVE_INTERVAL_OPTIONS,
  LINE_HEIGHT_OPTIONS,
} from '../constants';

const { Text } = Typography;
const { Option } = Select;

interface EditorSettingsTabProps {
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
}

const EditorSettingsTab: React.FC<EditorSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const [form] = Form.useForm<EditorSettings>();

  const handleValuesChange = (_changedValues: Partial<EditorSettings>, allValues: EditorSettings) => {
    onChange(allValues);
  };

  return (
    <div className="editor-settings-tab">
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onValuesChange={handleValuesChange}
        className="settings-form"
      >
        {/* 自动保存设置 */}
        <Card
          size="small"
          title={
            <Space>
              <EditOutlined />
              <span>自动保存</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="autoSave"
            label="启用自动保存"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {settings.autoSave && (
            <Form.Item
              name="autoSaveInterval"
              label="自动保存间隔"
            >
              <Select style={{ width: 200 }}>
                {AUTO_SAVE_INTERVAL_OPTIONS.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Card>

        {/* 字体设置 */}
        <Card
          size="small"
          title={
            <Space>
              <FontSizeOutlined />
              <span>字体设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="fontFamily"
            label="字体"
          >
            <Select style={{ width: 300 }}>
              {FONT_FAMILY_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  <span style={{ fontFamily: option.value }}>{option.label}</span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="fontSize"
            label="字体大小"
          >
            <Radio.Group>
              {FONT_SIZE_OPTIONS.map((size) => (
                <Radio.Button key={size} value={size}>
                  {size}px
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="lineHeight"
            label="行高"
          >
            <Select style={{ width: 200 }}>
              {LINE_HEIGHT_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        {/* 显示设置 */}
        <Card
          size="small"
          title={
            <Space>
              <ColumnWidthOutlined />
              <span>显示设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="showLineNumbers"
            label="显示行号"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="wordWrap"
            label="自动换行"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="enableMarkdownPreview"
            label="启用 Markdown 预览"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 工具栏设置 */}
        <Card
          size="small"
          title={
            <Space>
              <ToolOutlined />
              <span>工具栏设置</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="toolbarVisible"
            label="显示工具栏"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="enableSpellCheck"
            label="启用拼写检查"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 写作模式 */}
        <Card
          size="small"
          title={
            <Space>
              <AlignLeftOutlined />
              <span>默认写作模式</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="defaultWritingMode"
            label="写作模式"
          >
            <Radio.Group>
              <Radio.Button value="normal">普通模式</Radio.Button>
              <Radio.Button value="focus">专注模式</Radio.Button>
              <Radio.Button value="typewriter">打字机模式</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            专注模式：隐藏干扰元素，专注于写作
            <br />
            打字机模式：当前行保持在屏幕中央
          </Text>
        </Card>

        {/* 预览区域 */}
        <Card
          size="small"
          title="预览"
          style={{ backgroundColor: '#f5f5f5' }}
        >
          <div
            style={{
              padding: 16,
              backgroundColor: '#fff',
              borderRadius: 4,
              fontFamily: settings.fontFamily,
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
            }}
          >
            <p style={{ margin: 0 }}>
              这是预览文本。The quick brown fox jumps over the lazy dog.
            </p>
            <p style={{ margin: '0.5em 0 0 0' }}>
              落霞与孤鹜齐飞，秋水共长天一色。
            </p>
          </div>
        </Card>
      </Form>
    </div>
  );
};

export default EditorSettingsTab;
