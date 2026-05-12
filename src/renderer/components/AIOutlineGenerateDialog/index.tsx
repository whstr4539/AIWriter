import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Space,
  Select,
  Input,
  Spin,
  Progress,
  Typography,
  Alert,
  Card,
  Badge,
  Tag,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { aiApi, AIStreamChunk } from '../../api/ipc';
import { PromptTemplate } from '../../utils/promptTemplates';
import type { Volume, ChapterInfo } from '../../../types/novel';
import './styles.css';

const { TextArea } = Input;
const { Text, Title } = Typography;

enum GenerationStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error',
}

interface AIOutlineGenerateDialogProps {
  open: boolean;
  outlineType: 'novel' | 'volume' | 'chapter';
  novelTitle?: string;
  novelId: string;
  volumeList?: Volume[];
  chapterList?: ChapterInfo[];
  referenceInfo?: string;
  onClose: () => void;
  onSave: (outline: string, type: 'novel' | 'volume' | 'chapter', targetId?: string) => Promise<void>;
}

const outlineTypeLabels: Record<string, string> = {
  novel: '总纲',
  volume: '卷纲',
  chapter: '章纲',
};

const AIOutlineGenerateDialog: React.FC<AIOutlineGenerateDialogProps> = ({
  open,
  outlineType,
  novelTitle,
  volumeList = [],
  chapterList = [],
  referenceInfo,
  onClose,
  onSave,
}) => {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [additionalPrompts, setAdditionalPrompts] = useState('');
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | undefined>();
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStatus(GenerationStatus.IDLE);
      setGeneratedContent('');
      setError(null);
      setProgress(0);
      setElapsedTime(0);
      setAdditionalPrompts('');
      setSelectedVolumeId(volumeList[0]?.id);
      setSelectedChapterId(chapterList[0]?.id);
    }
  }, [open]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  }, []);

  const startGeneration = useCallback(async () => {
    setStatus(GenerationStatus.GENERATING);
    setGeneratedContent('');
    setError(null);
    setProgress(0);
    setElapsedTime(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    try {
      const prompt = PromptTemplate.buildOutlinePrompt({
        outlineType,
        novelTitle,
        referenceInfo,
        additionalPrompts: additionalPrompts || undefined,
      });

      await aiApi.streamGenerate(prompt, {
        onChunk: (chunk: AIStreamChunk) => {
          setGeneratedContent((prev) => prev + chunk.content);
          setProgress((prev) => Math.min(prev + 3, 90));
        },
        onError: (errorMsg: string) => {
          setError(errorMsg);
          setStatus(GenerationStatus.ERROR);
          if (timerRef.current) clearInterval(timerRef.current);
        },
        onComplete: () => {
          setStatus(GenerationStatus.COMPLETED);
          setProgress(100);
          if (timerRef.current) clearInterval(timerRef.current);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setStatus(GenerationStatus.ERROR);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [outlineType, novelTitle, referenceInfo, additionalPrompts]);

  const handleAccept = async () => {
    let targetId: string | undefined;
    if (outlineType === 'volume') targetId = selectedVolumeId;
    if (outlineType === 'chapter') targetId = selectedChapterId;
    await onSave(generatedContent, outlineType, targetId);
    handleClose();
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const targetLabel = outlineType === 'volume'
    ? volumeList.find(v => v.id === selectedVolumeId)?.title || '请选择卷'
    : outlineType === 'chapter'
    ? chapterList.find(c => c.id === selectedChapterId)?.title || '请选择章节'
    : undefined;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={700}
      footer={null}
      className="ai-outline-dialog"
      title={
        <Space>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <span>AI 生成{outlineTypeLabels[outlineType]}</span>
          {novelTitle && <Text type="secondary">《{novelTitle}》</Text>}
        </Space>
      }
    >
      {/* Target selector for volume/chapter */}
      {outlineType === 'volume' && volumeList.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>目标卷：</Text>
          <Select
            value={selectedVolumeId}
            onChange={setSelectedVolumeId}
            style={{ width: 200, marginLeft: 8 }}
            options={volumeList.map(v => ({ label: v.title, value: v.id }))}
          />
          {targetLabel && <Tag color="blue" style={{ marginLeft: 8 }}>{targetLabel}</Tag>}
        </div>
      )}
      {outlineType === 'chapter' && chapterList.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>目标章节：</Text>
          <Select
            value={selectedChapterId}
            onChange={setSelectedChapterId}
            style={{ width: 260, marginLeft: 8 }}
            options={chapterList.map(c => ({ label: c.title, value: c.id }))}
          />
          {targetLabel && <Tag color="blue" style={{ marginLeft: 8 }}>{targetLabel}</Tag>}
        </div>
      )}

      {/* Reference info */}
      {referenceInfo && (
        <Card size="small" title="参考大纲" className="reference-card">
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 150, overflow: 'auto' }}>
            {referenceInfo}
          </div>
        </Card>
      )}

      {/* Additional prompts (only before generation) */}
      {status === GenerationStatus.IDLE && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>额外要求（可选）：</Text>
          <TextArea
            value={additionalPrompts}
            onChange={(e) => setAdditionalPrompts(e.target.value)}
            rows={3}
            placeholder="例如：需要包含5个关键转折点，主角成长线要清晰..."
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      {/* Progress */}
      {status === GenerationStatus.GENERATING && (
        <div className="generation-progress">
          <Progress percent={progress} status="active" strokeColor="#722ed1" />
          <div className="progress-info">
            <Space>
              <Tooltip title="已用时间">
                <Text type="secondary"><ClockCircleOutlined /> {formatTime(elapsedTime)}</Text>
              </Tooltip>
              <Tooltip title="进度">
                <Text type="secondary"><ThunderboltOutlined /> {progress}%</Text>
              </Tooltip>
            </Space>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert message="生成失败" description={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {/* Generated content */}
      <div>
        <Title level={5}>
          生成结果
          {status === GenerationStatus.GENERATING && <Spin size="small" style={{ marginLeft: 8 }} />}
          {status === GenerationStatus.COMPLETED && (
            <Badge status="success" text="已完成" style={{ marginLeft: 8 }} />
          )}
        </Title>
        {generatedContent ? (
          <div className="generated-outline-text">{generatedContent}</div>
        ) : (
          <div className="empty-preview">
            {status === GenerationStatus.GENERATING ? (
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">AI 正在生成{outlineTypeLabels[outlineType]}...</Text>
              </Space>
            ) : (
              <Text type="secondary">点击"开始生成"创建{outlineTypeLabels[outlineType]}</Text>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="dialog-footer-actions">
        <Space>
          {status === GenerationStatus.IDLE && (
            <>
              <Button onClick={handleClose}>取消</Button>
              <Button type="primary" icon={<RobotOutlined />} onClick={startGeneration}>
                开始生成
              </Button>
            </>
          )}
          {status === GenerationStatus.GENERATING && (
            <Button onClick={handleClose}>取消</Button>
          )}
          {status === GenerationStatus.ERROR && (
            <>
              <Button onClick={handleClose}>取消</Button>
              <Button type="primary" icon={<ReloadOutlined />} onClick={startGeneration}>
                重新生成
              </Button>
            </>
          )}
          {status === GenerationStatus.COMPLETED && (
            <>
              <Button icon={<ReloadOutlined />} onClick={() => { setStatus(GenerationStatus.IDLE); setGeneratedContent(''); }}>
                重新生成
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleClose}>
                放弃
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleAccept}>
                保存大纲
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default AIOutlineGenerateDialog;
