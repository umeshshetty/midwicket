import { AlertTriangle, X, PenTool } from 'lucide-react'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import type { Tension } from '../../types'

export default function TensionPromptCard({ tension }: { tension: Tension }) {
  const dismissTension = useTensionsStore(s => s.dismissTension)
  const reconcileTension = useTensionsStore(s => s.reconcileTension)
  const addNote = useNotesStore(s => s.addNote)
  const openNote = useUIStore(s => s.openNote)

  function handleReconcile() {
    const plainText =
      `Reconciling: ${tension.entityLabel}\n\n` +
      `Previous understanding: ${tension.existingFact}\n` +
      `New information: ${tension.newFact}\n\n` +
      `${tension.conflictDescription}\n\n` +
      `My synthesis:\n`

    const content = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: `Reconciling: ${tension.entityLabel}` }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Previous understanding: ' }, { type: 'text', text: tension.existingFact }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'New information: ' }, { type: 'text', text: tension.newFact }] },
        { type: 'paragraph', content: [{ type: 'text', text: tension.conflictDescription }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'My synthesis' }] },
        { type: 'paragraph' },
      ],
    })

    const note = addNote({
      content,
      plainText,
      sourceType: 'text',
      tags: ['reconciliation', tension.entityLabel.toLowerCase().replace(/\s+/g, '-')],
    })
    reconcileTension(tension.id, note.id)
    openNote(note.id)
  }

  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'rgba(244,63,94,0.06)',
        border: '1px solid rgba(244,63,94,0.18)',
      }}
    >
      {/* Header: entity + conflict */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={13} style={{ color: '#f43f5e', flexShrink: 0 }} />
          <span
            className="text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
            style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}
          >
            {tension.entityLabel}
          </span>
          <span className="text-xs truncate" style={{ color: '#9090a8' }}>
            {tension.conflictDescription}
          </span>
        </div>
      </div>

      {/* Was / Now compact */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2" style={{ background: 'rgba(244,63,94,0.08)' }}>
          <div className="text-xs font-semibold mb-0.5" style={{ color: '#f43f5e' }}>Was</div>
          <div className="text-xs" style={{ color: '#c4a0a8' }}>{tension.existingFact}</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: 'rgba(20,184,166,0.08)' }}>
          <div className="text-xs font-semibold mb-0.5" style={{ color: '#14b8a6' }}>Now</div>
          <div className="text-xs" style={{ color: '#9adbd5' }}>{tension.newFact}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleReconcile}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}
        >
          <PenTool size={11} /> Reconcile
        </button>
        <button
          onClick={() => dismissTension(tension.id)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9090a8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}
        >
          <X size={11} /> Dismiss
        </button>
      </div>
    </div>
  )
}
