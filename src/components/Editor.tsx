import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { format } from 'date-fns'
import { useAutosave } from '../hooks/useAutosave'
import { getEntry, deleteEntry, upsertEntryMood } from '../lib/api'
import {
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Bold,
  Italic,
  Sparkles,
} from 'lucide-react'
import { SelectionMenu } from './SelectionMenu'
import { TTSPlayer } from './TTSPlayer'
import { MoodSelector } from './MoodSelector'
import { type MoodType } from '../types'

/**
 * Recursively filters out unsupported TipTap nodes from content.
 * This prevents warnings when loading content that contains nodes
 * for extensions that aren't currently configured (e.g., image nodes).
 */
function filterUnsupportedNodes(content: any): any {
  // Handle arrays (content is typically an array of nodes)
  if (Array.isArray(content)) {
    return content.map(filterUnsupportedNodes).filter(Boolean)
  }

  // Handle TipTap node objects (have a 'type' property)
  if (content && typeof content === 'object' && content.type) {
    // Filter out image nodes (and any other unsupported node types)
    if (content.type === 'image') {
      return null
    }

    // Recursively filter nested content
    const filtered = { ...content }
    if (filtered.content) {
      filtered.content = filterUnsupportedNodes(filtered.content)
    }
    return filtered
  }

  return content
}

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
`

export function Editor() {
  const {
    selectedDate,
    pendingSelectedDate,
    setSelectedDate,
    clearPendingSelectDate,
    editorContent,
    setEditorContent,
    setSaveStatus,
    currentEntry,
    setCurrentEntry,
    markDirty,
    clearDirty,
  } = useAppStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [entryText, setEntryText] = useState('')
  const [currentMood, setCurrentMood] = useState<MoodType | undefined>(undefined)

  // Update local mood state when entry changes
  useEffect(() => {
    setCurrentMood(currentEntry?.mood as MoodType | undefined)
  }, [currentEntry])

  // Handle mood change
  const handleMoodChange = async (mood: MoodType | undefined) => {
    setCurrentMood(mood)
    try {
      const updatedEntry = await upsertEntryMood(selectedDate, mood, undefined)
      setCurrentEntry(updatedEntry)
    } catch (error) {
      console.error('Failed to save mood:', error)
      // Revert on error
      setCurrentMood(currentEntry?.mood as MoodType | undefined)
    }
  }

  // Selection menu state
  const [showSelectionMenu, setShowSelectionMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')

  const { flushNow } = useAutosave()

  useEffect(() => {
    if (!pendingSelectedDate) return
    if (pendingSelectedDate === selectedDate) {
      clearPendingSelectDate()
      return
    }

    const switchDate = async () => {
      const ok = await flushNow()
      if (!ok) {
        clearPendingSelectDate()
        return
      }

      setSelectedDate(pendingSelectedDate)
      clearPendingSelectDate()
    }

    void switchDate()
  }, [clearPendingSelectDate, flushNow, pendingSelectedDate, selectedDate, setSelectedDate])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteEntry(selectedDate)
      // Clear editor and state
      if (editor) {
        editor.commands.clearContent(false)
      }
      setEditorContent({ type: 'doc', content: [] })
      setCurrentEntry(null)
      clearDirty()
      setSaveStatus('idle')
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete entry:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle selection change to show AI menu
  const handleSelectionUpdate = ({ editor }: { editor: any }) => {
    const { from, to, empty } = editor.state.selection

    // Only show menu when there's a non-empty selection
    if (empty || from === null || to === null) {
      setShowSelectionMenu(false)
      return
    }

    const text = editor.state.doc.textBetween(from, to)
    if (text.trim().length === 0) {
      setShowSelectionMenu(false)
      return
    }

    setSelectedText(text)

    // Calculate menu position
    const coords = editor.view.coordsAtPos(from)
    if (coords) {
      setMenuPosition({ x: coords.left, y: coords.top })
      setShowSelectionMenu(true)
    }
  }

  // Handle AI result replacement
  const handleReplaceText = (newText: string) => {
    if (editor) {
      editor.commands.insertContentAt(
        {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        },
        newText
      )
    }
  }

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
      const json = editor.getJSON()
      setEditorContent(json)

      // Extract plain text for TTS
      const text = editor.getText()
      setEntryText(text)

      markDirty(selectedDate)
      setSaveStatus('idle')
    },
    onSelectionUpdate: handleSelectionUpdate,
    onBlur: () => {
      void flushNow()
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  })

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const entry = await getEntry(selectedDate)
        setCurrentEntry(entry)
      } catch (error) {
        console.error('Failed to load entry:', error)
      }
    }

    loadEntry()
  }, [selectedDate, setCurrentEntry])

  useEffect(() => {
    if (editor && currentEntry?.content_json) {
      try {
        const content = JSON.parse(currentEntry.content_json)
        // Filter out unsupported nodes (e.g., image nodes) to prevent TipTap warnings
        const filteredContent = filterUnsupportedNodes(content)
        editor.commands.setContent(filteredContent, { emitUpdate: false })
        setEditorContent(filteredContent)

        // Extract plain text for TTS
        const text = editor.getText()
        setEntryText(text)

        clearDirty()
        setSaveStatus('idle')
      } catch {
        editor.commands.clearContent(false)
        setEditorContent({ type: 'doc', content: [] })
        setEntryText('')
        clearDirty()
        setSaveStatus('idle')
      }
    } else if (editor && !currentEntry) {
      editor.commands.clearContent(false)
      setEditorContent({ type: 'doc', content: [] })
      setEntryText('')
      clearDirty()
      setSaveStatus('idle')
    }
  }, [clearDirty, currentEntry, editor, setEditorContent, setSaveStatus])

  const displayDate = new Date(selectedDate + 'T00:00:00')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + S - Save
      if (isMod && e.key === 's') {
        e.preventDefault()
        void flushNow()
        return
      }

      // Only process editor shortcuts when editor is focused
      if (!editor || !editor.isFocused) return

      // Cmd/Ctrl + B - Bold
      if (isMod && e.key === 'b') {
        e.preventDefault()
        editor.chain().focus().toggleBold().run()
        return
      }

      // Cmd/Ctrl + I - Italic
      if (isMod && e.key === 'i') {
        e.preventDefault()
        editor.chain().focus().toggleItalic().run()
        return
      }

      // Cmd/Ctrl + 1/2/3 - Headings
      if (isMod && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault()
        const level = parseInt(e.key) as 1 | 2 | 3
        editor.chain().focus().toggleHeading({ level }).run()
        return
      }

      // Cmd/Ctrl + Shift + 7 - Ordered list
      if (isMod && e.shiftKey && e.key === '7') {
        e.preventDefault()
        editor.chain().focus().toggleOrderedList().run()
        return
      }

      // Cmd/Ctrl + Shift + 8 - Bullet list
      if (isMod && e.shiftKey && e.key === '8') {
        e.preventDefault()
        editor.chain().focus().toggleBulletList().run()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, flushNow])

  // Toolbar button component
  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    shortcut,
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
    shortcut?: string
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive ? 'bg-accent-blue text-white' : 'hover:bg-white/60 text-stone-600'
      }`}
      title={shortcut ? `${title} (${shortcut})` : title}
    >
      {children}
    </button>
  )

  return (
    <>
      <style>{editorStyles}</style>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-border/40 bg-paper-bg px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-secondary">{format(displayDate, 'EEEE')}</span>
              <span className="text-ink-primary font-medium">
                {format(displayDate, 'MMM d, yyyy')}
              </span>
            </div>

            {/* Mood Selector */}
            <div className="h-8 w-px bg-border/40" />
            <MoodSelector
              entryDate={selectedDate}
              currentMood={currentMood}
              onMoodChange={handleMoodChange}
            />
          </div>

          {/* TTS Player and Delete button - only show when there's content */}
          {currentEntry && (
            <div className="flex items-center gap-2">
              {/* TTS Player */}
              <TTSPlayer text={entryText} language="auto" />

              {/* Delete button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-100 text-stone-500 hover:text-red-600 transition-colors"
                title="Delete entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/60 rounded-lg paper-shadow min-h-[500px]">
              {/* Empty State */}
              {!currentEntry && !editor?.getText().trim() && (
                <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                  <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-amber-100 to-blue-100 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-10 h-10 text-accent-blue" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink-primary mb-2">
                    Start your journal
                  </h3>
                  <p className="text-sm text-ink-secondary max-w-xs text-center">
                    {format(displayDate, 'EEEE, MMMM d')} — Write something for today...
                  </p>
                  <div className="mt-6 flex items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-600 font-mono">
                        ⌘S
                      </kbd>
                      <span>to save</span>
                    </span>
                    <span className="text-stone-300">|</span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-600 font-mono">
                        ⌘B
                      </kbd>
                      <span>bold</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Formatting Toolbar */}
              {editor && (
                <div className="flex items-center gap-1 p-3 border-b border-stone-200/60">
                  {/* Headings */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                    shortcut="⌘1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                    shortcut="⌘2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                    shortcut="⌘3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </ToolbarButton>

                  <div className="w-px h-6 bg-stone-300 mx-1" />

                  {/* Text formatting */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold"
                    shortcut="⌘B"
                  >
                    <Bold className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic"
                    shortcut="⌘I"
                  >
                    <Italic className="w-4 h-4" />
                  </ToolbarButton>

                  <div className="w-px h-6 bg-stone-300 mx-1" />

                  {/* Lists */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet list"
                    shortcut="⌘⇧8"
                  >
                    <List className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Ordered list"
                    shortcut="⌘⇧7"
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

      {/* AI Selection Menu */}
      {showSelectionMenu && (
        <SelectionMenu
          isVisible={showSelectionMenu}
          position={menuPosition}
          selectedText={selectedText}
          onReplace={handleReplaceText}
          onClose={() => setShowSelectionMenu(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 paper-shadow p-6">
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Delete entry</h3>
            <p className="text-stone-600 mb-6">
              Delete the entry for {format(displayDate, 'MMM d, yyyy')}? This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
