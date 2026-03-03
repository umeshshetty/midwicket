import { useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import {
  Bold, Italic, List, ListOrdered, Heading2, Code,
  Quote, Minus, Pin, Trash2, Hash,
  AlignLeft,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const tools = [
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
      title: 'Heading',
    },
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      title: 'Bold (⌘B)',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      title: 'Italic (⌘I)',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive('code'),
      title: 'Inline code',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      title: 'Blockquote',
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      title: 'Bullet list',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      title: 'Numbered list',
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      title: 'Divider',
    },
  ]

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 border-b overflow-x-auto"
      style={{ borderColor: '#2e2e35', flexShrink: 0 }}
    >
      {tools.map((tool, i) => {
        const Icon = tool.icon
        return (
          <button
            key={i}
            onClick={tool.action}
            title={tool.title}
            className="rounded p-1.5 transition-colors"
            style={{
              color: tool.isActive ? '#8b5cf6' : '#9090a8',
              background: tool.isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!tool.isActive) (e.currentTarget as HTMLElement).style.color = '#e8e8f0'
            }}
            onMouseLeave={e => {
              if (!tool.isActive) (e.currentTarget as HTMLElement).style.color = '#9090a8'
            }}
          >
            <Icon size={15} />
          </button>
        )
      })}
    </div>
  )
}

export default function NoteEditor() {
  const { activeNoteId, closeNote } = useUIStore()
  const { getNoteById, updateNote, deleteNote, togglePin } = useNotesStore()

  const note = activeNoteId ? getNoteById(activeNoteId) : null
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Continue your thought… use #tags to categorize',
      }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: 'min-height: 100%; padding: 1.5rem; font-size: 0.9375rem; line-height: 1.75; color: #e8e8f0;',
      },
    },
    content: note?.content ? JSON.parse(note.content) : '',
    onUpdate: ({ editor }) => {
      if (!activeNoteId) return
      const json = JSON.stringify(editor.getJSON())
      const plainText = editor.getText()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        updateNote(activeNoteId, { content: json, plainText })
      }, 500)
    },
  })

  // Load note content when switching notes
  useEffect(() => {
    if (!editor || !note) return
    const currentContent = JSON.stringify(editor.getJSON())
    if (currentContent !== note.content) {
      try {
        const parsed = JSON.parse(note.content)
        editor.commands.setContent(parsed)
      } catch {
        editor.commands.setContent(note.plainText)
      }
    }
  }, [note?.id])  // only re-run when note ID changes

  const handleDelete = useCallback(() => {
    if (!activeNoteId) return
    if (confirm('Delete this note?')) {
      deleteNote(activeNoteId)
      closeNote()
    }
  }, [activeNoteId, deleteNote, closeNote])

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlignLeft size={28} style={{ color: '#5a5a72', margin: '0 auto 12px' }} />
          <p className="text-sm" style={{ color: '#5a5a72' }}>
            Select a note to edit
          </p>
        </div>
      </div>
    )
  }

  const wordCount = editor?.storage.characterCount?.words() ?? note.wordCount

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Note meta header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#2e2e35', flexShrink: 0 }}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs" style={{ color: '#5a5a72' }}>
              Created {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
              {note.updatedAt !== note.createdAt &&
                ` · Updated ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}`}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}
                >
                  <Hash size={9} />
                  {tag}
                </span>
              ))}
              <span className="text-xs" style={{ color: '#5a5a72' }}>
                {wordCount} words
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePin(note.id)}
            className="rounded-lg p-2 transition-colors"
            style={{ color: note.isPinned ? '#8b5cf6' : '#5a5a72' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#8b5cf6')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = note.isPinned ? '#8b5cf6' : '#5a5a72')}
            title={note.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={16} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-2 transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#131315' }}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
