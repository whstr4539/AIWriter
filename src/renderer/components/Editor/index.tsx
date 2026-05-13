import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import Toolbar from './Toolbar';
import AIFloatingToolbar from '../AIFloatingToolbar';
import AIContextMenu from '../AIContextMenu';
import AIDialog from '../AIDialog';
import AIGenerateChapterDialog from '../AIGenerateChapterDialog';
import { AIOperationType } from '../../utils/promptTemplates';
import { useAIWrite } from '../../hooks';
import './styles.css';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange?: (count: number) => void;
  placeholder?: string;
  readOnly?: boolean;
  focusMode?: boolean;
  novelTitle?: string;
  chapterTitle?: string;
  chapterOutline?: string;
  showLineHighlight?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onWordCountChange,
  placeholder = '开始创作...',
  readOnly = false,
  focusMode = false,
  novelTitle,
  chapterTitle,
  chapterOutline,
  showLineHighlight = true,
}) => {
  // AI context menu dialog
  const [contextMenuDialogOpen, setContextMenuDialogOpen] = useState(false);
  const [contextMenuOperation, setContextMenuOperation] = useState<AIOperationType>('continue');
  const [contextMenuSelectedText, setContextMenuSelectedText] = useState('');
  const [contextMenuContextText, setContextMenuContextText] = useState('');
  const [generateChapterDialogOpen, setGenerateChapterDialogOpen] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks in refs so TipTap's onUpdate always uses current version
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onWordCountChangeRef = useRef(onWordCountChange);
  onWordCountChangeRef.current = onWordCountChange;

  const calculateWordCount = useCallback((text: string): number => {
    const chineseChars = (text.match(/[一-龥]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChangeRef.current(html);
      if (onWordCountChangeRef.current) {
        onWordCountChangeRef.current(calculateWordCount(text));
      }
      if (showLineHighlight) {
        updateCurrentLineHighlight(editor);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (showLineHighlight) {
        updateCurrentLineHighlight(editor);
      }
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
      handleKeyDown: (_view, event) => {
        // AI streaming mode: Tab to accept, Esc to reject
        if (isStreaming) {
          if (event.key === 'Tab') {
            event.preventDefault();
            acceptAI();
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            rejectAI();
            return true;
          }
          // Block other input while streaming
          return true;
        }

        // Ctrl+Shift+A: trigger AI continue at cursor
        if (event.ctrlKey && event.shiftKey && event.key === 'A') {
          event.preventDefault();
          handleInlineAI('continue');
          return true;
        }
        return false;
      },
    },
  });

  // AI inline write
  const { isStreaming, triggerAI, acceptAI, rejectAI } = useAIWrite({
    editor,
    novelTitle,
    chapterTitle,
  });

  const updateCurrentLineHighlight = useCallback((editor: any) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        const element = editor.view.domAtPos(pos + 1).node as HTMLElement;
        if (element && 'setAttribute' in element) {
          element.removeAttribute('data-is-current');
        }
      }
    });
    const currentNode = editor.state.doc.nodeAt(from);
    if (currentNode && (currentNode.type.name === 'paragraph' || currentNode.type.name === 'heading')) {
      const element = editor.view.domAtPos(from).node as HTMLElement;
      if (element && element.setAttribute) {
        element.setAttribute('data-is-current', 'true');
      }
    }
  }, []);

  // Inline AI operation (from floating toolbar or shortcut)
  const handleInlineAI = useCallback((operation: AIOperationType) => {
    triggerAI(operation);
  }, [triggerAI]);

  // Right-click context menu → still uses dialog for now
  const handleContextMenuAI = useCallback((operation: AIOperationType) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    const docText = editor.getText();
    const contextStart = Math.max(0, from - 200);
    const contextEnd = Math.min(docText.length, to + 200);
    const context = docText.substring(contextStart, contextEnd);

    setContextMenuSelectedText(text);
    setContextMenuContextText(context);
    setContextMenuOperation(operation);
    setContextMenuDialogOpen(true);
  }, [editor]);

  const handleAcceptContextMenuAI = useCallback((aiContent: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    switch (contextMenuOperation) {
      case 'continue':
        editor.chain().focus().insertContentAt(to, aiContent).run();
        break;
      case 'rewrite':
      case 'polish':
      case 'expand':
        editor.chain().focus().deleteRange({ from, to }).insertContent(aiContent).run();
        break;
      default:
        editor.chain().focus().insertContent(aiContent).run();
    }
  }, [editor, contextMenuOperation]);

  // Generate chapter dialog
  const handleOpenGenerateChapterDialog = useCallback(() => {
    setGenerateChapterDialogOpen(true);
  }, []);

  const handleAcceptChapter = useCallback((chapterContent: string, _title: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(chapterContent).run();
  }, [editor]);

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    // Don't overwrite editor with empty string during initial load
    // (empty content prop means "not loaded yet", not "clear the editor")
    if (!content) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!editor) return null;

  return (
    <AIContextMenu
      editor={editor}
      novelTitle={novelTitle}
      chapterTitle={chapterTitle}
      onAIOperation={handleContextMenuAI}
      onGenerateChapter={handleOpenGenerateChapterDialog}
    >
      <div
        className={`rich-text-editor ${focusMode ? 'focus-mode' : ''} ${isStreaming ? 'ai-streaming' : ''}`}
        ref={editorContainerRef}
      >
        {!focusMode && (
          <Toolbar
            editor={editor}
            onAIButtonClick={() => handleInlineAI('continue')}
          />
        )}
        <div className="editor-container" ref={contentRef}>
          <EditorContent editor={editor} />
          <AIFloatingToolbar
            editor={editor}
            novelTitle={novelTitle}
            chapterTitle={chapterTitle}
            onAIOperation={handleInlineAI}
          />
          {isStreaming && (
            <div className="ai-streaming-indicator">
              <span className="ai-streaming-dot" />
              AI 正在生成... Tab 接受 · Esc 拒绝
            </div>
          )}
        </div>

        {/* Context menu AI dialog */}
        <AIDialog
          open={contextMenuDialogOpen}
          operation={contextMenuOperation}
          selectedText={contextMenuSelectedText}
          contextText={contextMenuContextText}
          chapterTitle={chapterTitle}
          novelTitle={novelTitle}
          onAccept={handleAcceptContextMenuAI}
          onReject={() => {}}
          onClose={() => setContextMenuDialogOpen(false)}
        />

        <AIGenerateChapterDialog
          open={generateChapterDialogOpen}
          novelTitle={novelTitle}
          chapterOutline={chapterOutline}
          onClose={() => setGenerateChapterDialogOpen(false)}
          onAccept={handleAcceptChapter}
        />
      </div>
    </AIContextMenu>
  );
};

export default RichTextEditor;
