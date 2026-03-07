import { useState } from 'react'
import { Clock, Loader2, FileText, TrendingUp } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useGraphStore } from '../../stores/graphStore'
import { useUIStore } from '../../stores/uiStore'
import type { GraphNode } from '../../types'

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

interface Props {
  entityNode: GraphNode
}

export default function EvolutionTimeline({ entityNode }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const allNotes = useNotesStore(s => s.notes)
  const openNote = useUIStore(s => s.openNote)
  const color = ENTITY_COLORS[entityNode.entityType ?? ''] ?? '#8b5cf6'

  // Get notes for this entity, sorted chronologically (oldest first)
  const entityNotes = allNotes
    .filter(n => entityNode.noteIds.includes(n.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (entityNotes.length < 2) return null

  async function handleEvolutionAnalysis() {
    setIsAnalyzing(true)
    try {
      const graphStore = useGraphStore.getState()
      const { analyzeEvolution } = await import('../../lib/agents/wikiAgent')
      await analyzeEvolution(
        entityNode.id,
        entityNode.label,
        entityNode.entityType!,
        allNotes,
        graphStore
      )
    } catch (err) {
      console.warn('[EvolutionTimeline] Analysis failed', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Re-read from store for fresh data after analysis
  const currentNode = useGraphStore(s => s.getNodeById(entityNode.id)) ?? entityNode
  const evolutionSummary = currentNode.metadata?.evolutionSummary

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: '#2e2e35' }}>
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <Clock size={14} style={{ color }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
          Evolution ({entityNotes.length} notes)
        </h3>
      </button>

      {isExpanded && (
        <>
          {/* Evolution summary */}
          {evolutionSummary ? (
            <div
              className="rounded-lg p-3 mb-4"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={12} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Evolution Summary</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#c4b899' }}>
                {evolutionSummary}
              </p>
              <button
                onClick={handleEvolutionAnalysis}
                disabled={isAnalyzing}
                className="text-xs mt-2 transition-colors"
                style={{ color: '#5a5a72' }}
              >
                {isAnalyzing ? 'Updating…' : 'Refresh'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleEvolutionAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium mb-4 transition-all"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}
            >
              {isAnalyzing ? <Loader2 size={11} className="animate-spin" /> : <TrendingUp size={11} />}
              {isAnalyzing ? 'Analyzing evolution…' : 'Generate Evolution Summary'}
            </button>
          )}

          {/* Timeline */}
          <div className="relative pl-5">
            {/* Vertical rail */}
            <div
              className="absolute left-1.5 top-0 bottom-0 w-px"
              style={{ background: `${color}40` }}
            />

            {entityNotes.map((note, i) => (
              <div key={note.id} className="relative mb-4 last:mb-0">
                {/* Timeline dot */}
                <div
                  className="absolute -left-5 top-1 rounded-full"
                  style={{
                    width: 8, height: 8,
                    background: color,
                    border: `2px solid #131315`,
                  }}
                />

                {/* Note card */}
                <button
                  onClick={() => openNote(note.id)}
                  className="w-full text-left rounded-lg p-2.5 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs" style={{ color }}>
                      {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {i === 0 && (
                      <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: `${color}18`, color }}>
                        First
                      </span>
                    )}
                    {i === entityNotes.length - 1 && i > 0 && (
                      <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: `${color}18`, color }}>
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText size={11} style={{ color: '#5a5a72', flexShrink: 0, marginTop: 3 }} />
                    <div className="min-w-0">
                      <div className="text-sm truncate" style={{ color: '#e8e8f0' }}>{note.title}</div>
                      <div className="text-xs line-clamp-2 mt-0.5" style={{ color: '#5a5a72' }}>
                        {note.plainText.slice(0, 120)}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
