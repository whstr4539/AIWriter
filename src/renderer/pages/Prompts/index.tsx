import React, { useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tabs,
  Input,
  message,
  Tag,
  Modal,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  EditOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  FormOutlined,
  ExpandOutlined,
  BgColorsOutlined,
  BookOutlined,
} from '@ant-design/icons';
import PromptTemplate, { AIOperationType } from '../../utils/promptTemplates';
import './styles.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const operationMeta: Record<AIOperationType, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  generateOutline: { label: '生成大纲', icon: <BookOutlined />, desc: '为作品/卷/章生成创作大纲', color: '#722ed1' },
  generateChapter: { label: '生成章节', icon: <FileTextOutlined />, desc: '根据大纲生成完整章节内容', color: '#eb2f96' },
  continue: { label: '续写', icon: <FormOutlined />, desc: '根据选中内容继续写作', color: '#1890ff' },
  rewrite: { label: '改写', icon: <EditOutlined />, desc: '对选中内容进行改写优化', color: '#52c41a' },
  expand: { label: '扩写', icon: <ExpandOutlined />, desc: '扩展丰富选中内容', color: '#fa8c16' },
  polish: { label: '润色', icon: <BgColorsOutlined />, desc: '优化提升文字表达质量', color: '#13c2c2' },
};

const order: AIOperationType[] = ['generateOutline', 'generateChapter', 'continue', 'rewrite', 'expand', 'polish'];

const PromptsPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState<AIOperationType>('generateOutline');
  const [editing, setEditing] = useState<Record<string, { systemPrompt: string; userPromptTemplate: string }>>({});
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const getCurrentTemplate = useCallback((type: AIOperationType) => {
    const edit = editing[type];
    if (edit) return edit;
    const tpl = PromptTemplate.getTemplate(type);
    return { systemPrompt: tpl.systemPrompt, userPromptTemplate: tpl.userPromptTemplate };
  }, [editing]);

  const handleChange = useCallback((type: AIOperationType, field: 'systemPrompt' | 'userPromptTemplate', value: string) => {
    setEditing(prev => {
      const current = prev[type] || getCurrentTemplate(type);
      return { ...prev, [type]: { ...current, [field]: value } };
    });
  }, [getCurrentTemplate]);

  const handleSave = useCallback((type: AIOperationType) => {
    const edit = editing[type];
    if (!edit) {
      message.info('没有修改');
      return;
    }
    const tpl = PromptTemplate.getTemplate(type);
    PromptTemplate.setCustomTemplate(type, {
      ...tpl,
      systemPrompt: edit.systemPrompt,
      userPromptTemplate: edit.userPromptTemplate,
    });
    setEditing(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    message.success(`${operationMeta[type].label}提示词已保存`);
  }, [editing]);

  const handleReset = useCallback((type: AIOperationType) => {
    Modal.confirm({
      title: '确认重置',
      content: `确定要重置「${operationMeta[type].label}」提示词为默认值吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        PromptTemplate.resetToDefault(type);
        setEditing(prev => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
        message.success('已重置为默认提示词');
      },
    });
  }, []);

  const handleExport = useCallback(() => {
    const json = PromptTemplate.exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_prompt_templates_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('提示词模板已导出');
  }, []);

  const handleImport = useCallback(() => {
    if (!importText.trim()) {
      message.warning('请粘贴要导入的模板配置');
      return;
    }
    const success = PromptTemplate.importTemplates(importText);
    if (success) {
      setEditing({});
      setImportModalOpen(false);
      setImportText('');
      message.success('提示词模板已导入');
    } else {
      message.error('导入失败：JSON格式不正确');
    }
  }, [importText]);

  return (
    <div className="prompts-page">
      <div className="page-header">
        <Space>
          <ThunderboltOutlined style={{ fontSize: 24, color: '#722ed1' }} />
          <Title level={3} style={{ margin: 0 }}>提示词管理</Title>
        </Space>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>导出配置</Button>
          <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>导入配置</Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as AIOperationType)}
        tabPosition="left"
        className="prompts-tabs"
        items={order.map((type) => {
          const meta = operationMeta[type];
          const tpl = getCurrentTemplate(type);
          const hasEdit = !!editing[type];
          return {
            key: type,
            label: (
              <Space>
                {meta.icon}
                <span>{meta.label}</span>
                {hasEdit && <Tag color="orange">已修改</Tag>}
              </Space>
            ),
            children: (
              <div className="prompt-editor">
                <Card
                  title={
                    <Space>
                      <span style={{ color: meta.color }}>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <Tag color={meta.color}>{meta.desc}</Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => handleReset(type)}
                      >
                        重置默认
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => handleSave(type)}
                        disabled={!hasEdit}
                      >
                        保存修改
                      </Button>
                    </Space>
                  }
                >
                  <div className="prompt-field">
                    <Text strong>系统提示词 (System Prompt)</Text>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0' }}>
                      定义AI的角色和写作风格，每次调用时作为系统消息发送
                    </Paragraph>
                    <TextArea
                      value={tpl.systemPrompt}
                      onChange={(e) => handleChange(type, 'systemPrompt', e.target.value)}
                      rows={6}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  </div>
                  <div className="prompt-field" style={{ marginTop: 16 }}>
                    <Text strong>用户提示词模板 (User Prompt Template)</Text>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0' }}>
                      使用 {'{{变量名}}'} 作为占位符，调用时自动替换为实际内容。可用变量见下方说明。
                    </Paragraph>
                    <TextArea
                      value={tpl.userPromptTemplate}
                      onChange={(e) => handleChange(type, 'userPromptTemplate', e.target.value)}
                      rows={10}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  </div>
                </Card>

                <Card size="small" title="可用变量" style={{ marginTop: 12 }}>
                  {type === 'generateOutline' ? (
                    <Space wrap size={[8, 8]}>
                      <Tag>{'{{novelTitle}}'} - 作品名称</Tag>
                      <Tag>{'{{outlineType}}'} - 大纲类型（总纲/卷纲/章纲）</Tag>
                      <Tag>{'{{referenceInfo}}'} - 参考信息（已有大纲、章节概要等）</Tag>
                      <Tag>{'{{additionalPrompts}}'} - 额外要求</Tag>
                    </Space>
                  ) : type === 'generateChapter' ? (
                    <Space wrap size={[8, 8]}>
                      <Tag>{'{{novelTitle}}'} - 作品名称</Tag>
                      <Tag>{'{{outline}}'} - 章节大纲</Tag>
                      <Tag>{'{{style}}'} - 写作风格</Tag>
                      <Tag>{'{{length}}'} - 章节长度</Tag>
                      <Tag>{'{{characters}}'} - 出场人物</Tag>
                      <Tag>{'{{keyPoints}}'} - 关键情节点</Tag>
                      <Tag>{'{{additionalPrompts}}'} - 额外要求</Tag>
                    </Space>
                  ) : (
                    <Space wrap size={[8, 8]}>
                      <Tag>{'{{selectedText}}'} - 选中文本</Tag>
                      <Tag>{'{{contextText}}'} - 上下文</Tag>
                      <Tag>{'{{chapterTitle}}'} - 当前章节标题</Tag>
                      <Tag>{'{{novelTitle}}'} - 作品名称</Tag>
                    </Space>
                  )}
                </Card>
              </div>
            ),
          };
        })}
      />
      <Modal
        title="导入提示词配置"
        open={importModalOpen}
        onOk={handleImport}
        onCancel={() => { setImportModalOpen(false); setImportText(''); }}
        okText="导入"
        cancelText="取消"
        width={600}
      >
        <TextArea
          placeholder="粘贴之前导出的提示词配置 JSON..."
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={10}
          style={{ fontFamily: 'monospace' }}
        />
      </Modal>
    </div>
  );
};

export default PromptsPage;
