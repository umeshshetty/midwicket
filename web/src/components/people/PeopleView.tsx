import { useState, useMemo } from 'react'
import { Users, ArrowLeft, FileText } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import BlindspotPanel from '../blindspot/BlindspotPanel'
import EvolutionTimeline from '../shared/EvolutionTimeline'
import type { GraphNode } from '../../types'

// ─── Relationship badge colours ───────────────────────────────────────────────

const REL_COLORS: Record<string, { bg: string; text: string }> = {
  colleague:   { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6' },
  client:      { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
  mentor:      { bg: 'rgba(139,92,246,0.15)',  text: '#8b5cf6' },
  advisor:     { bg: 'rgba(139,92,246,0.15)',  text: '#8b5cf6' },
  friend:      { bg: 'rgba(20,184,166,0.15)',  text: '#14b8a6' },
  stakeholder: { bg: 'rgba(249,115,22,0.15)',  text: '#f97316' },
}

function relColor(rel?: string) {
  return rel ? (REL_COLORS[rel] ?? { bg: 'rgba(144,144,168,0.12)', text: '#9090a8' }) : null
}

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
  const m = node.metadata
  const rc = relColor(m?.relationshipType)
  const lastDate = m?.lastMentionedAt ? new Date(m.lastMentionedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all duration-150"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? '#8b5cf680' : '#2e2e35'}`,
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
    >
      {/* Name row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-sm" style={{ color: '#e8e8f0' }}>{node.label}</span>
        <span className="text-xs flex-shrink-0" style={{ color: '#5a5a72' }}>
          {node.noteIds.length} note{node.noteIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Role + Org */}
      {(m?.role || m?.organization) && (
        <div className="text-xs mb-1.5 truncate" style={{ color: '#14b8a6' }}>
          {[m.role, m.organization].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Footer: relationship badge + last seen */}
      <div className="flex items-center gap-2">
        {rc && m?.relationshipType && (
          <span
            className="text-xs rounded-full px-2 py-0.5 capitalize"
            style={{ background: rc.bg, color: rc.text }}
          >
            {m.relationshipType}
          </span>
        )}
        {lastDate && (
          <span className="text-xs ml-auto" style={{ color: '#5a5a72' }}>
            {lastDate}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function PersonDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const m = node.metadata
  const notes = useNotesStore(s => s.notes)
  const openNote = useUIStore(s => s.openNote)

  const personNotes = useMemo(
    () => notes.filter(n => node.noteIds.includes(n.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes, node.noteIds]
  )

  const rc = relColor(m?.relationshipType)

  return (
    <div className="flex flex-col h-full" style={{ background: '#131315' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: '#2e2e35' }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 28, height: 28, color: '#9090a8' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e8e8f0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9090a8'}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-bold text-base" style={{ color: '#e8e8f0' }}>{node.label}</h2>
          {(m?.role || m?.organization) && (
            <p className="text-xs" style={{ color: '#14b8a6' }}>
              {[m.role, m.organization].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Context fields */}
      <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: '#2e2e35' }}>
        {m?.relationshipType && rc && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#5a5a72' }}>Relationship</span>
            <span
              className="text-xs rounded-full px-2.5 py-0.5 capitalize"
              style={{ background: rc.bg, color: rc.text }}
            >
              {m.relationshipType}
            </span>
          </div>
        )}
        {m?.keyFact && (
          <div
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#c4b5fd', borderLeft: '2px solid #8b5cf640' }}
          >
            {m.keyFact}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#5a5a72' }}>
          Notes mentioning {node.label}
        </h3>
        {personNotes.length === 0 ? (
          <p className="text-sm" style={{ color: '#5a5a72' }}>No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {personNotes.map(note => (
              <button
                key={note.id}
                onClick={() => openNote(note.id)}
                className="w-full text-left rounded-lg p-3 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2e2e35' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
              >
                <div className="flex items-start gap-2">
                  <FileText size={13} style={{ color: '#5a5a72', flexShrink: 0, marginTop: 1 }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#e8e8f0' }}>{note.title}</div>
                    <div className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9090a8' }}>
                      {note.plainText.slice(0, 120)}
                    </div>
                  </div>
                </div>
                <div className="text-xs mt-1.5 text-right" style={{ color: '#5a5a72' }}>
                  {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Evolution Timeline */}
        <EvolutionTimeline entityNode={node} />

        {/* Blindspot Analysis */}
        <BlindspotPanel
          noteIds={node.noteIds}
          entityLabel={node.label}
          entityContext={m?.summary ?? m?.keyFact}
        />
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PeopleView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const nodes = useGraphStore(s => s.nodes)

  const people = useMemo(
    () =>
      nodes
        .filter(n => n.type === 'entity' && n.entityType === 'person')
        .sort((a, b) => {
          // Sort by note count desc, then alphabetically
          if (b.noteIds.length !== a.noteIds.length) return b.noteIds.length - a.noteIds.length
          return a.label.localeCompare(b.label)
        }),
    [nodes]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return people
    const q = query.toLowerCase()
    return people.filter(
      n =>
        n.label.toLowerCase().includes(q) ||
        n.metadata?.role?.toLowerCase().includes(q) ||
        n.metadata?.organization?.toLowerCase().includes(q)
    )
  }, [people, query])

  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) ?? null : null

  return (
    <div className="flex h-full min-h-0" style={{ background: '#0c0c0d' }}>
      {/* Left panel — person list */}
      <div
        className="flex flex-col border-r"
        style={{ width: 300, flexShrink: 0, borderColor: '#2e2e35', background: '#0e0e10' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} style={{ color: '#8b5cf6' }} />
            <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>People</h1>
            <span
              className="ml-auto text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
            >
              {people.length}
            </span>
          </div>
          <input
            type="text"
            placeholder="Search people…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #2e2e35',
              color: '#e8e8f0',
            }}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
              <Users size={32} style={{ color: '#2e2e35', marginBottom: 12 }} />
              <p className="text-sm" style={{ color: '#5a5a72' }}>
                {people.length === 0
                  ? 'No people found yet — capture notes mentioning colleagues, clients, or friends and they\'ll appear here automatically.'
                  : 'No matches for your search.'}
              </p>
            </div>
          ) : (
            filtered.map(node => (
              <PersonCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedId}
                onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — detail or empty state */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedNode ? (
          <PersonDetail node={selectedNode} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#5a5a72' }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p className="text-sm">Select a person to see details</p>
          </div>
        )}
      </div>
    </div>
  )
}
