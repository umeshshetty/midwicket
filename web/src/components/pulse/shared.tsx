import { useState } from 'react'
import { Send, X, Check } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import type { EntityType, ConfidenceLevel } from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

export const ENTITY_COLORS: Record<string, string> = {
  person: '#14b8a6', project: '#f59e0b', concept: '#8b5cf6',
  technology: '#3b82f6', organization: '#f97316', idea: '#e879f9',
  place: '#22c55e', event: '#f43f5e',
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#f43f5e', medium: '#f59e0b', low: '#5a5a72',
}

// ─── Entity Chip ─────────────────────────────────────────────────────────────

export function EntityChip({ label, entityType }: { label: string; entityType?: EntityType }) {
  const color = ENTITY_COLORS[entityType ?? ''] ?? '#9090a8'
  return (
    <span
      className="text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
}

// ─── Confidence Badge ───────────────────────────────────────────────────────

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string; bg: string }> = {
  fact: { label: 'Fact', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  strong_belief: { label: 'Belief', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  assumption: { label: 'Assumption', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
}

export function ConfidenceBadge({ level, score }: { level: ConfidenceLevel; score?: number }) {
  const config = CONFIDENCE_CONFIG[level]
  return (
    <span
      className="text-xs rounded-full px-2 py-0.5 font-medium"
      style={{ background: config.bg, color: config.color }}
      title={score != null ? `Confidence: ${score}/100` : undefined}
    >
      {config.label}
    </span>
  )
}

// ─── Profile Question Card ──────────────────────────────────────────────────

export function ProfileQuestionCard({
  item,
  onDismiss,
}: {
  item: {
    id: string; nodeId: string; entityLabel: string; entityType?: EntityType
    question: string; reason: string; priority: string
  }
  onDismiss: (entityId: string, questionId: string) => void
}) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState('')
  const addNote = useNotesStore(s => s.addNote)

  function handleSubmit() {
    if (!answer.trim()) return
    const noteContent = `About ${item.entityLabel}: ${answer.trim()}`
    const note = addNote({
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: noteContent }] }],
      }),
      plainText: noteContent,
      title: `About ${item.entityLabel}`,
      sourceType: 'text',
    })
    useGraphStore.getState().answerProfileQuestion(item.nodeId, item.id, note.id)
    setIsAnswering(false)
    setAnswer('')
  }

  const priorityColor = PRIORITY_COLORS[item.priority] ?? '#5a5a72'

  return (
    <div
      className="rounded-lg p-3 transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <EntityChip label={item.entityLabel} entityType={item.entityType} />
            <span
              className="text-xs rounded-full px-1.5 py-0.5"
              style={{ background: `${priorityColor}15`, color: priorityColor }}
            >
              {item.priority}
            </span>
          </div>
          <p className="text-sm" style={{ color: '#e8e8f0' }}>{item.question}</p>
          <p className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>{item.reason}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isAnswering && (
            <button
              onClick={() => setIsAnswering(true)}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              title="Answer"
            >
              <Send size={13} style={{ color: '#14b8a6' }} />
            </button>
          )}
          <button
            onClick={() => onDismiss(item.nodeId, item.id)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Dismiss"
          >
            <X size={13} style={{ color: '#5a5a72' }} />
          </button>
        </div>
      </div>
      {isAnswering && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') setIsAnswering(false)
            }}
            placeholder="Type your answer..."
            className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: '#1a1a1d', border: '1px solid #3d3d47', color: '#e8e8f0' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: answer.trim() ? '#14b8a6' : '#2e2e35',
              color: answer.trim() ? 'white' : '#5a5a72',
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Open Question Card (inline answering for entity open questions) ────────

export function OpenQuestionCard({
  entityLabel,
  entityType,
  entityId,
  question,
  questionIndex,
}: {
  entityLabel: string
  entityType?: EntityType
  entityId: string
  question: string
  questionIndex: number
}) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState('')
  const [isAnswered, setIsAnswered] = useState(false)
  const addNote = useNotesStore(s => s.addNote)

  function handleSubmit() {
    if (!answer.trim()) return
    const noteContent = `About ${entityLabel}: ${answer.trim()}`
    addNote({
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: noteContent }] }],
      }),
      plainText: noteContent,
      title: `About ${entityLabel}`,
      sourceType: 'text',
    })
    // Remove the question from the entity's openQuestions
    const node = useGraphStore.getState().nodes.find(n => n.id === entityId)
    if (node?.metadata?.openQuestions) {
      const updated = node.metadata.openQuestions.filter((_, i) => i !== questionIndex)
      useGraphStore.getState().patchEntityMetadata(entityId, { openQuestions: updated })
    }
    setIsAnswering(false)
    setAnswer('')
    setIsAnswered(true)
  }

  function handleDismiss() {
    const node = useGraphStore.getState().nodes.find(n => n.id === entityId)
    if (node?.metadata?.openQuestions) {
      const updated = node.metadata.openQuestions.filter((_, i) => i !== questionIndex)
      useGraphStore.getState().patchEntityMetadata(entityId, { openQuestions: updated })
    }
    setIsAnswered(true)
  }

  if (isAnswered) return null

  return (
    <div
      className="rounded-lg p-3 transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <EntityChip label={entityLabel} entityType={entityType} />
          </div>
          <p className="text-sm" style={{ color: '#e8e8f0' }}>{question}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isAnswering && (
            <button
              onClick={() => setIsAnswering(true)}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              title="Answer this question"
            >
              <Send size={13} style={{ color: '#f59e0b' }} />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Dismiss"
          >
            <X size={13} style={{ color: '#5a5a72' }} />
          </button>
        </div>
      </div>
      {isAnswering && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') setIsAnswering(false)
            }}
            placeholder="Type your answer..."
            className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: '#1a1a1d', border: '1px solid #3d3d47', color: '#e8e8f0' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: answer.trim() ? '#f59e0b' : '#2e2e35',
              color: answer.trim() ? 'white' : '#5a5a72',
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}
