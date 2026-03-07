import { useState } from 'react'
import { Zap, Loader2, Bookmark, Trash2, Sparkles } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import { useCollisionStore } from '../../stores/collisionStore'
import type { Collision } from '../../types'

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

function CollisionCard({ collision, onBookmark, onDelete }: {
  collision: Collision
  onBookmark: () => void
  onDelete: () => void
}) {
  const colorA = ENTITY_COLORS[collision.nodeA.entityType ?? ''] ?? '#8b5cf6'
  const colorB = ENTITY_COLORS[collision.nodeB.entityType ?? ''] ?? '#8b5cf6'

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
    >
      {/* Entity pair */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold rounded-full px-2.5 py-0.5" style={{ background: `${colorA}18`, color: colorA }}>
          {collision.nodeA.label}
        </span>
        <Zap size={14} style={{ color: '#f59e0b' }} />
        <span className="text-xs font-semibold rounded-full px-2.5 py-0.5" style={{ background: `${colorB}18`, color: colorB }}>
          {collision.nodeB.label}
        </span>
        <div className="flex-1" />
        <span className="text-xs" style={{ color: '#5a5a72' }}>
          {new Date(collision.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Connection */}
      <p className="text-sm leading-relaxed" style={{ color: '#e8e8f0' }}>
        {collision.connection}
      </p>

      {/* Provocative question */}
      <p className="text-sm italic" style={{ color: '#8b5cf6' }}>
        "{collision.provocativeQuestion}"
      </p>

      {/* Strength + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 6, height: 6,
                background: i < collision.strength ? '#f59e0b' : '#2e2e35',
              }}
            />
          ))}
          <span className="text-xs ml-1" style={{ color: '#5a5a72' }}>{collision.strength}/10</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onBookmark}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: collision.isBookmarked ? '#f59e0b' : '#5a5a72' }}
            title={collision.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark size={13} fill={collision.isBookmarked ? '#f59e0b' : 'none'} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f43f5e')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CollisionsView() {
  const [showBookmarked, setShowBookmarked] = useState(false)
  const graphNodes = useGraphStore(s => s.nodes)
  const graphEdges = useGraphStore(s => s.edges)
  const notes = useNotesStore(s => s.notes)
  const { collisions, isGenerating, addCollision, toggleBookmark, deleteCollision, setGenerating } = useCollisionStore()

  const entityCount = graphNodes.filter(n => n.type === 'entity' && n.noteIds.length >= 2).length
  const canGenerate = entityCount >= 4

  const displayed = showBookmarked ? collisions.filter(c => c.isBookmarked) : collisions

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { pickCollisionPair } = await import('../../lib/graphUtils')
      const pair = pickCollisionPair(graphNodes, graphEdges)
      if (!pair) {
        console.warn('[Collisions] No disconnected pair found')
        return
      }

      const [nodeA, nodeB] = pair
      const notesA = notes.filter(n => nodeA.noteIds.includes(n.id))
      const notesB = notes.filter(n => nodeB.noteIds.includes(n.id))

      const { generateCollision } = await import('../../lib/agents/collisionAgent')
      const result = await generateCollision(nodeA, nodeB, notesA, notesB)

      addCollision({
        nodeA: { id: nodeA.id, label: nodeA.label, entityType: nodeA.entityType },
        nodeB: { id: nodeB.id, label: nodeB.label, entityType: nodeB.entityType },
        connection: result.connection,
        provocativeQuestion: result.provocative_question,
        strength: Math.max(1, Math.min(10, result.strength)),
      })
    } catch (err) {
      console.warn('[Collisions] Generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: '#0c0c0d' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2e2e35' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Zap size={18} style={{ color: '#f59e0b' }} />
          <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Collision Engine</h1>
        </div>
        <p className="text-xs mb-4" style={{ color: '#5a5a72' }}>
          Forced serendipity — find creative connections between disconnected ideas.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: canGenerate ? 'linear-gradient(135deg, #f59e0b, #f97316)' : '#2e2e35',
              color: canGenerate ? 'white' : '#5a5a72',
              cursor: canGenerate && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isGenerating ? 'Generating…' : 'Generate Collision'}
          </button>

          {collisions.length > 0 && (
            <button
              onClick={() => setShowBookmarked(v => !v)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
              style={{
                background: showBookmarked ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: showBookmarked ? '#f59e0b' : '#5a5a72',
              }}
            >
              <Bookmark size={12} /> {showBookmarked ? 'Bookmarked' : 'All'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {!canGenerate ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Zap size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
            <p className="text-sm font-medium" style={{ color: '#5a5a72' }}>
              Need at least 4 entities with 2+ notes each
            </p>
            <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
              Keep adding notes — the collision engine finds connections between distant ideas.
            </p>
            <p className="text-xs mt-2" style={{ color: '#3d3d47' }}>
              Currently: {entityCount} eligible entities
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
            <p className="text-sm font-medium" style={{ color: '#5a5a72' }}>
              {showBookmarked ? 'No bookmarked collisions' : 'No collisions yet'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
              Click "Generate Collision" to discover unexpected connections.
            </p>
          </div>
        ) : (
          displayed.map(c => (
            <CollisionCard
              key={c.id}
              collision={c}
              onBookmark={() => toggleBookmark(c.id)}
              onDelete={() => deleteCollision(c.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
