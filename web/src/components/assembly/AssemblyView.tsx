import { useState } from 'react'
import { FileStack, Search, Loader2, Sparkles, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useAssemblyStore } from '../../stores/assemblyStore'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import { generateAssemblyOutline } from '../../lib/agents/assemblyAgent'
import type { GraphNode, EntityType, AssemblyOutline } from '../../types'

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

// ─── Entity Card ─────────────────────────────────────────────────────────────

function EntityCard({
  node,
  isSelected,
  onToggle,
}: {
  node: GraphNode
  isSelected: boolean
  onToggle: () => void
}) {
  const color = ENTITY_COLORS[node.entityType ?? ''] ?? '#8b5cf6'

  return (
    <button
      onClick={onToggle}
      className="w-full text-left rounded-xl p-3 transition-all"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? 'rgba(139,92,246,0.3)' : '#2e2e35'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
          style={{
            borderColor: isSelected ? '#8b5cf6' : '#5a5a72',
            background: isSelected ? '#8b5cf6' : 'transparent',
          }}
        >
          {isSelected && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span
          className="text-xs rounded-full px-2 py-0.5 font-medium"
          style={{ background: `${color}18`, color }}
        >
          {node.entityType}
        </span>
      </div>
      <div className="text-sm font-medium truncate" style={{ color: '#e8e8f0' }}>
        {node.label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>
        {node.noteIds.length} notes
      </div>
    </button>
  )
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function OutlineSection({
  heading,
  bullets,
  sourceCount,
}: {
  heading: string
  bullets: string[]
  sourceCount: number
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {isOpen ? (
          <ChevronDown size={14} style={{ color: '#5a5a72', flexShrink: 0 }} />
        ) : (
          <ChevronRight size={14} style={{ color: '#5a5a72', flexShrink: 0 }} />
        )}
        <span className="text-sm font-semibold flex-1" style={{ color: '#e8e8f0' }}>
          {heading}
        </span>
        {sourceCount > 0 && (
          <span className="text-xs" style={{ color: '#3d3d47' }}>
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          <ul className="space-y-1.5">
            {bullets.map((bullet, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed pl-4 relative"
                style={{ color: '#9090a8' }}
              >
                <span
                  className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#5a5a72' }}
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Right Panel Content ─────────────────────────────────────────────────────

function RightPanel() {
  const selectedEntities = useAssemblyStore(s => s.selectedEntities)
  const isGenerating = useAssemblyStore(s => s.isGenerating)
  const currentOutlineId = useAssemblyStore(s => s.currentOutlineId)
  const outlines = useAssemblyStore(s => s.outlines)
  const notes = useNotesStore(s => s.notes)
  const graphNodes = useGraphStore(s => s.nodes)
  const graphEdges = useGraphStore(s => s.edges)

  const currentOutline: AssemblyOutline | null = currentOutlineId
    ? outlines.find(o => o.id === currentOutlineId) ?? null
    : null

  async function handleGenerate() {
    const store = useAssemblyStore.getState()
    store.setGenerating(true)
    try {
      const result = await generateAssemblyOutline(
        store.selectedEntities,
        notes,
        graphNodes,
        graphEdges,
      )
      if (result) {
        const outline: AssemblyOutline = {
          id: uuidv4(),
          title: result.title,
          selectedEntities: [...store.selectedEntities],
          sections: result.sections,
          createdAt: new Date().toISOString(),
        }
        store.addOutline(outline)
      }
    } catch (err) {
      console.warn('[AssemblyView] Generation failed', err)
    } finally {
      store.setGenerating(false)
    }
  }

  function handleClear() {
    const store = useAssemblyStore.getState()
    store.clearSelection()
  }

  // Empty state: nothing selected
  if (selectedEntities.length === 0 && !currentOutline) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <FileStack size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
        <p className="text-sm" style={{ color: '#5a5a72' }}>Select entities to assemble an outline</p>
        <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
          Pick related concepts, projects, or people from the left panel
        </p>
      </div>
    )
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: '#8b5cf6', marginBottom: 12 }} />
        <p className="text-sm" style={{ color: '#9090a8' }}>Generating outline...</p>
        <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
          Synthesizing {selectedEntities.length} entities
        </p>
      </div>
    )
  }

  // Outline exists
  if (currentOutline) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#e8e8f0' }}>
              {currentOutline.title}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentOutline.selectedEntities.map(e => {
                const color = ENTITY_COLORS[e.entityType] ?? '#8b5cf6'
                return (
                  <span
                    key={e.entityId}
                    className="text-xs rounded-full px-2 py-0.5 font-medium"
                    style={{ background: `${color}18`, color }}
                  >
                    {e.entityLabel}
                  </span>
                )
              })}
            </div>
            <div className="text-xs mt-2" style={{ color: '#3d3d47' }}>
              {new Date(currentOutline.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
          >
            <Trash2 size={12} />
            Clear & Start Over
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {currentOutline.sections.map((section, i) => (
            <OutlineSection
              key={i}
              heading={section.heading}
              bullets={section.bullets}
              sourceCount={section.sourceNoteIds.length}
            />
          ))}
        </div>
      </div>
    )
  }

  // Entities selected but no outline yet
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#5a5a72' }}>
        Selected Entities ({selectedEntities.length})
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {selectedEntities.map(e => {
          const color = ENTITY_COLORS[e.entityType] ?? '#8b5cf6'
          return (
            <span
              key={e.entityId}
              className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 font-medium"
              style={{ background: `${color}18`, color }}
            >
              {e.entityLabel}
              <button
                onClick={() => useAssemblyStore.getState().removeEntity(e.entityId)}
                className="ml-0.5 hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          )
        })}
      </div>
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
        style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}
      >
        <Sparkles size={14} />
        Generate Outline
      </button>
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function AssemblyView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')

  const graphNodes = useGraphStore(s => s.nodes)
  const selectedEntities = useAssemblyStore(s => s.selectedEntities)
  const addEntity = useAssemblyStore(s => s.addEntity)
  const removeEntity = useAssemblyStore(s => s.removeEntity)

  const selectedIds = new Set(selectedEntities.map(e => e.entityId))

  // Filter to entity nodes
  const entityNodes = graphNodes
    .filter(n => n.type === 'entity')
    .filter(n => typeFilter === 'all' || n.entityType === typeFilter)
    .filter(n => !searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Selected first, then by note count
      const aSelected = selectedIds.has(a.id) ? 1 : 0
      const bSelected = selectedIds.has(b.id) ? 1 : 0
      if (bSelected !== aSelected) return bSelected - aSelected
      return b.noteIds.length - a.noteIds.length
    })

  function handleToggle(node: GraphNode) {
    if (selectedIds.has(node.id)) {
      removeEntity(node.id)
    } else {
      addEntity({
        entityId: node.id,
        entityLabel: node.label,
        entityType: node.entityType!,
      })
    }
  }

  return (
    <div className="flex h-full min-h-0" style={{ background: '#0c0c0d' }}>
      {/* Left panel — entity picker */}
      <div
        className="flex flex-col h-full border-r"
        style={{ width: 320, flexShrink: 0, borderColor: '#2e2e35' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <FileStack size={16} style={{ color: '#8b5cf6' }} />
            <h2 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Compose</h2>
            {selectedEntities.length > 0 && (
              <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                {selectedEntities.length}
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
              placeholder="Search entities..."
              className="w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none"
              style={{ background: '#1a1a1d', color: '#e8e8f0', border: '1px solid #2e2e35' }}
            />
          </div>
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className="text-xs rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: typeFilter === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: typeFilter === tab.id ? '#8b5cf6' : '#5a5a72',
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
              <EntityCard
                key={node.id}
                node={node}
                isSelected={selectedIds.has(node.id)}
                onToggle={() => handleToggle(node)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <RightPanel />
    </div>
  )
}
