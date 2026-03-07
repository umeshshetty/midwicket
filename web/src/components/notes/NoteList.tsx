import { useMemo } from 'react'
import { Pin, Inbox as InboxIcon, AlertTriangle } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import NoteCard from './NoteCard'
import TensionPromptCard from '../tensions/TensionPromptCard'
import PulseInboxCard from '../pulse/PulseInboxCard'

export default function NoteList() {
  const notes = useNotesStore(s => s.notes)
  const activeNoteId = useUIStore(s => s.activeNoteId)
  const tensions = useTensionsStore(s => s.tensions)
  const topTensions = useMemo(
    () => tensions
      .filter(t => !t.isDismissed && !t.isReconciled)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2),
    [tensions]
  )

  const pinned = notes.filter(n => n.isPinned)
  const recent = notes.filter(n => !n.isPinned)

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8">
        <div
          className="rounded-full p-4"
          style={{ background: 'rgba(139,92,246,0.1)' }}
        >
          <InboxIcon size={28} style={{ color: '#8b5cf6' }} />
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-1" style={{ color: '#e8e8f0' }}>
            Your inbox is empty
          </h3>
          <p className="text-sm" style={{ color: '#9090a8' }}>
            Capture a thought above — no friction, no folders
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      {/* Pulse summary */}
      <PulseInboxCard />

      {/* Tension prompts */}
      {topTensions.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-2 mt-2">
            <AlertTriangle size={12} style={{ color: '#f43f5e' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f43f5e' }}>
              Needs Your Attention
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {topTensions.map(t => <TensionPromptCard key={t.id} tension={t} />)}
          </div>
        </section>
      )}

      {pinned.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-2 mt-2">
            <Pin size={12} style={{ color: '#8b5cf6' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
              Pinned
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {pinned.map(note => (
              <NoteCard key={note.id} note={note} isSelected={note.id === activeNoteId} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <div className="flex items-center gap-2 mb-2 mt-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
                Recent
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {recent.map(note => (
              <NoteCard key={note.id} note={note} isSelected={note.id === activeNoteId} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
