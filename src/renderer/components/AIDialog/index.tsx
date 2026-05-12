/**
 * AI创作对话框组件
 * 显示AI生成进度、流式输出内容，提供接受/拒绝/重新生成按钮
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Button,
  Space,
  Spin,
  Progress,
  Typography,
  Alert,
  Tooltip,
  Badge,
  Card,
  Divider,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { aiApi, AIStreamChunk } from '../../api/ipc';
import { AIOperationType, PromptTemplate } from '../../utils/promptTemplates';
import './styles.css';

const { Text, Title } = Typography;

// AI对话框属性
interface AIDialogProps {
  open: boolean;
  operation: AIOperationType;
  selectedText: string;
  contextText?: string;
  chapterTitle?: string;
  novelTitle?: string;
  onAccept: (content: string) => void;
  onReject: () => void;
  onClose: () => void;
}

// 生成状态
enum GenerationStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// Token消耗信息
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const AIDialog: React.FC<AIDialogProps> = ({
  open,
  operation,
  selectedText,
  contextText = '',
  chapterTitle,
  novelTitle,
  onAccept,
  onReject,
  onClose,
}) => {
  // 状态
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取操作显示信息
  const getOperationInfo = useCallback(() => {
    const infoMap: Record<AIOperationType, { title: string; icon: React.ReactNode; color: string }> = {
      continue: {
        title: 'AI续写',
        icon: <FileTextOutlined />,
        color: '#1890ff',
      },
      rewrite: {
        title: 'AI改写',
        icon: <ReloadOutlined />,
        color: '#52c41a',
      },
      expand: {
        title: 'AI扩写',
        icon: <FileTextOutlined />,
        color: '#722ed1',
      },
      polish: {
        title: 'AI润色',
        icon: <ThunderboltOutlined />,
        color: '#fa8c16',
      },
      generateChapter: {
        title: 'AI生成章节',
        icon: <RobotOutlined />,
        color: '#eb2f96',
      },
      generateOutline: {
        title: 'AI生成大纲',
        icon: <RobotOutlined />,
        color: '#722ed1',
      },
    };
    return infoMap[operation];
  }, [operation]);

  // 计算预估token数
  const estimateTokens = useCallback((text: string) => {
    // 简单估算：中文字符 + 英文单词
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return Math.ceil((chineseChars + englishWords) * 1.5);
  }, []);

  // 开始生成
  const startGeneration = useCallback(async () => {
    if (!selectedText && operation !== 'generateChapter') {
      setError('请先选择要处理的文本');
      setStatus(GenerationStatus.ERROR);
      return;
    }

    setStatus(GenerationStatus.GENERATING);
    setGeneratedContent('');
    setError(null);
    setTokenUsage(null);
    setProgress(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setEstimatedTokens(estimateTokens(selectedText));

    // 启动计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
    }, 1000);

    try {
      // 构建提示词
      const prompt = PromptTemplate.build(operation, {
        selectedText,
        contextText,
        chapterTitle,
        novelTitle,
      });

      // 流式生成
      await aiApi.streamGenerate(prompt, {
        onChunk: (chunk: AIStreamChunk) => {
          setGeneratedContent((prev) => prev + chunk.content);
          setProgress((prev) => Math.min(prev + 5, 90));

          // 更新token使用信息
          if (chunk.usage) {
            setTokenUsage({
              promptTokens: chunk.usage.promptTokens || 0,
              completionTokens: chunk.usage.completionTokens || 0,
              totalTokens: chunk.usage.totalTokens || 0,
            });
          }
        },
        onError: (errorMsg: string) => {
          setError(errorMsg);
          setStatus(GenerationStatus.ERROR);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        },
        onComplete: () => {
          setStatus(GenerationStatus.COMPLETED);
          setProgress(100);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setStatus(GenerationStatus.ERROR);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [operation, selectedText, contextText, chapterTitle, novelTitle, estimateTokens, startTime]);

  // 重新生成
  const handleRegenerate = () => {
    startGeneration();
  };

  // 接受生成内容
  const handleAccept = () => {
    onAccept(generatedContent);
    onClose();
  };

  // 拒绝生成内容
  const handleReject = () => {
    onReject();
    onClose();
  };

  // 对话框关闭
  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onClose();
  };

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current && status === GenerationStatus.GENERATING) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent, status]);

  // 打开对话框时自动开始生成
  useEffect(() => {
    if (open && status === GenerationStatus.IDLE) {
      startGeneration();
    }
  }, [open, status, startGeneration]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const operationInfo = getOperationInfo();

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={720}
      footer={null}
      className="ai-dialog"
      title={
        <Space>
          <span style={{ color: operationInfo.color }}>{operationInfo.icon}</span>
          <span>{operationInfo.title}</span>
          {status === GenerationStatus.GENERATING && (
            <Badge status="processing" text="生成中..." />
          )}
          {status === GenerationStatus.COMPLETED && (
            <Badge status="success" text="已完成" />
          )}
          {status === GenerationStatus.ERROR && (
            <Badge status="error" text="失败" />
          )}
        </Space>
      }
    >
      <div className="ai-dialog-content">
        {/* 原始文本预览 */}
        {selectedText && (
          <Card
            size="small"
            title="原始文本"
            className="original-text-card"
            extra={
              <Text type="secondary" className="text-stats">
                约 {estimateTokens(selectedText)} tokens
              </Text>
            }
          >
            <div className="original-text-preview">
              {selectedText.length > 200
                ? `${selectedText.substring(0, 200)}...`
                : selectedText}
            </div>
          </Card>
        )}

        {/* 生成进度 */}
        {status === GenerationStatus.GENERATING && (
          <div className="generation-progress">
            <Progress
              percent={progress}
              status="active"
              strokeColor={operationInfo.color}
            />
            <Space className="progress-info">
              <Tooltip title="已用时间">
                <Text type="secondary">
                  <ClockCircleOutlined /> {formatTime(elapsedTime)}
                </Text>
              </Tooltip>
              <Tooltip title="预估消耗">
                <Text type="secondary">
                  <ThunderboltOutlined /> 约 {estimatedTokens} tokens
                </Text>
              </Tooltip>
            </Space>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert
            message="生成失败"
            description={error}
            type="error"
            showIcon
            className="error-alert"
          />
        )}

        {/* 生成内容 */}
        <div className="generated-content-wrapper">
          <Title level={5} className="content-title">
            生成结果
            {status === GenerationStatus.GENERATING && (
              <Spin size="small" style={{ marginLeft: 8 }} />
            )}
          </Title>
          <div
            ref={contentRef}
            className={`generated-content ${status === GenerationStatus.GENERATING ? 'generating' : ''}`}
          >
            {generatedContent ? (
              <div className="generated-text">{generatedContent}</div>
            ) : (
              <div className="empty-content">
                {status === GenerationStatus.GENERATING ? (
                  <Space orientation="vertical" align="center">
                    <Spin size="large" />
                    <Text type="secondary">AI正在创作中...</Text>
                  </Space>
                ) : (
                  <Text type="secondary">点击重新生成开始创作</Text>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Token使用信息 */}
        {tokenUsage && (
          <div className="token-usage">
            <Divider />
            <Space split={<Divider type="vertical" />}>
              <Tooltip title="输入tokens">
                <Text type="secondary">输入: {tokenUsage.promptTokens}</Text>
              </Tooltip>
              <Tooltip title="输出tokens">
                <Text type="secondary">输出: {tokenUsage.completionTokens}</Text>
              </Tooltip>
              <Tooltip title="总tokens">
                <Text type="secondary">总计: {tokenUsage.totalTokens}</Text>
              </Tooltip>
            </Space>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="dialog-actions">
          <Space>
            {status === GenerationStatus.ERROR && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRegenerate}
                type="primary"
              >
                重新生成
              </Button>
            )}
            {status === GenerationStatus.COMPLETED && (
              <>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerate}
                >
                  重新生成
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleReject}
                >
                  拒绝
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleAccept}
                >
                  接受
                </Button>
              </>
            )}
            {status === GenerationStatus.GENERATING && (
              <Button onClick={handleClose}>取消</Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default AIDialog;
