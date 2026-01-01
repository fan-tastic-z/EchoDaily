import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { format } from 'date-fns';
import { useAutosave } from '../hooks/useAutosave';
import { getEntry } from '../lib/api';

const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 500px;
    line-height: 1.8;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: rgba(92, 74, 58, 0.4);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .ProseMirror p {
    margin-bottom: 1em;
  }

  /* Selection highlight */
  .ProseMirror ::selection {
    background: rgba(74, 111, 165, 0.2);
  }

  /* Reserved marker for AI generated content */
  .ProseMirror .ai-generated {
    color: #4A6FA5;
  }

  /* Placeholder */
  .ProseMirror p.is-empty:first-child::before {
    color: rgba(92, 74, 58, 0.4);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;

export function Editor() {
  const { selectedDate, editorContent, setEditorContent, setSaveStatus, currentEntry, setCurrentEntry, markDirty, clearDirty } = useAppStore();

  useAutosave();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: 'Write something for today...',
      }),
    ],
    content: editorContent || { type: 'doc', content: [] },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      setEditorContent(json);
      markDirty(selectedDate);
      setSaveStatus('idle');
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const entry = await getEntry(selectedDate);
        setCurrentEntry(entry);
      } catch (error) {
        console.error('Failed to load entry:', error);
      }
    };

    loadEntry();
  }, [selectedDate, setCurrentEntry]);

  useEffect(() => {
    if (editor && currentEntry?.content_json) {
      try {
        const content = JSON.parse(currentEntry.content_json);
        editor.commands.setContent(content, { emitUpdate: false });
        setEditorContent(content);
        clearDirty();
        setSaveStatus('idle');
      } catch {
        editor.commands.clearContent(false);
        setEditorContent({ type: 'doc', content: [] });
        clearDirty();
        setSaveStatus('idle');
      }
    } else if (editor && !currentEntry) {
      editor.commands.clearContent(false);
      setEditorContent({ type: 'doc', content: [] });
      clearDirty();
      setSaveStatus('idle');
    }
  }, [clearDirty, currentEntry, editor, setEditorContent, setSaveStatus]);

  const displayDate = new Date(selectedDate + 'T00:00:00');

  return (
    <>
      <style>{editorStyles}</style>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-border/40 bg-paper-bg px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-secondary">
              {format(displayDate, 'EEEE')}
            </span>
            <span className="text-ink-primary font-medium">
              {format(displayDate, 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/60 rounded-lg paper-shadow p-6 min-h-[500px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
