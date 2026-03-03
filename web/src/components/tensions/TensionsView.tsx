import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, X, FileText, CheckCircle } from 'lucide-react'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useUIStore } from '../../stores/uiStore'
import type { Tension } from '../../types'

// ─── Tension Card ─────────────────────────────────────────────────────────────

function TensionCard({ tension }: { tension: Tension }) {
  const { dismissTension } = useTensionsStore()
  const openNote = useUIStore(s => s.openNote)

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: tension.isDismissed ? 'rgba(255,255,255,0.02)' : 'rgba(244,63,94,0.05)',
        border: `1px solid ${tension.isDismissed ? '#2e2e35' : 'rgba(244,63,94,0.2)'}`,
        opacity: tension.isDismissed ? 0.5 : 1,
      }}
    >
      {/* Entity name + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold rounded-full px-2.5 py-0.5"
            style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}
          >
            {tension.entityLabel}
          </span>
          <span className="text-xs" style={{ color: '#5a5a72' }}>
            {new Date(tension.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => openNote(tension.noteId)}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 24, height: 24, color: '#5a5a72' }}
            title="Go to source note"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#9090a8'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#5a5a72'}
          >
            <FileText size={13} />
          </button>
          {!tension.isDismissed && (
            <button
              onClick={() => dismissTension(tension.id)}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 24, height: 24, color: '#5a5a72' }}
              title="Dismiss"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#14b8a6'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#5a5a72'}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Conflict description */}
      <p className="text-sm" style={{ color: '#e8e8f0' }}>{tension.conflictDescription}</p>

      {/* Was / Now comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
        >
          <div className="text-xs font-semibold mb-1" style={{ color: '#f43f5e' }}>Was</div>
          <div className="text-xs leading-relaxed" style={{ color: '#c4a0a8' }}>{tension.existingFact}</div>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}
        >
          <div className="text-xs font-semibold mb-1" style={{ color: '#14b8a6' }}>Now</div>
          <div className="text-xs leading-relaxed" style={{ color: '#9adbd5' }}>{tension.newFact}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function TensionsView() {
  const [showDismissed, setShowDismissed] = useState(false)
  const tensions = useTensionsStore(s => s.tensions)

  const pending = tensions.filter(t => !t.isDismissed)
  const dismissed = tensions.filter(t => t.isDismissed)

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto" style={{ background: '#0c0c0d' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2e2e35' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <AlertTriangle size={18} style={{ color: '#f43f5e' }} />
          <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Tensions</h1>
          {pending.length > 0 && (
            <span
              className="text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
            >
              {pending.length} unresolved
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: '#5a5a72' }}>
          Contradictions detected between your notes — facts that conflict with each other.
        </p>
      </div>

      <div className="flex-1 px-6 py-4 space-y-3">
        {/* Unresolved section */}
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
            <p className="text-sm font-medium" style={{ color: '#5a5a72' }}>No contradictions detected</p>
            <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
              When new notes conflict with established facts, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(t => <TensionCard key={t.id} tension={t} />)}
          </div>
        )}

        {/* Dismissed section (collapsible) */}
        {dismissed.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: '#2e2e35' }}>
            <button
              onClick={() => setShowDismissed(v => !v)}
              className="flex items-center gap-1.5 mb-2 text-xs transition-colors"
              style={{ color: '#5a5a72' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#9090a8'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#5a5a72'}
            >
              {showDismissed ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Dismissed ({dismissed.length})
            </button>
            {showDismissed && (
              <div className="space-y-2">
                {dismissed.map(t => <TensionCard key={t.id} tension={t} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
