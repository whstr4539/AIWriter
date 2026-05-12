import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

interface UseEditorSetupOptions {
  content: string;
  placeholder?: string;
  editable?: boolean;
  onUpdate: (html: string, text: string) => void;
  onSelectionUpdate?: () => void;
  handleKeyDown?: (event: KeyboardEvent) => boolean;
}

export function useEditorSetup({
  content,
  placeholder = '开始创作...',
  editable = true,
  onUpdate,
  onSelectionUpdate,
  handleKeyDown,
}: UseEditorSetupOptions) {
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
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML(), editor.getText());
    },
    onSelectionUpdate,
    editorProps: {
      attributes: { class: 'editor-content' },
      handleKeyDown: (_view, event) => {
        return handleKeyDown?.(event) ?? false;
      },
    },
  });

  return editor;
}

export const calculateWordCount = (text: string): number => {
  const chineseChars = (text.match(/[一-龥]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
};

export default useEditorSetup;
