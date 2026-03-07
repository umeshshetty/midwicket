import { useState, useMemo } from 'react'
import { Briefcase, ArrowLeft, FileText, Users, HelpCircle, AlertOctagon, Sparkles } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import BlindspotPanel from '../blindspot/BlindspotPanel'
import EvolutionTimeline from '../shared/EvolutionTimeline'
import type { GraphNode } from '../../types'

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:    { dot: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  text: '#14b8a6',  label: 'Active' },
  planning:  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#f59e0b',  label: 'Planning' },
  completed: { dot: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9090a8', label: 'Completed' },
  'on-hold': { dot: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  text: '#f43f5e',  label: 'On Hold' },
}

function statusConfig(status?: string) {
  return status ? (STATUS_CONFIG[status] ?? null) : null
}

// ─── Work Card ────────────────────────────────────────────────────────────────

function WorkCard({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
  const m = node.metadata
  const sc = statusConfig(m?.status)
  const isOrg = node.entityType === 'organization'

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all duration-150"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? '#8b5cf680' : '#2e2e35'}`,
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
    >
      {/* Name + status dot */}
      <div className="flex items-start gap-2 mb-1">
        {sc && (
          <span
            className="mt-1.5 flex-shrink-0 rounded-full"
            style={{ width: 7, height: 7, background: sc.dot, boxShadow: `0 0 5px ${sc.dot}80` }}
          />
        )}
        <span className="font-semibold text-sm flex-1 leading-snug" style={{ color: '#e8e8f0' }}>
          {node.label}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: '#5a5a72' }}>
          {node.noteIds.length} note{node.noteIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Type badge for orgs */}
      {isOrg && m?.industry && (
        <div className="text-xs mb-1" style={{ color: '#f97316' }}>{m.industry}</div>
      )}

      {/* Description */}
      {m?.description && (
        <div className="text-xs mb-2 line-clamp-2" style={{ color: '#9090a8' }}>{m.description}</div>
      )}

      {/* Stakeholder chips */}
      {m?.stakeholders && m.stakeholders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.stakeholders.slice(0, 3).map(s => (
            <span
              key={s}
              className="text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}
            >
              {s}
            </span>
          ))}
          {m.stakeholders.length > 3 && (
            <span className="text-xs" style={{ color: '#5a5a72' }}>+{m.stakeholders.length - 3}</span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function WorkDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const m = node.metadata
  const notes = useNotesStore(s => s.notes)
  const openNote = useUIStore(s => s.openNote)
  const allNodes = useGraphStore(s => s.nodes)

  const workNotes = useMemo(
    () => notes.filter(n => node.noteIds.includes(n.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes, node.noteIds]
  )

  const sc = statusConfig(m?.status)

  // Resolve stakeholder names to person entity nodes
  const stakeholderNodes = useMemo(() => {
    if (!m?.stakeholders) return []
    return m.stakeholders
      .map(name => allNodes.find(n => n.type === 'entity' && n.entityType === 'person' && n.label.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as GraphNode[]
  }, [m?.stakeholders, allNodes])

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
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate" style={{ color: '#e8e8f0' }}>{node.label}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs capitalize" style={{ color: '#5a5a72' }}>{node.entityType}</span>
            {sc && (
              <span
                className="text-xs rounded-full px-2 py-0.5"
                style={{ background: sc.bg, color: sc.text }}
              >
                {sc.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: '#2e2e35' }}>
        {m?.description && (
          <p className="text-sm" style={{ color: '#9090a8' }}>{m.description}</p>
        )}
        {m?.industry && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#5a5a72' }}>Industry</span>
            <span className="text-xs rounded-full px-2.5 py-0.5" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
              {m.industry}
            </span>
          </div>
        )}
        {stakeholderNodes.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={13} style={{ color: '#5a5a72' }} />
              <span className="text-xs" style={{ color: '#5a5a72' }}>Stakeholders</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stakeholderNodes.map(sn => (
                <span
                  key={sn.id}
                  className="text-xs rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6', cursor: 'default' }}
                  title={[sn.metadata?.role, sn.metadata?.organization].filter(Boolean).join(' · ')}
                >
                  {sn.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Project Brief (AI-maintained living context) */}
      {m?.summary && (
        <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={13} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
              Living Brief
            </span>
          </div>
          <p
            className="text-sm rounded-lg px-3 py-2 leading-relaxed"
            style={{ background: 'rgba(245,158,11,0.08)', color: '#d4a84b', borderLeft: '2px solid #f59e0b40' }}
          >
            {m.summary}
          </p>
          {m.openQuestions && m.openQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <HelpCircle size={12} style={{ color: '#9090a8' }} />
                <span className="text-xs" style={{ color: '#9090a8' }}>Open questions</span>
              </div>
              <ul className="space-y-1">
                {m.openQuestions.map((q, i) => (
                  <li key={i} className="text-xs" style={{ color: '#9090a8' }}>• {q}</li>
                ))}
              </ul>
            </div>
          )}
          {m.blockers && m.blockers.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <AlertOctagon size={12} style={{ color: '#f43f5e' }} />
                <span className="text-xs" style={{ color: '#f43f5e' }}>Blockers</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.blockers.map((b, i) => (
                  <span
                    key={i}
                    className="text-xs rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#5a5a72' }}>
          Related Notes
        </h3>
        {workNotes.length === 0 ? (
          <p className="text-sm" style={{ color: '#5a5a72' }}>No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workNotes.map(note => (
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
          entityContext={m?.summary ?? m?.description}
        />
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'planning' | 'completed' | 'on-hold'

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'planning', label: 'Planning' },
  { id: 'completed', label: 'Completed' },
]

export default function WorkView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')

  const nodes = useGraphStore(s => s.nodes)

  const workItems = useMemo(
    () =>
      nodes
        .filter(n => n.type === 'entity' && (n.entityType === 'project' || n.entityType === 'organization'))
        .sort((a, b) => {
          // Sort active first, then by note count
          const statusOrder: Record<string, number> = { active: 0, planning: 1, 'on-hold': 2, completed: 3 }
          const aO = statusOrder[a.metadata?.status ?? ''] ?? 4
          const bO = statusOrder[b.metadata?.status ?? ''] ?? 4
          if (aO !== bO) return aO - bO
          return b.noteIds.length - a.noteIds.length
        }),
    [nodes]
  )

  const filtered = useMemo(() => {
    let result = workItems
    if (statusFilter !== 'all') {
      result = result.filter(n => n.metadata?.status === statusFilter)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        n =>
          n.label.toLowerCase().includes(q) ||
          n.metadata?.description?.toLowerCase().includes(q) ||
          n.metadata?.industry?.toLowerCase().includes(q)
      )
    }
    return result
  }, [workItems, statusFilter, query])

  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) ?? null : null

  return (
    <div className="flex h-full min-h-0" style={{ background: '#0c0c0d' }}>
      {/* Left panel */}
      <div
        className="flex flex-col border-r"
        style={{ width: 320, flexShrink: 0, borderColor: '#2e2e35', background: '#0e0e10' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} style={{ color: '#f59e0b' }} />
            <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Work</h1>
            <span
              className="ml-auto text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              {workItems.length}
            </span>
          </div>
          <input
            type="text"
            placeholder="Search projects & orgs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-3"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #2e2e35',
              color: '#e8e8f0',
            }}
          />
          {/* Status filter tabs */}
          <div className="flex gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className="text-xs rounded-lg px-2.5 py-1 transition-colors"
                style={{
                  background: statusFilter === tab.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: statusFilter === tab.id ? '#f59e0b' : '#5a5a72',
                  border: `1px solid ${statusFilter === tab.id ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
              <Briefcase size={32} style={{ color: '#2e2e35', marginBottom: 12 }} />
              <p className="text-sm" style={{ color: '#5a5a72' }}>
                {workItems.length === 0
                  ? 'No projects or organizations yet — capture notes about your work and they\'ll appear here automatically.'
                  : 'No matches for your filters.'}
              </p>
            </div>
          ) : (
            filtered.map(node => (
              <WorkCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedId}
                onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedNode ? (
          <WorkDetail node={selectedNode} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#5a5a72' }}>
            <Briefcase size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p className="text-sm">Select a project or organization to see details</p>
          </div>
        )}
      </div>
    </div>
  )
}
