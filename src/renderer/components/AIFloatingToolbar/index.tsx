import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Tooltip, Space, Divider, Popover } from 'antd';
import {
  EditOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Editor } from '@tiptap/react';
import type { AIOperationType } from '../../utils/promptTemplates';
import './styles.css';

interface AIFloatingToolbarProps {
  editor: Editor | null;
  novelTitle?: string;
  chapterTitle?: string;
  onAIOperation: (operation: AIOperationType) => void;
}

interface ToolbarPosition {
  x: number;
  y: number;
  visible: boolean;
}

const AIFloatingToolbar: React.FC<AIFloatingToolbarProps> = ({
  editor,
  onAIOperation,
}) => {
  const [position, setPosition] = useState<ToolbarPosition>({
    x: 0,
    y: 0,
    visible: false,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate toolbar position relative to selection
  const calculatePosition = useCallback(() => {
    if (!editor) return { x: 0, y: 0 };

    const { view, state } = editor;
    const { from, to } = state.selection;

    const startCoords = view.coordsAtPos(from);
    const endCoords = view.coordsAtPos(to);

    const centerX = (startCoords.left + endCoords.right) / 2;
    const topY = Math.min(startCoords.top, endCoords.top);
    const editorRect = view.dom.getBoundingClientRect();

    return {
      x: centerX - editorRect.left,
      y: topY - editorRect.top - 50,
    };
  }, [editor]);

  // Check if selection has text
  const hasSelectionText = useCallback(() => {
    if (!editor) return false;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    return from !== to && text.trim().length > 0;
  }, [editor]);

  const showToolbar = useCallback(() => {
    if (!editor) return;
    if (hasSelectionText()) {
      const pos = calculatePosition();
      setPosition({ x: pos.x, y: pos.y, visible: true });
    } else {
      setPosition((prev) => ({ ...prev, visible: false }));
    }
  }, [editor, hasSelectionText, calculatePosition]);

  const hideToolbar = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setPosition((prev) => ({ ...prev, visible: false }));
    }, 200);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleOperation = (operation: AIOperationType) => {
    setPosition((prev) => ({ ...prev, visible: false }));
    onAIOperation(operation);
  };

  // Listen for selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => showToolbar();
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, showToolbar]);

  // Listen for blur
  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => hideToolbar();
    editor.on('blur', handleBlur);

    return () => {
      editor.off('blur', handleBlur);
    };
  }, [editor, hideToolbar]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const moreMenuContent = (
    <div className="ai-more-menu">
      <Button
        type="text"
        icon={<ExperimentOutlined />}
        onClick={() => handleOperation('generateChapter')}
      >
        生成章节
      </Button>
    </div>
  );

  if (!position.visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="ai-floating-toolbar"
      style={{ left: position.x, top: position.y }}
      onMouseEnter={cancelHide}
      onMouseLeave={hideToolbar}
    >
      <div className="ai-toolbar-content">
        <Space size={4}>
          <Tooltip title="AI续写" placement="top">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              size="small"
              onClick={() => handleOperation('continue')}
              className="ai-toolbar-btn"
            >
              续写
            </Button>
          </Tooltip>

          <Tooltip title="AI改写" placement="top">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => handleOperation('rewrite')}
              className="ai-toolbar-btn"
            >
              改写
            </Button>
          </Tooltip>

          <Tooltip title="AI扩写" placement="top">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOperation('expand')}
              className="ai-toolbar-btn"
            >
              扩写
            </Button>
          </Tooltip>

          <Tooltip title="AI润色" placement="top">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              size="small"
              onClick={() => handleOperation('polish')}
              className="ai-toolbar-btn"
            >
              润色
            </Button>
          </Tooltip>

          <Divider type="vertical" className="ai-toolbar-divider" />

          <Popover
            content={moreMenuContent}
            trigger="click"
            placement="bottom"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              className="ai-toolbar-more-btn"
            />
          </Popover>
        </Space>
      </div>
      <div className="ai-toolbar-arrow" />
    </div>
  );
};

export default AIFloatingToolbar;
