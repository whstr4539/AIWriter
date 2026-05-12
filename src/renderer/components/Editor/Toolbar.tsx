/**
 * 富文本编辑器工具栏组件
 * 提供各种文本格式化工具按钮
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  AlignCenterOutlined as AlignJustifyOutlined,
  CodeOutlined,
  MinusOutlined,
  UndoOutlined,
  RedoOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  ProfileOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { Tooltip, Divider, Space, Button } from 'antd';
import './styles.css';

interface ToolbarProps {
  editor: Editor | null;
  onAIButtonClick?: () => void;
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor, onAIButtonClick }) => {
  if (!editor) {
    return null;
  }

  const buttons: ToolbarButton[] = [
    // 撤销/重做
    {
      icon: <UndoOutlined />,
      title: '撤销 (Ctrl+Z)',
      action: () => editor.chain().focus().undo().run(),
      isDisabled: !editor.can().undo(),
    },
    {
      icon: <RedoOutlined />,
      title: '重做 (Ctrl+Y)',
      action: () => editor.chain().focus().redo().run(),
      isDisabled: !editor.can().redo(),
    },
  ];

  const formatButtons: ToolbarButton[] = [
    // 标题
    {
      icon: <FontSizeOutlined />,
      title: '标题1 (Ctrl+Alt+1)',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <span style={{ fontSize: '12px', fontWeight: 'bold' }}>H2</span>,
      title: '标题2 (Ctrl+Alt+2)',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <span style={{ fontSize: '10px', fontWeight: 'bold' }}>H3</span>,
      title: '标题3 (Ctrl+Alt+3)',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
  ];

  const textStyleButtons: ToolbarButton[] = [
    // 文本样式
    {
      icon: <BoldOutlined />,
      title: '加粗 (Ctrl+B)',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: <ItalicOutlined />,
      title: '斜体 (Ctrl+I)',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: <UnderlineOutlined />,
      title: '下划线 (Ctrl+U)',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
    },
    {
      icon: <StrikethroughOutlined />,
      title: '删除线',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    {
      icon: <HighlightOutlined />,
      title: '高亮',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive('highlight'),
    },
  ];

  const listButtons: ToolbarButton[] = [
    // 列表
    {
      icon: <UnorderedListOutlined />,
      title: '无序列表',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: <OrderedListOutlined />,
      title: '有序列表',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
  ];

  const alignButtons: ToolbarButton[] = [
    // 对齐
    {
      icon: <AlignLeftOutlined />,
      title: '左对齐',
      action: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: editor.isActive({ textAlign: 'left' }),
    },
    {
      icon: <AlignCenterOutlined />,
      title: '居中对齐',
      action: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: editor.isActive({ textAlign: 'center' }),
    },
    {
      icon: <AlignRightOutlined />,
      title: '右对齐',
      action: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: editor.isActive({ textAlign: 'right' }),
    },
    {
      icon: <AlignJustifyOutlined />,
      title: '两端对齐',
      action: () => editor.chain().focus().setTextAlign('justify').run(),
      isActive: editor.isActive({ textAlign: 'justify' }),
    },
  ];

  const blockButtons: ToolbarButton[] = [
    // 块级元素
    {
      icon: <ProfileOutlined />,
      title: '引用块',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: <CodeOutlined />,
      title: '代码块',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
    {
      icon: <MinusOutlined />,
      title: '分隔线',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  const renderButtonGroup = (groupButtons: ToolbarButton[]) => (
    <Space size={4}>
      {groupButtons.map((button, index) => (
        <Tooltip title={button.title} key={index}>
          <button
            type="button"
            className={`toolbar-btn ${button.isActive ? 'is-active' : ''} ${button.isDisabled ? 'is-disabled' : ''}`}
            onClick={button.action}
            disabled={button.isDisabled}
          >
            {button.icon}
          </button>
        </Tooltip>
      ))}
    </Space>
  );

  return (
    <div className="editor-toolbar">
      <div className="toolbar-content">
        {renderButtonGroup(buttons)}
        <Divider type="vertical" className="toolbar-divider" />
        {renderButtonGroup(formatButtons)}
        <Divider type="vertical" className="toolbar-divider" />
        {renderButtonGroup(textStyleButtons)}
        <Divider type="vertical" className="toolbar-divider" />
        {renderButtonGroup(listButtons)}
        <Divider type="vertical" className="toolbar-divider" />
        {renderButtonGroup(alignButtons)}
        <Divider type="vertical" className="toolbar-divider" />
        {renderButtonGroup(blockButtons)}
        <Divider type="vertical" className="toolbar-divider" />
        <Tooltip title="AI助手 (Ctrl+Shift+A)">
          <Button
            type="primary"
            icon={<RobotOutlined />}
            size="small"
            onClick={() => onAIButtonClick?.()}
            className="ai-toolbar-btn"
          >
            AI助手
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Toolbar;
