import { useState } from 'react'
import { EyeOff, Loader2, RefreshCw } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useBlindspotStore } from '../../stores/blindspotStore'
import type { Blindspot } from '../../types'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Missing Perspective':  { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  'Assumption Gap':       { bg: 'rgba(244,63,94,0.12)',  text: '#f43f5e' },
  'Unconsidered Risk':    { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  'Information Gap':      { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
  'Confirmation Bias':    { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
  'Temporal Blindspot':   { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'Stakeholder Gap':      { bg: 'rgba(232,121,249,0.12)', text: '#e879f9' },
  'Alternative Approach': { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
}

function BlindspotCard({ blindspot }: { blindspot: Blindspot }) {
  const colors = CATEGORY_COLORS[blindspot.category] ?? { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' }

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
    >
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 inline-block"
        style={{ background: colors.bg, color: colors.text }}
      >
        {blindspot.category}
      </span>
      <p className="text-sm" style={{ color: '#e8e8f0' }}>{blindspot.gap}</p>
      <p className="text-xs" style={{ color: '#8b5cf6' }}>
        → {blindspot.suggestion}
      </p>
      {blindspot.relevantEntities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {blindspot.relevantEntities.map(e => (
            <span key={e} className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(20,184,166,0.08)', color: '#14b8a6' }}>
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  noteIds: string[]
  entityLabel?: string
  entityContext?: string
}

export default function BlindspotPanel({ noteIds, entityLabel, entityContext }: Props) {
  const [localAnalyzing, setLocalAnalyzing] = useState(false)
  const allNotes = useNotesStore(s => s.notes)
  const { addAnalysis, getLatestForEntity } = useBlindspotStore()

  const existing = entityLabel ? getLatestForEntity(entityLabel) : null

  async function handleAnalyze() {
    setLocalAnalyzing(true)
    try {
      const notes = allNotes.filter(n => noteIds.includes(n.id))
      if (notes.length === 0) return

      const { analyzeBlindspots } = await import('../../lib/agents/blindspotAgent')
      const blindspots = await analyzeBlindspots(notes, entityLabel, entityContext)

      addAnalysis({
        entityLabel,
        noteIds,
        blindspots,
      })
    } catch (err) {
      console.warn('[BlindspotPanel] Analysis failed', err)
    } finally {
      setLocalAnalyzing(false)
    }
  }

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: '#2e2e35' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <EyeOff size={14} style={{ color: '#f59e0b' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
            Blindspot Analysis
          </h3>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={localAnalyzing || noteIds.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            opacity: localAnalyzing ? 0.5 : 1,
          }}
        >
          {localAnalyzing ? <Loader2 size={11} className="animate-spin" /> : (existing ? <RefreshCw size={11} /> : <EyeOff size={11} />)}
          {localAnalyzing ? 'Analyzing…' : (existing ? 'Re-analyze' : 'Analyze Blindspots')}
        </button>
      </div>

      {existing && existing.blindspots.length > 0 ? (
        <div className="space-y-2">
          {existing.blindspots.map(b => <BlindspotCard key={b.id} blindspot={b} />)}
          <div className="text-xs pt-1" style={{ color: '#3d3d47' }}>
            Analyzed {new Date(existing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      ) : !localAnalyzing ? (
        <p className="text-xs" style={{ color: '#3d3d47' }}>
          Click "Analyze Blindspots" to discover what you might be missing.
        </p>
      ) : null}
    </div>
  )
}
