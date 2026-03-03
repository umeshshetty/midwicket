import { useState, useEffect, useRef } from 'react'
import { Search, X, Hash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import type { Note } from '../../types'

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} style={{ background: 'rgba(139,92,246,0.3)', color: '#e8e8f0', borderRadius: 2 }}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function SearchResultCard({ note, query }: { note: Note; query: string }) {
  const openNote = useUIStore(s => s.openNote)
  const preview = note.plainText.slice(0, 200)

  return (
    <div
      onClick={() => openNote(note.id)}
      className="rounded-xl border p-4 cursor-pointer transition-all"
      style={{ background: '#1a1a1d', borderColor: '#2e2e35' }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6'
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#2e2e35'
        ;(e.currentTarget as HTMLElement).style.background = '#1a1a1d'
      }}
    >
      <h3 className="font-medium text-sm mb-1.5" style={{ color: '#e8e8f0' }}>
        {highlight(note.title, query)}
      </h3>
      <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: '#9090a8' }}>
        {highlight(preview, query)}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}
            >
              <Hash size={9} />
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs" style={{ color: '#5a5a72' }}>
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}

export default function SearchView() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchNotes, notes } = useNotesStore()
  const setView = useUIStore(s => s.setView)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = query.trim() ? searchNotes(query) : notes.slice(0, 20)

  // Get all unique tags for quick filter
  const allTags = [...new Set(notes.flatMap(n => n.tags))].slice(0, 12)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search input */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: '#0c0c0d' }}>
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
          style={{ background: '#1a1a1d', borderColor: '#8b5cf6', boxShadow: '0 0 0 1px rgba(139,92,246,0.2)' }}
        >
          <Search size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, tags, content…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: '#e8e8f0', caretColor: '#8b5cf6' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: '#5a5a72' }}>
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => setView('inbox')}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{ color: '#9090a8', background: '#2a2a2f' }}
          >
            Esc
          </button>
        </div>

        {/* Quick tag filters */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setQuery(`#${tag}`)}
                className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: query === `#${tag}` ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                  color: query === `#${tag}` ? '#8b5cf6' : '#9090a8',
                  border: query === `#${tag}` ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                }}
              >
                <Hash size={9} />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs" style={{ color: '#5a5a72' }}>
            {query ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : `${results.length} notes`}
          </span>
        </div>

        {results.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ background: '#1a1a1d', borderColor: '#2e2e35' }}
          >
            <Search size={24} style={{ color: '#5a5a72', margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: '#9090a8' }}>
              No notes match "{query}"
            </p>
            <p className="text-xs mt-1" style={{ color: '#5a5a72' }}>
              Try different keywords or browse all notes
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map(note => (
              <SearchResultCard key={note.id} note={note} query={query.replace(/^#/, '')} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
