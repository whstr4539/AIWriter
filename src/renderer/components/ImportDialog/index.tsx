/**
 * 导入对话框组件
 * 支持从多种格式导入作品
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Upload,
  Steps,
  Progress,
  Alert,
  Space,
  Typography,
  List,
  Card,
  Tag,
  message,
  Empty,
  Spin,
} from 'antd';
import {
  UploadOutlined,
  ImportOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { api } from '../../api/ipc';
import type { ImportPreview, ImportConflictStrategy } from '../../../types/novel';
import './styles.css';

const { Title, Text } = Typography;

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileWithPreview {
  file: UploadFile;
  preview?: ImportPreview;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  error?: string;
}

// 获取文件图标
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return <FileMarkdownOutlined style={{ color: '#1890ff' }} />;
    case 'txt':
      return <FileTextOutlined style={{ color: '#52c41a' }} />;
    case 'json':
    case 'zip':
      return <FileZipOutlined style={{ color: '#faad14' }} />;
    default:
      return <FileUnknownOutlined style={{ color: '#8c8c8c' }} />;
  }
};

// 获取文件类型标签
const getFileTypeTag = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return <Tag color="blue">Markdown</Tag>;
    case 'txt':
      return <Tag color="green">纯文本</Tag>;
    case 'json':
      return <Tag color="orange">JSON</Tag>;
    case 'zip':
      return <Tag color="purple">ZIP</Tag>;
    default:
      return <Tag>未知</Tag>;
  }
};

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [_conflictStrategy, _setConflictStrategy] = useState<ImportConflictStrategy>('rename');
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setFileList([]);
      setFilesWithPreview([]);
      setImportStatus('idle');
      setImportProgress(0);
      setImportResult(null);
      _setConflictStrategy('rename');
    }
  }, [open]);

  // 上传配置
  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // 检查文件类型
      const validTypes = ['.txt', '.md', '.json', '.zip'];
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!validTypes.includes(ext)) {
        message.error(`不支持的文件类型: ${file.name}`);
        return Upload.LIST_IGNORE;
      }
      return false; // 阻止自动上传
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      // 初始化文件预览状态
      const newFilesWithPreview: FileWithPreview[] = newFileList.map(file => {
        const existing = filesWithPreview.find(f => f.file.uid === file.uid);
        return existing || { file, status: 'pending' };
      });
      setFilesWithPreview(newFilesWithPreview);
    },
    onRemove: (file) => {
      setFilesWithPreview(prev => prev.filter(f => f.file.uid !== file.uid));
      return true;
    },
  };

  // 加载文件预览
  const loadPreviews = async () => {
    if (filesWithPreview.length === 0) return;

    setLoading(true);

    for (const fileWithPreview of filesWithPreview) {
      if (fileWithPreview.status !== 'pending') continue;

      const file = fileWithPreview.file.originFileObj || fileWithPreview.file;
      if (!file) continue;

      // 更新状态为加载中
      setFilesWithPreview(prev =>
        prev.map(f =>
          f.file.uid === fileWithPreview.file.uid
            ? { ...f, status: 'loading' }
            : f
        )
      );

      try {
        // 创建临时文件路径
        const filePath = (file as any).path || file.name;

        // 调用预览API
        const result = await api.exportImport.previewImport(filePath);

        setFilesWithPreview(prev =>
          prev.map(f =>
            f.file.uid === fileWithPreview.file.uid
              ? {
                  ...f,
                  status: result.success ? 'loaded' : 'error',
                  preview: result.success ? result.data : undefined,
                  error: result.success ? undefined : result.error,
                }
              : f
          )
        );
      } catch (error) {
        setFilesWithPreview(prev =>
          prev.map(f =>
            f.file.uid === fileWithPreview.file.uid
              ? { ...f, status: 'error', error: '预览加载失败' }
              : f
          )
        );
      }
    }

    setLoading(false);
  };

  // 执行导入
  const handleImport = async () => {
    if (filesWithPreview.length === 0) return;

    setLoading(true);
    setImportStatus('importing');

    const validFiles = filesWithPreview.filter(f => f.status === 'loaded');
    const total = validFiles.length;
    let completed = 0;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const fileWithPreview of validFiles) {
      const file = fileWithPreview.file.originFileObj || fileWithPreview.file;
      if (!file) continue;

      try {
        const filePath = (file as any).path || file.name;
        const result = await api.exportImport.import(filePath, fileWithPreview.preview?.title);

        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(`${file.name}: ${result.error || '导入失败'}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${file.name}: ${error instanceof Error ? error.message : '导入失败'}`);
      }

      completed++;
      setImportProgress(Math.round((completed / total) * 100));
    }

    setImportStatus('success');
    setImportResult({ success, failed, errors });
    setLoading(false);

    if (success > 0) {
      message.success(`成功导入 ${success} 个作品`);
      onSuccess?.();
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // 渲染步骤1：选择文件
  const renderStep1 = () => (
    <div className="import-step-1">
      <Alert
        message="支持导入的文件格式"
        description="JSON（完整备份）、Markdown（.md）、纯文本（.txt）、ZIP压缩包"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Upload.Dragger {...uploadProps} className="import-uploader">
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
        <p className="ant-upload-hint">
          支持单个或批量导入，文件大小不超过 50MB
        </p>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <div className="file-list-summary" style={{ marginTop: 16 }}>
          <Text type="secondary">
            已选择 {fileList.length} 个文件
          </Text>
        </div>
      )}
    </div>
  );

  // 渲染步骤2：预览
  const renderStep2 = () => {
    const loadedCount = filesWithPreview.filter(f => f.status === 'loaded').length;
    const errorCount = filesWithPreview.filter(f => f.status === 'error').length;

    return (
      <div className="import-step-2">
        {filesWithPreview.length === 0 ? (
          <Empty description="请先选择文件" />
        ) : (
          <>
            <div className="preview-summary" style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="success">可导入: {loadedCount}</Tag>
                {errorCount > 0 && <Tag color="error">失败: {errorCount}</Tag>}
              </Space>
            </div>

            <List
              className="preview-list"
              dataSource={filesWithPreview}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setFileList(prev => prev.filter(f => f.uid !== item.file.uid));
                        setFilesWithPreview(prev => prev.filter(f => f.file.uid !== item.file.uid));
                      }}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(item.file.name)}
                    title={
                      <Space>
                        <Text strong>{item.file.name}</Text>
                        {getFileTypeTag(item.file.name)}
                        {item.status === 'loading' && <Spin size="small" />}
                      </Space>
                    }
                    description={
                      item.status === 'loaded' && item.preview ? (
                        <Space orientation="vertical" size={0}>
                          <Text type="secondary">
                            作品名称: {item.preview.title}
                          </Text>
                          {item.preview.author && (
                            <Text type="secondary">
                              作者: {item.preview.author}
                            </Text>
                          )}
                          <Text type="secondary">
                            章节数: {item.preview.chapterCount} |
                            字数: {item.preview.wordCount}
                          </Text>
                        </Space>
                      ) : item.status === 'error' ? (
                        <Text type="danger">{item.error || '无法解析此文件'}</Text>
                      ) : (
                        <Text type="secondary">等待预览...</Text>
                      )
                    }
                  />
                </List.Item>
              )}
            />

            {filesWithPreview.some(f => f.status === 'pending') && (
              <Button
                type="primary"
                onClick={loadPreviews}
                loading={loading}
                style={{ marginTop: 16, width: '100%' }}
              >
                加载预览
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  // 渲染步骤3：确认导入
  const renderStep3 = () => {
    if (importStatus === 'importing') {
      return (
        <div className="import-progress">
          <Progress
            percent={importProgress}
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <Text type="secondary">正在导入作品，请稍候...</Text>
        </div>
      );
    }

    if (importStatus === 'success' && importResult) {
      return (
        <div className="import-result">
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <Title level={4}>导入完成</Title>

          <div className="result-stats">
            <Card size="small" className="stat-card success">
              <div className="stat-value">{importResult.success}</div>
              <div className="stat-label">导入成功</div>
            </Card>
            {importResult.failed > 0 && (
              <Card size="small" className="stat-card error">
                <div className="stat-value">{importResult.failed}</div>
                <div className="stat-label">导入失败</div>
              </Card>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <Alert
              message="导入失败的文件"
              description={
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              style={{ marginTop: 16, textAlign: 'left' }}
            />
          )}
        </div>
      );
    }

    const validFiles = filesWithPreview.filter(f => f.status === 'loaded');

    return (
      <div className="import-confirm">
        <Title level={5}>导入确认</Title>

        <div className="confirm-info">
          <div className="info-item">
            <Text type="secondary">待导入文件数：</Text>
            <Text strong>{validFiles.length}</Text>
          </div>

          <List
            size="small"
            dataSource={validFiles}
            renderItem={(item) => (
              <List.Item>
                <Text ellipsis style={{ maxWidth: 300 }}>
                  {item.preview?.title || item.file.name}
                </Text>
                <Text type="secondary">
                  {item.preview?.chapterCount || 0} 章
                </Text>
              </List.Item>
            )}
            style={{ maxHeight: 150, overflow: 'auto', marginTop: 8 }}
          />
        </div>

        <Alert
          message="导入提示"
          description="导入的作品将作为新作品创建，不会覆盖现有作品。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </div>
    );
  };

  // 步骤内容
  const steps = [
    { title: '选择文件', content: renderStep1() },
    { title: '预览', content: renderStep2() },
    { title: '确认导入', content: renderStep3() },
  ];

  // 下一步
  const handleNext = async () => {
    if (currentStep === 0) {
      if (fileList.length === 0) {
        message.error('请至少选择一个文件');
        return;
      }
      // 自动加载预览
      await loadPreviews();
    }

    if (currentStep === 2) {
      await handleImport();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 检查是否可以进入下一步
  const canNext = () => {
    if (currentStep === 0) {
      return fileList.length > 0;
    }
    if (currentStep === 1) {
      return filesWithPreview.some(f => f.status === 'loaded');
    }
    return true;
  };

  return (
    <Modal
      title={
        <Space>
          <ImportOutlined />
          <span>导入作品</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        importStatus === 'success' ? (
          <Button type="primary" onClick={handleClose}>
            完成
          </Button>
        ) : (
          <Space>
            {currentStep > 0 && importStatus !== 'importing' && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            {currentStep < 2 && (
              <Button
                type="primary"
                onClick={handleNext}
                disabled={!canNext()}
              >
                下一步
              </Button>
            )}
            {currentStep === 2 && importStatus !== 'importing' && (
              <Button
                type="primary"
                loading={loading}
                onClick={handleNext}
                icon={<ImportOutlined />}
                disabled={!canNext()}
              >
                开始导入
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

export default ImportDialog;
