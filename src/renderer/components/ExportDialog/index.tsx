/**
 * 导出对话框组件
 * 支持导出作品为多种格式
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Radio,
  Checkbox,
  Button,
  Steps,
  Progress,
  Alert,
  Space,
  Typography,
  Divider,
  List,
  message,
} from 'antd';
import {
  FileTextOutlined,
  FileMarkdownOutlined,
  FileZipOutlined,
  ExportOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../api/ipc';
import type { Novel, ChapterInfo, ExportOptions, ExportFormat } from '../../../types/novel';
import './styles.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Group: RadioGroup } = Radio;

interface ExportDialogProps {
  open: boolean;
  novel: Novel | null;
  chapters: ChapterInfo[];
  onClose: () => void;
  onSuccess?: () => void;
}

// 导出格式选项
const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'json',
    label: 'JSON',
    icon: <FileZipOutlined />,
    desc: '完整数据备份，包含所有元数据和章节内容',
  },
  {
    value: 'md',
    label: 'Markdown',
    icon: <FileMarkdownOutlined />,
    desc: 'Markdown格式，适合发布到支持Markdown的平台',
  },
  {
    value: 'txt',
    label: '纯文本',
    icon: <FileTextOutlined />,
    desc: '纯文本格式，去除所有格式标记',
  },
  {
    value: 'docx',
    label: 'Word (HTML)',
    icon: <FileTextOutlined />,
    desc: '导出为HTML格式（可转换为Word）',
  },
];

// 章节分隔符选项
const separatorOptions = [
  { value: '\n\n---\n\n', label: '分隔线 (---)' },
  { value: '\n\n==========\n\n', label: '等号线 (===)' },
  { value: '\n\n', label: '双换行' },
  { value: '\n', label: '单换行' },
];

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  novel,
  chapters,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [exportResult, setExportResult] = useState<{ success: boolean; filePath?: string; error?: string } | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setExportStatus('idle');
      setExportProgress(0);
      setExportResult(null);
      setSelectedChapters(chapters.map(ch => ch.id));
      form.resetFields();
      form.setFieldsValue({
        format: 'md',
        scope: 'all',
        includeTitle: true,
        includeAuthor: true,
        includeSummary: true,
        includeMetadata: true,
        chapterSeparator: '\n\n---\n\n',
        encoding: 'utf8',
        compress: false,
      });
    }
  }, [open, chapters, form]);

  // 处理选择章节变化
  const handleChapterSelectionChange = (checkedValues: string[]) => {
    setSelectedChapters(checkedValues);
  };

  // 获取文件扩展名
  const getFileExtension = (format: ExportFormat, compress: boolean): string => {
    if (compress) return '.zip';
    switch (format) {
      case 'json': return '.json';
      case 'md': return '.md';
      case 'txt': return '.txt';
      case 'docx': return '.html';
      default: return '.txt';
    }
  };

  // 处理导出
  const handleExport = async () => {
    if (!novel) return;

    try {
      const values = await form.validateFields();
      setLoading(true);
      setExportStatus('exporting');

      // 模拟进度
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      // 选择保存路径
      const extension = getFileExtension(values.format, values.compress);
      const defaultFileName = `${novel.title}${extension}`;

      const dialogResult = await api.dialog.showSave({
        defaultPath: defaultFileName,
        filters: [
          {
            name: values.compress ? 'ZIP压缩包' : `${values.format.toUpperCase()}文件`,
            extensions: [values.compress ? 'zip' : values.format === 'docx' ? 'html' : values.format],
          },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (dialogResult.canceled || !dialogResult.data) {
        clearInterval(progressInterval);
        setLoading(false);
        setExportStatus('idle');
        setExportProgress(0);
        return;
      }

      const exportPath = dialogResult.data;

      // 构建导出选项
      const exportOptions: ExportOptions = {
        format: values.format,
        scope: values.scope,
        selectedChapters: values.scope === 'selected' ? selectedChapters : undefined,
        includeTitle: values.includeTitle,
        includeAuthor: values.includeAuthor,
        includeSummary: values.includeSummary,
        includeMetadata: values.includeMetadata,
        chapterSeparator: values.chapterSeparator,
        encoding: values.encoding,
        compress: values.compress,
      };

      // 执行导出
      const result = await api.exportImport.export(novel.id, exportOptions, exportPath);

      clearInterval(progressInterval);
      setExportProgress(100);

      if (result.success) {
        setExportStatus('success');
        setExportResult({ success: true, filePath: result.data });
        message.success('导出成功');
        onSuccess?.();
      } else {
        setExportStatus('error');
        setExportResult({ success: false, error: result.error });
        message.error(result.error || '导出失败');
      }
    } catch (error) {
      setExportStatus('error');
      setExportResult({ success: false, error: error instanceof Error ? error.message : '导出失败' });
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // 渲染步骤1：选择格式和范围
  const renderStep1 = () => (
    <Form form={form} layout="vertical" className="export-form">
      <Form.Item
        name="format"
        label="导出格式"
        rules={[{ required: true, message: '请选择导出格式' }]}
      >
        <RadioGroup>
          <Space orientation="vertical" style={{ width: '100%' }}>
            {formatOptions.map(option => (
              <Radio.Button key={option.value} value={option.value} className="format-option">
                <Space align="start">
                  {option.icon}
                  <div>
                    <div className="format-label">{option.label}</div>
                    <div className="format-desc">{option.desc}</div>
                  </div>
                </Space>
              </Radio.Button>
            ))}
          </Space>
        </RadioGroup>
      </Form.Item>

      <Divider />

      <Form.Item
        name="scope"
        label="导出范围"
        rules={[{ required: true }]}
      >
        <RadioGroup>
          <Radio value="all">导出全部章节 ({chapters.length}章)</Radio>
          <Radio value="selected">导出选中章节</Radio>
        </RadioGroup>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.scope !== curr.scope}>
        {({ getFieldValue }) =>
          getFieldValue('scope') === 'selected' ? (
            <div className="chapter-selection">
              <Text type="secondary">已选择 {selectedChapters.length} 章</Text>
              <Checkbox.Group
                value={selectedChapters}
                onChange={handleChapterSelectionChange}
                style={{ width: '100%', marginTop: 8 }}
              >
                <List
                  size="small"
                  dataSource={chapters}
                  renderItem={(chapter, index) => (
                    <List.Item>
                      <Checkbox value={chapter.id}>
                        第{index + 1}章：{chapter.title}
                      </Checkbox>
                    </List.Item>
                  )}
                  style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 4 }}
                />
              </Checkbox.Group>
            </div>
          ) : null
        }
      </Form.Item>
    </Form>
  );

  // 渲染步骤2：导出选项
  const renderStep2 = () => (
    <Form form={form} layout="vertical" className="export-form">
      <Title level={5}>内容选项</Title>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Form.Item name="includeTitle" valuePropName="checked" noStyle>
          <Checkbox>包含作品标题</Checkbox>
        </Form.Item>
        <Form.Item name="includeAuthor" valuePropName="checked" noStyle>
          <Checkbox>包含作者信息</Checkbox>
        </Form.Item>
        <Form.Item name="includeSummary" valuePropName="checked" noStyle>
          <Checkbox>包含作品简介</Checkbox>
        </Form.Item>
        <Form.Item name="includeMetadata" valuePropName="checked" noStyle>
          <Checkbox>包含元数据（导出时间、字数等）</Checkbox>
        </Form.Item>
      </Space>

      <Divider />

      <Title level={5}>格式选项</Title>
      <Form.Item
        name="chapterSeparator"
        label="章节分隔符"
      >
        <Select>
          {separatorOptions.map(opt => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="encoding"
        label="文件编码"
      >
        <RadioGroup>
          <Radio value="utf8">UTF-8（推荐）</Radio>
          <Radio value="gbk">GBK（兼容旧版Windows）</Radio>
        </RadioGroup>
      </Form.Item>

      <Form.Item name="compress" valuePropName="checked">
        <Checkbox>压缩为ZIP文件</Checkbox>
      </Form.Item>
    </Form>
  );

  // 渲染步骤3：确认和导出
  const renderStep3 = () => {
    if (exportStatus === 'exporting') {
      return (
        <div className="export-progress">
          <Progress
            percent={exportProgress}
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <Text type="secondary">正在导出作品，请稍候...</Text>
        </div>
      );
    }

    if (exportStatus === 'success' && exportResult?.success) {
      return (
        <div className="export-result success">
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <Title level={4}>导出成功</Title>
          <Text type="secondary">文件已保存到：</Text>
          <Text code copyable>{exportResult.filePath}</Text>
        </div>
      );
    }

    if (exportStatus === 'error') {
      return (
        <div className="export-result error">
          <Alert
            message="导出失败"
            description={exportResult?.error || '未知错误'}
            type="error"
            showIcon
          />
          <Button onClick={() => setExportStatus('idle')} style={{ marginTop: 16 }}>
            重试
          </Button>
        </div>
      );
    }

    const values = form.getFieldsValue();
    const formatLabel = formatOptions.find(f => f.value === values.format)?.label;

    return (
      <div className="export-confirm">
        <Title level={5}>导出确认</Title>
        <div className="confirm-info">
          <div className="info-item">
            <Text type="secondary">作品名称：</Text>
            <Text strong>{novel?.title}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">导出格式：</Text>
            <Text>{formatLabel}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">导出范围：</Text>
            <Text>{values.scope === 'all' ? `全部章节 (${chapters.length}章)` : `选中章节 (${selectedChapters.length}章)`}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">包含内容：</Text>
            <Text>
              {[
                values.includeTitle && '标题',
                values.includeAuthor && '作者',
                values.includeSummary && '简介',
                values.includeMetadata && '元数据',
              ].filter(Boolean).join('、') || '无'}
            </Text>
          </div>
          {values.compress && (
            <div className="info-item">
              <Text type="secondary">压缩：</Text>
              <Text>是（ZIP格式）</Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 步骤内容
  const steps = [
    { title: '选择格式', content: renderStep1() },
    { title: '导出选项', content: renderStep2() },
    { title: '确认导出', content: renderStep3() },
  ];

  // 下一步
  const handleNext = async () => {
    if (currentStep === 0) {
      const values = await form.validateFields(['format', 'scope']);
      if (values.scope === 'selected' && selectedChapters.length === 0) {
        message.error('请至少选择一个章节');
        return;
      }
    }

    if (currentStep === 2) {
      await handleExport();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <Modal
      title={
        <Space>
          <ExportOutlined />
          <span>导出作品</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        exportStatus === 'success' ? (
          <Button type="primary" onClick={handleClose}>
            完成
          </Button>
        ) : (
          <Space>
            {currentStep > 0 && exportStatus !== 'exporting' && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            {currentStep < 2 && (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep === 2 && exportStatus !== 'exporting' && (
              <Button type="primary" loading={loading} onClick={handleNext} icon={<ExportOutlined />}>
                开始导出
              </Button>
            )}
          </Space>
        )
      }
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={steps.map(step => ({ title: step.title, key: step.title }))}
      />

      <div className="steps-content">{steps[currentStep].content}</div>
    </Modal>
  );
};

export default ExportDialog;
