import { formatDistanceToNow } from 'date-fns'
import { Pin, Mic, Trash2, Hash } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import type { Note } from '../../types'

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  default: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  idea: { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6' },
  todo: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  important: { bg: 'rgba(244,63,94,0.12)', color: '#f43f5e' },
}

function getTagStyle(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? TAG_COLORS.default
}

interface NoteCardProps {
  note: Note
  isSelected?: boolean
}

export default function NoteCard({ note, isSelected }: NoteCardProps) {
  const { togglePin, deleteNote } = useNotesStore()
  const openNote = useUIStore(s => s.openNote)

  const preview = note.plainText.slice(0, 160).replace(/\n+/g, ' ')
  const timeAgo = formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })

  return (
    <div
      onClick={() => openNote(note.id)}
      className="group rounded-xl border p-4 cursor-pointer transition-all duration-150"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.1)' : '#1a1a1d',
        borderColor: isSelected ? '#8b5cf6' : '#2e2e35',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#3d3d47'
          ;(e.currentTarget as HTMLElement).style.background = '#1e1e22'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#2e2e35'
          ;(e.currentTarget as HTMLElement).style.background = '#1a1a1d'
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {note.isVoiceCapture && (
            <span className="flex-shrink-0">
              <Mic size={12} style={{ color: '#14b8a6' }} />
            </span>
          )}
          <h3
            className="font-medium text-sm leading-snug truncate"
            style={{ color: '#e8e8f0' }}
          >
            {note.title}
          </h3>
        </div>

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => togglePin(note.id)}
            className="rounded p-1 transition-colors"
            style={{ color: note.isPinned ? '#8b5cf6' : '#5a5a72' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#8b5cf6')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = note.isPinned ? '#8b5cf6' : '#5a5a72')}
            title={note.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={13} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => deleteNote(note.id)}
            className="rounded p-1 transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#9090a8' }}>
        {preview || '(empty)'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.tags.slice(0, 3).map(tag => {
            const style = getTagStyle(tag)
            return (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium"
                style={{ background: style.bg, color: style.color }}
              >
                <Hash size={9} />
                {tag}
              </span>
            )
          })}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: '#5a5a72' }}>
          {timeAgo}
        </span>
      </div>
    </div>
  )
}
