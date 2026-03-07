import { useState } from 'react'
import { BookOpen, RefreshCw, Search, FileText, Loader2, Scale } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import { useWikiStore } from '../../stores/wikiStore'
import { useUIStore } from '../../stores/uiStore'
import BlindspotPanel from '../blindspot/BlindspotPanel'
import EvolutionTimeline from '../shared/EvolutionTimeline'
import { ConfidenceBadge } from '../pulse/shared'
import type { GraphNode, EntityType } from '../../types'

// ─── Simple Markdown Renderer ────────────────────────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:#e8e8f0;font-size:0.875rem;font-weight:700;margin:1rem 0 0.5rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#e8e8f0;font-size:1rem;font-weight:700;margin:1.25rem 0 0.5rem">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e8f0">$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="color:#9090a8;margin-left:1rem;list-style-type:disc;font-size:0.875rem;line-height:1.6">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// ─── Entity Type Tabs ────────────────────────────────────────────────────────

const TYPE_TABS: Array<{ id: EntityType | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'concept', label: 'Concepts' },
  { id: 'project', label: 'Projects' },
  { id: 'person', label: 'People' },
  { id: 'technology', label: 'Tech' },
  { id: 'organization', label: 'Orgs' },
  { id: 'idea', label: 'Ideas' },
]

const ENTITY_COLORS: Record<string, string> = {
  person: '#14b8a6',
  project: '#f59e0b',
  concept: '#8b5cf6',
  technology: '#3b82f6',
  organization: '#f97316',
  idea: '#e879f9',
  place: '#22c55e',
  event: '#f43f5e',
}

// ─── Wiki Entity Card ────────────────────────────────────────────────────────

function WikiCard({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
  const color = ENTITY_COLORS[node.entityType ?? ''] ?? '#8b5cf6'
  const hasWiki = !!node.metadata?.wiki

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? 'rgba(139,92,246,0.3)' : '#2e2e35'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs rounded-full px-2 py-0.5 font-medium"
          style={{ background: `${color}18`, color }}
        >
          {node.entityType}
        </span>
        {hasWiki && (
          <span className="text-xs" style={{ color: '#22c55e' }}>
            <BookOpen size={10} />
          </span>
        )}
      </div>
      <div className="text-sm font-medium truncate" style={{ color: '#e8e8f0' }}>
        {node.label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>
        {node.noteIds.length} notes
        {node.metadata?.lastWikiAt && ` · Updated ${node.metadata.lastWikiAt}`}
      </div>
    </button>
  )
}

// ─── Wiki Detail Panel ───────────────────────────────────────────────────────

function WikiDetail({ node }: { node: GraphNode }) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const notes = useNotesStore(s => s.notes)
  const openNote = useUIStore(s => s.openNote)
  const color = ENTITY_COLORS[node.entityType ?? ''] ?? '#8b5cf6'

  const entityNotes = notes
    .filter(n => node.noteIds.includes(n.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  async function handleRegenerate() {
    setIsRegenerating(true)
    try {
      const graphStore = useGraphStore.getState()
      const { forceGenerateEntityWiki } = await import('../../lib/agents/wikiAgent')
      await forceGenerateEntityWiki(
        node.id,
        node.label,
        node.entityType!,
        notes,
        graphStore
      )
    } catch (err) {
      console.warn('[WikiView] Regeneration failed', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs rounded-full px-2.5 py-0.5 font-semibold"
              style={{ background: `${color}18`, color }}
            >
              {node.entityType}
            </span>
            <span className="text-xs" style={{ color: '#5a5a72' }}>
              {node.noteIds.length} notes
            </span>
            {node.metadata?.confidence && (
              <ConfidenceBadge level={node.metadata.confidence.level} score={node.metadata.confidence.score} />
            )}
          </div>
          <h2 className="text-lg font-bold" style={{ color: '#e8e8f0' }}>
            {node.label}
          </h2>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            background: 'rgba(139,92,246,0.1)',
            color: '#8b5cf6',
            opacity: isRegenerating ? 0.5 : 1,
          }}
        >
          {isRegenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {isRegenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* Wiki Content */}
      {node.metadata?.wiki ? (
        <div
          className="prose prose-invert max-w-none mb-8"
          style={{ color: '#9090a8', fontSize: '0.875rem', lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(node.metadata.wiki) }}
        />
      ) : (
        <div
          className="rounded-xl p-6 text-center mb-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
        >
          <BookOpen size={28} style={{ color: '#2e2e35', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: '#5a5a72' }}>
            {node.noteIds.length < 2
              ? 'Needs 2+ notes to generate a wiki synthesis.'
              : 'Wiki not generated yet. Click "Regenerate" to create one.'}
          </p>
        </div>
      )}

      {/* Version info */}
      {node.metadata?.lastWikiAt && (
        <div className="text-xs mb-6" style={{ color: '#3d3d47' }}>
          v{node.metadata.wikiVersion ?? 1} · Last updated {node.metadata.lastWikiAt}
        </div>
      )}

      {/* Counter-Thesis (Devil's Advocate) */}
      {node.metadata?.counterThesis && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Scale size={14} style={{ color: '#f43f5e' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f43f5e' }}>
              Devil's Advocate
            </span>
            <span className="text-xs ml-auto" style={{ color: '#3d3d47' }}>
              wiki v{node.metadata.counterThesis.wikiVersionAtAssessment}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#c4a0a8' }}>
            {node.metadata.counterThesis.thesis}
          </p>
        </div>
      )}

      {/* Evolution Timeline */}
      <EvolutionTimeline entityNode={node} />

      {/* Blindspot Analysis */}
      <BlindspotPanel
        noteIds={node.noteIds}
        entityLabel={node.label}
        entityContext={node.metadata?.wiki ?? node.metadata?.summary}
      />

      {/* Related Notes */}
      {entityNotes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#5a5a72' }}>
            Source Notes ({entityNotes.length})
          </h3>
          <div className="space-y-1.5">
            {entityNotes.map(n => (
              <button
                key={n.id}
                onClick={() => openNote(n.id)}
                className="w-full text-left rounded-lg p-2.5 transition-all flex items-start gap-2.5"
                style={{ background: 'rgba(255,255,255,0.02)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              >
                <FileText size={13} style={{ color: '#5a5a72', flexShrink: 0, marginTop: 2 }} />
                <div className="min-w-0">
                  <div className="text-sm truncate" style={{ color: '#e8e8f0' }}>{n.title}</div>
                  <div className="text-xs" style={{ color: '#3d3d47' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function WikiView() {
  const graphNodes = useGraphStore(s => s.nodes)
  const { selectedEntityId, searchQuery, entityTypeFilter, setSelectedEntity, setSearchQuery, setEntityTypeFilter } = useWikiStore()

  // Filter to entities only
  const entityNodes = graphNodes
    .filter(n => n.type === 'entity')
    .filter(n => entityTypeFilter === 'all' || n.entityType === entityTypeFilter)
    .filter(n => !searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Entities with wiki first, then by note count
      const aHas = a.metadata?.wiki ? 1 : 0
      const bHas = b.metadata?.wiki ? 1 : 0
      if (bHas !== aHas) return bHas - aHas
      return b.noteIds.length - a.noteIds.length
    })

  const selectedNode = selectedEntityId
    ? graphNodes.find(n => n.id === selectedEntityId) ?? null
    : null

  const wikiCount = graphNodes.filter(n => n.type === 'entity' && n.metadata?.wiki).length

  return (
    <div className="flex h-full min-h-0" style={{ background: '#0c0c0d' }}>
      {/* Left panel — entity list */}
      <div
        className="flex flex-col h-full border-r"
        style={{ width: 320, flexShrink: 0, borderColor: '#2e2e35' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: '#8b5cf6' }} />
            <h2 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Wiki</h2>
            {wikiCount > 0 && (
              <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                {wikiCount}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} style={{ color: '#5a5a72', position: 'absolute', left: 10, top: 9 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entities…"
              className="w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none"
              style={{ background: '#1a1a1d', color: '#e8e8f0', border: '1px solid #2e2e35' }}
            />
          </div>
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setEntityTypeFilter(tab.id)}
                className="text-xs rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: entityTypeFilter === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: entityTypeFilter === tab.id ? '#8b5cf6' : '#5a5a72',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entity list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {entityNodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs" style={{ color: '#5a5a72' }}>No entities found</p>
            </div>
          ) : (
            entityNodes.map(node => (
              <WikiCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedEntityId}
                onClick={() => setSelectedEntity(node.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — wiki detail */}
      {selectedNode ? (
        <WikiDetail node={selectedNode} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <BookOpen size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
          <p className="text-sm" style={{ color: '#5a5a72' }}>Select an entity to view its wiki</p>
          <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
            Wikis auto-generate when entities have 2+ notes
          </p>
        </div>
      )}
    </div>
  )
}
