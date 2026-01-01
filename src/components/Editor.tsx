import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { format } from 'date-fns';
import { useAutosave } from '../hooks/useAutosave';
import { getEntry, deleteEntry } from '../lib/api';
import { Trash2, Heading1, Heading2, Heading3, List, ListOrdered, Bold, Italic } from 'lucide-react';

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

  /* Headings */
  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    margin-top: 1em;
    margin-bottom: 0.5em;
    line-height: 1.2;
    color: #1a1a1a;
  }

  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 0.8em;
    margin-bottom: 0.4em;
    line-height: 1.3;
    color: #2a2a2a;
  }

  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 0.6em;
    margin-bottom: 0.3em;
    line-height: 1.4;
    color: #3a3a3a;
  }

  /* Lists */
  .ProseMirror ul {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }

  .ProseMirror ul li {
    margin-bottom: 0.25em;
  }

  .ProseMirror ul li::marker {
    color: #5C4A3A;
  }

  .ProseMirror ol {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }

  .ProseMirror ol li {
    margin-bottom: 0.25em;
  }

  .ProseMirror ol li::marker {
    color: #5C4A3A;
    font-weight: 500;
  }

  /* Bold and Italic */
  .ProseMirror strong {
    font-weight: 700;
    color: #1a1a1a;
  }

  .ProseMirror em {
    font-style: italic;
    color: #4a4a4a;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useAutosave();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(selectedDate);
      // Clear editor and state
      if (editor) {
        editor.commands.clearContent();
      }
      setEditorContent({ type: 'doc', content: [] });
      setCurrentEntry(null);
      clearDirty();
      setSaveStatus('idle');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Toolbar button component
  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-accent-blue text-white'
          : 'hover:bg-white/60 text-stone-600'
      }`}
      title={title}
    >
      {children}
    </button>
  );

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

          {/* Delete button - only show when there's content */}
          {currentEntry && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
              title="删除日记"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/60 rounded-lg paper-shadow min-h-[500px]">
              {/* Formatting Toolbar */}
              {editor && (
                <div className="flex items-center gap-1 p-3 border-b border-stone-200/60">
                  {/* Headings */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="标题 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="标题 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="标题 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </ToolbarButton>

                  <div className="w-px h-6 bg-stone-300 mx-1" />

                  {/* Text formatting */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="粗体"
                  >
                    <Bold className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="斜体"
                  >
                    <Italic className="w-4 h-4" />
                  </ToolbarButton>

                  <div className="w-px h-6 bg-stone-300 mx-1" />

                  {/* Lists */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="无序列表"
                  >
                    <List className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="有序列表"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </ToolbarButton>
                </div>
              )}

              <div className="p-6">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 paper-shadow p-6">
            <h3 className="text-lg font-semibold text-stone-800 mb-2">删除日记</h3>
            <p className="text-stone-600 mb-6">
              确定要删除 {format(displayDate, 'yyyy年MM月dd日')} 的日记吗？此操作无法撤销。
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
