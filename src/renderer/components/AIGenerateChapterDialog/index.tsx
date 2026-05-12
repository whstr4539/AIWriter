/**
 * AI生成章节对话框组件
 * 输入章节大纲或提示词，选择生成风格，设置生成长度，生成完整章节内容
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Spin,
  Progress,
  Typography,
  Alert,
  Card,
  Tabs,
  Tooltip,
  Badge,
  Divider,
  Radio,
} from 'antd';
import {
  RobotOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { aiApi, AIStreamChunk } from '../../api/ipc';
import { PromptTemplate, WritingStyle, ChapterLength } from '../../utils/promptTemplates';
import './styles.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

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

interface AIGenerateChapterDialogProps {
  open: boolean;
  novelTitle?: string;
  chapterOutline?: string;
  onClose: () => void;
  onAccept: (content: string, title: string) => void;
}

const AIGenerateChapterDialog: React.FC<AIGenerateChapterDialogProps> = ({
  open,
  novelTitle,
  chapterOutline,
  onClose,
  onAccept,
}) => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState('basic');

  // Refs
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 写作风格选项
  const writingStyles: { value: WritingStyle; label: string; description: string }[] = [
    {
      value: 'formal',
      label: '正式严谨',
      description: '语言规范、结构清晰，适合历史、科幻等类型',
    },
    {
      value: 'casual',
      label: '轻松活泼',
      description: '语言通俗、节奏轻快，适合都市、言情等类型',
    },
    {
      value: 'suspense',
      label: '悬疑紧张',
      description: '氛围营造、节奏紧凑，适合悬疑、推理等类型',
    },
    {
      value: 'romantic',
      label: '浪漫唯美',
      description: '情感细腻、描写优美，适合言情、古风等类型',
    },
    {
      value: 'epic',
      label: '史诗宏大',
      description: '气势磅礴、场面宏大，适合玄幻、仙侠等类型',
    },
    {
      value: 'humorous',
      label: '幽默诙谐',
      description: '轻松搞笑、妙趣横生，适合喜剧、轻小说等类型',
    },
  ];

  // 章节长度选项
  const lengthOptions: { value: ChapterLength; label: string; wordCount: string }[] = [
    { value: 'short', label: '短篇', wordCount: '1000-2000字' },
    { value: 'medium', label: '中篇', wordCount: '2000-4000字' },
    { value: 'long', label: '长篇', wordCount: '4000-6000字' },
    { value: 'extraLong', label: '超长', wordCount: '6000字以上' },
  ];

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  }, []);

  // 开始生成
  const startGeneration = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      setStatus(GenerationStatus.GENERATING);
      setGeneratedContent('');
      setGeneratedTitle('');
      setError(null);
      setTokenUsage(null);
      setProgress(0);
      setElapsedTime(0);
      setActiveTab('preview');

      // 启动计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // 构建提示词
      const prompt = PromptTemplate.buildChapterPrompt({
        outline: values.outline,
        style: values.style,
        length: values.length,
        novelTitle,
        additionalPrompts: values.additionalPrompts,
        characters: values.characters,
        keyPoints: values.keyPoints,
      });

      // 流式生成
      await aiApi.streamGenerate(prompt, {
        onChunk: (chunk: AIStreamChunk) => {
          setGeneratedContent((prev) => prev + chunk.content);
          setProgress((prev) => Math.min(prev + 2, 95));

          // 尝试从内容中提取标题
          if (!generatedTitle) {
            const titleMatch = chunk.content.match(/第[一二三四五六七八九十百千万\d]+章[：: ]?(.+)/);
            if (titleMatch) {
              setGeneratedTitle(titleMatch[1].trim());
            }
          }

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

          // 如果没有提取到标题，使用默认标题
          if (!generatedTitle) {
            setGeneratedTitle(`新章节 ${new Date().toLocaleDateString()}`);
          }
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('validateFields')) {
        // 表单验证失败，不更改状态
        return;
      }
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setStatus(GenerationStatus.ERROR);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [form, novelTitle, generatedTitle]);

  // 重新生成
  const handleRegenerate = () => {
    setActiveTab('basic');
    setStatus(GenerationStatus.IDLE);
  };

  // 接受生成内容
  const handleAccept = () => {
    const values = form.getFieldsValue();
    const finalTitle = generatedTitle || values.title || `新章节 ${new Date().toLocaleDateString()}`;
    onAccept(generatedContent, finalTitle);
    handleClose();
  };

  // 拒绝生成内容
  const handleReject = () => {
    handleClose();
  };

  // 关闭对话框
  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStatus(GenerationStatus.IDLE);
    setGeneratedContent('');
    setGeneratedTitle('');
    setError(null);
    setProgress(0);
    setElapsedTime(0);
    setActiveTab('basic');
    form.resetFields();
    onClose();
  };

  // 打开时自动填入章纲
  useEffect(() => {
    if (open && chapterOutline) {
      form.setFieldsValue({ outline: chapterOutline });
    }
  }, [open, chapterOutline, form]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 渲染基本信息表单
  const renderBasicForm = () => (
    <Form
      form={form}
      layout="vertical"
      className="chapter-generate-form"
      initialValues={{
        style: 'formal',
        length: 'medium',
      }}
    >
      <Form.Item
        name="outline"
        label="章节大纲"
        rules={[{ required: true, message: '请输入章节大纲' }]}
        extra="描述本章的主要情节、场景和关键事件"
      >
        <TextArea
          rows={6}
          placeholder={`例如：
本章讲述主角在神秘山洞中发现古老秘籍的故事。
场景1：主角误入山洞，发现奇怪符号
场景2：破解符号，发现隐藏密室
场景3：获得秘籍，遭遇守护兽
场景4：惊险逃脱，开始修炼"`}
          className="outline-input"
        />
      </Form.Item>

      <Form.Item
        name="title"
        label="章节标题（可选）"
        extra="如果不填写，AI会根据内容自动生成"
      >
        <Input placeholder="输入章节标题，或留空让AI生成" />
      </Form.Item>

      <Form.Item
        name="style"
        label="写作风格"
        rules={[{ required: true }]}
      >
        <Radio.Group className="style-radio-group">
          <Space orientation="vertical" style={{ width: '100%' }}>
            {writingStyles.map((style) => (
              <Radio key={style.value} value={style.value} className="style-radio">
                <div className="style-option">
                  <Text strong>{style.label}</Text>
                  <Text type="secondary" className="style-description">
                    {style.description}
                  </Text>
                </div>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        name="length"
        label="章节长度"
        rules={[{ required: true }]}
      >
        <Select placeholder="选择章节长度">
          {lengthOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              <Space>
                <span>{option.label}</span>
                <Text type="secondary">({option.wordCount})</Text>
              </Space>
            </Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );

  // 渲染高级设置表单
  const renderAdvancedForm = () => (
    <Form form={form} layout="vertical" className="chapter-generate-form">
      <Form.Item
        name="characters"
        label="出场人物"
        extra="描述本章出场的关键人物及其关系"
      >
        <TextArea
          rows={4}
          placeholder={`例如：
- 主角：李明，25岁，性格坚毅，正在寻找失散的父亲
- 配角：张老，山洞守护者，神秘莫测
- 反派：黑衣人，追踪主角的杀手"`}
        />
      </Form.Item>

      <Form.Item
        name="keyPoints"
        label="关键情节点"
        extra="列出本章必须包含的关键情节或转折"
      >
        <TextArea
          rows={4}
          placeholder={`例如：
1. 主角必须发现秘籍但不能立即学会
2. 与守护兽的战斗要体现主角的智慧而非蛮力
3. 结尾留下悬念：秘籍中隐藏着一个惊天秘密"`}
        />
      </Form.Item>

      <Form.Item
        name="additionalPrompts"
        label="额外提示词"
        extra="添加任何其他特殊要求或提示"
      >
        <TextArea
          rows={3}
          placeholder="例如：注重环境描写，营造神秘氛围；对话要体现人物性格差异..."
        />
      </Form.Item>
    </Form>
  );

  // 渲染预览内容
  const renderPreview = () => (
    <div className="preview-content">
      {status === GenerationStatus.GENERATING && (
        <div className="generation-progress">
          <Progress percent={progress} status="active" strokeColor="#1890ff" />
          <Space className="progress-info">
            <Tooltip title="已用时间">
              <Text type="secondary">
                <ClockCircleOutlined /> {formatTime(elapsedTime)}
              </Text>
            </Tooltip>
            <Tooltip title="生成进度">
              <Text type="secondary">
                <ThunderboltOutlined /> {progress}%
              </Text>
            </Tooltip>
          </Space>
        </div>
      )}

      {error && (
        <Alert
          message="生成失败"
          description={error}
          type="error"
          showIcon
          className="error-alert"
          action={
            <Button size="small" danger onClick={startGeneration}>
              重试
            </Button>
          }
        />
      )}

      <Card
        className="generated-chapter-card"
        title={
          <Space>
            <BookOutlined />
            <span>生成内容</span>
            {status === GenerationStatus.GENERATING && (
              <Badge status="processing" text="生成中..." />
            )}
            {status === GenerationStatus.COMPLETED && (
              <Badge status="success" text="已完成" />
            )}
          </Space>
        }
        extra={
          generatedTitle && (
            <Text type="secondary">
              标题: {generatedTitle}
            </Text>
          )
        }
      >
        {generatedContent ? (
          <div className="generated-chapter-text">{generatedContent}</div>
        ) : (
          <div className="empty-preview">
            {status === GenerationStatus.GENERATING ? (
              <Space orientation="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">AI正在创作章节内容...</Text>
                <Text type="secondary" className="generation-hint">
                  根据大纲复杂度，这可能需要一些时间
                </Text>
              </Space>
            ) : (
              <Space orientation="vertical" align="center">
                <ExperimentOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                <Text type="secondary">点击"开始生成"创建章节内容</Text>
              </Space>
            )}
          </div>
        )}
      </Card>

      {tokenUsage && (
        <div className="token-usage-info">
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
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={900}
      footer={null}
      className="ai-generate-chapter-dialog"
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI生成章节</span>
          {novelTitle && (
            <Text type="secondary" className="novel-title-tag">
              《{novelTitle}》
            </Text>
          )}
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="generate-chapter-tabs"
        items={[
          {
            key: 'basic',
            label: (
              <span>
                <EditOutlined />
                基本信息
              </span>
            ),
            children: renderBasicForm(),
          },
          {
            key: 'advanced',
            label: (
              <span>
                <ExperimentOutlined />
                高级设置
              </span>
            ),
            children: renderAdvancedForm(),
          },
          {
            key: 'preview',
            label: (
              <span>
                <FileTextOutlined />
                预览
                {status === GenerationStatus.GENERATING && (
                  <Badge status="processing" style={{ marginLeft: 4 }} />
                )}
              </span>
            ),
            children: renderPreview(),
          },
        ]}
      />

      <div className="dialog-footer-actions">
        <Space>
          {status === GenerationStatus.IDLE && (
            <>
              <Button onClick={handleClose}>取消</Button>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={startGeneration}
                size="large"
              >
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
              <Button
                type="primary"
                onClick={startGeneration}
              >
                重新生成
              </Button>
            </>
          )}

          {status === GenerationStatus.COMPLETED && (
            <>
              <Button
                onClick={handleRegenerate}
              >
                重新设置
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={handleReject}
              >
                放弃
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleAccept}
                size="large"
              >
                使用此内容
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default AIGenerateChapterDialog;
