import { useState, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { AIOperationType } from '../utils/promptTemplates';
import { PromptTemplate } from '../utils/promptTemplates';
import { aiApi } from '../api/ipc';
import type { AIStreamChunk } from '../api/ipc';

const AI_HIGHLIGHT_COLOR = '#b1d5ff';

interface UseAIWriteOptions {
  editor: Editor | null;
  novelTitle?: string;
  chapterTitle?: string;
}

interface UseAIWriteReturn {
  isStreaming: boolean;
  triggerAI: (operation: AIOperationType) => void;
  acceptAI: () => void;
  rejectAI: () => void;
}

export function useAIWrite({ editor, novelTitle, chapterTitle }: UseAIWriteOptions): UseAIWriteReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const aiRangeRef = useRef<{ from: number; to: number } | null>(null);
  const streamingRef = useRef(false);

  const triggerAI = useCallback(async (operation: AIOperationType) => {
    if (!editor || streamingRef.current) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const docText = editor.getText();
    const contextStart = Math.max(0, from - 200);
    const contextEnd = Math.min(docText.length, to + 200);
    const contextText = docText.substring(contextStart, contextEnd);

    const prompt = PromptTemplate.build(operation, {
      selectedText: selectedText || contextText,
      contextText,
      chapterTitle,
      novelTitle,
    });

    const insertPos = operation === 'continue' ? to : from;

    streamingRef.current = true;
    setIsStreaming(true);
    aiRangeRef.current = { from: insertPos, to: insertPos };

    try {
      await aiApi.streamGenerate(prompt, {
        onChunk: (chunk: AIStreamChunk) => {
          if (!chunk.content || !editor) return;

          const range = aiRangeRef.current;
          if (!range) return;

          // Insert content at end of AI range, then highlight it
          const insertAt = range.to;
          editor
            .chain()
            .focus()
            .insertContentAt(insertAt, chunk.content)
            .setTextSelection({ from: insertAt, to: insertAt + chunk.content.length })
            .setHighlight({ color: AI_HIGHLIGHT_COLOR })
            .run();

          aiRangeRef.current = {
            from: range.from,
            to: insertAt + chunk.content.length,
          };
        },
        onError: (error: string) => {
          console.error('AI streaming error:', error);
          streamingRef.current = false;
          setIsStreaming(false);
        },
        onComplete: () => {
          streamingRef.current = false;
        },
      });
    } catch (error) {
      console.error('AI write error:', error);
      streamingRef.current = false;
      setIsStreaming(false);
    }
  }, [editor, novelTitle, chapterTitle]);

  const acceptAI = useCallback(() => {
    if (!editor || !aiRangeRef.current) return;

    const { from, to } = aiRangeRef.current;
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .unsetHighlight()
      .setTextSelection(to) // place cursor at end
      .run();

    aiRangeRef.current = null;
    setIsStreaming(false);
  }, [editor]);

  const rejectAI = useCallback(() => {
    if (!editor || !aiRangeRef.current) return;

    const { from, to } = aiRangeRef.current;
    // Delete entire AI range
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .run();

    aiRangeRef.current = null;
    setIsStreaming(false);
  }, [editor]);

  return {
    isStreaming,
    triggerAI,
    acceptAI,
    rejectAI,
  };
}

export default useAIWrite;
