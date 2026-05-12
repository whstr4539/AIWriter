import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu } from 'antd';
import {
  FileTextOutlined,
  ReloadOutlined,
  EditOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { Editor } from '@tiptap/react';
import type { AIOperationType } from '../../utils/promptTemplates';
import './styles.css';

interface AIContextMenuProps {
  editor: Editor | null;
  novelTitle?: string;
  chapterTitle?: string;
  children: React.ReactNode;
  onAIOperation: (operation: AIOperationType) => void;
  onGenerateChapter: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

const AIContextMenu: React.FC<AIContextMenuProps> = ({
  editor,
  onAIOperation,
  onGenerateChapter,
  children,
}) => {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [hasSelection, setHasSelection] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSelectionInfo = useCallback(() => {
    if (!editor) return { text: '', context: '' };
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    return { text, context: '' };
  }, [editor]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor || !containerRef.current) return;

      const target = e.target as HTMLElement;
      if (!containerRef.current.contains(target)) return;

      e.preventDefault();

      const { text } = getSelectionInfo();
      setHasSelection(text.trim().length > 0);

      setMenuState({
        visible: true,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [editor, getSelectionInfo]
  );

  const hideMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleOperation = (operation: AIOperationType) => {
    hideMenu();
    onAIOperation(operation);
  };

  const handleGenerateChapter = () => {
    hideMenu();
    onGenerateChapter();
  };

  useEffect(() => {
    const handleClickOutside = () => hideMenu();
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [hideMenu]);

  const menuItems = [
    ...(hasSelection
      ? [
          {
            key: 'ai-continue',
            icon: <FileTextOutlined />,
            label: 'AI续写',
            onClick: () => handleOperation('continue'),
          },
          {
            key: 'ai-rewrite',
            icon: <ReloadOutlined />,
            label: 'AI改写',
            onClick: () => handleOperation('rewrite'),
          },
          {
            key: 'ai-expand',
            icon: <EditOutlined />,
            label: 'AI扩写',
            onClick: () => handleOperation('expand'),
          },
          {
            key: 'ai-polish',
            icon: <ThunderboltOutlined />,
            label: 'AI润色',
            onClick: () => handleOperation('polish'),
          },
          {
            type: 'divider' as const,
          },
        ]
      : []),
    {
      key: 'ai-generate-chapter',
      icon: <ExperimentOutlined />,
      label: 'AI生成章节',
      onClick: handleGenerateChapter,
    },
  ];

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className="ai-context-menu-container"
    >
      {children}

      {menuState.visible && (
        <div
          className="ai-context-menu-wrapper"
          style={{
            position: 'fixed',
            left: menuState.x,
            top: menuState.y,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Menu items={menuItems} className="ai-context-menu" />
        </div>
      )}
    </div>
  );
};

export default AIContextMenu;
