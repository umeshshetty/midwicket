import { MessageSquare, Search, X, ArrowLeft } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useNotesStore } from '../../stores/notesStore'

export default function TopBar() {
  const { view, isChatOpen, toggleChat, closeNote, activeNoteId, setSearchQuery } = useUIStore()
  const getNoteById = useNotesStore(s => s.getNoteById)

  const activeNote = activeNoteId ? getNoteById(activeNoteId) : null

  return (
    <header
      className="flex items-center justify-between px-4 border-b"
      style={{
        height: 56,
        background: '#131315',
        borderColor: '#2e2e35',
        flexShrink: 0,
      }}
    >
      {/* Left: breadcrumb / title */}
      <div className="flex items-center gap-2">
        {view === 'note' && activeNote && (
          <>
            <button
              onClick={closeNote}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#9090a8' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e8e8f0')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9090a8')}
            >
              <ArrowLeft size={16} />
              <span>Inbox</span>
            </button>
            <span style={{ color: '#2e2e35' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
              {activeNote.title}
            </span>
          </>
        )}
        {view === 'inbox' && (
          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
            Inbox
          </span>
        )}
        {view === 'search' && (
          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
            Search
          </span>
        )}
        {view === 'graph' && (
          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
            Knowledge Graph
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {view !== 'search' && (
          <button
            onClick={() => setSearchQuery('')}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ color: '#9090a8', background: '#1a1a1d' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.color = '#e8e8f0'
              ;(e.currentTarget as HTMLElement).style.background = '#222226'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.color = '#9090a8'
              ;(e.currentTarget as HTMLElement).style.background = '#1a1a1d'
            }}
          >
            <Search size={14} />
            <span>Search</span>
            <kbd
              className="text-xs rounded px-1"
              style={{ background: '#2a2a2f', color: '#5a5a72', fontFamily: 'monospace' }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        <button
          onClick={toggleChat}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
          style={{
            color: isChatOpen ? '#8b5cf6' : '#9090a8',
            background: isChatOpen ? 'rgba(139,92,246,0.15)' : '#1a1a1d',
          }}
          onMouseEnter={e => {
            if (!isChatOpen) {
              ;(e.currentTarget as HTMLElement).style.color = '#e8e8f0'
              ;(e.currentTarget as HTMLElement).style.background = '#222226'
            }
          }}
          onMouseLeave={e => {
            if (!isChatOpen) {
              ;(e.currentTarget as HTMLElement).style.color = '#9090a8'
              ;(e.currentTarget as HTMLElement).style.background = '#1a1a1d'
            }
          }}
        >
          {isChatOpen ? <X size={14} /> : <MessageSquare size={14} />}
          <span>{isChatOpen ? 'Close' : 'Think'}</span>
        </button>
      </div>
    </header>
  )
}
