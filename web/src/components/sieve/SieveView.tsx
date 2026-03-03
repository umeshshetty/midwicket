import { useState } from 'react'
import {
  Zap, Lightbulb, HelpCircle, Heart, Plus, Trash2, ChevronDown, ChevronRight,
  Loader2, FileText, ArrowRight, Filter
} from 'lucide-react'
import { useSieveStore } from '../../stores/sieveStore'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import { processBrainDump } from '../../lib/agents/sieveAgent'
import type { BrainDump, SieveItem } from '../../types'

const BUCKET_CONFIG = {
  actionable: {
    label: 'Actionable Next Steps',
    icon: Zap,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  incubating: {
    label: 'Incubating Ideas',
    icon: Lightbulb,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  questions: {
    label: 'Open Questions / Blockers',
    icon: HelpCircle,
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  emotional: {
    label: 'Emotional Offload',
    icon: Heart,
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
} as const

type BucketKey = keyof typeof BUCKET_CONFIG

function BucketSection({
  bucket,
  items,
  dumpId,
  canConvert,
}: {
  bucket: BucketKey
  items: SieveItem[]
  dumpId: string
  canConvert: boolean
}) {
  const config = BUCKET_CONFIG[bucket]
  const Icon = config.icon
  const addNote = useNotesStore(s => s.addNote)
  const openNote = useUIStore(s => s.openNote)
  const markItemAsNote = useSieveStore(s => s.markItemAsNote)

  if (items.length === 0) return null

  function convertToNote(item: SieveItem, index: number) {
    const note = addNote({
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: item.text }] }],
      }),
      plainText: item.text,
      sourceType: 'text',
    })
    markItemAsNote(dumpId, bucket as 'actionable' | 'incubating' | 'questions', index, note.id)
    openNote(note.id)
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: config.bgColor, borderColor: config.borderColor }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Icon size={16} style={{ color: config.color }} />
        <span className="text-sm font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
        <span
          className="text-xs rounded-full px-1.5 py-0.5 font-medium ml-auto"
          style={{ background: config.borderColor, color: config.color }}
        >
          {items.length}
        </span>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg px-3 py-2 group"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <span className="text-sm leading-relaxed flex-1" style={{ color: '#e8e8f0' }}>
              {item.text}
            </span>
            {canConvert && bucket !== 'emotional' && !item.noteId && (
              <button
                onClick={() => convertToNote(item, i)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1"
                style={{ color: config.color }}
                title="Convert to note"
              >
                <ArrowRight size={14} />
              </button>
            )}
            {item.noteId && (
              <button
                onClick={() => openNote(item.noteId!)}
                className="flex-shrink-0 rounded p-1"
                style={{ color: '#5a5a72' }}
                title="Open note"
              >
                <FileText size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DumpCard({ dump }: { dump: BrainDump }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const deleteDump = useSieveStore(s => s.deleteDump)
  const totalItems =
    dump.actionable.length + dump.incubating.length +
    dump.questions.length + dump.emotional.length

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: '#1a1a1d', borderColor: '#2e2e35' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown size={16} style={{ color: '#5a5a72' }} />
        ) : (
          <ChevronRight size={16} style={{ color: '#5a5a72' }} />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
            Brain Dump
          </span>
          <span className="text-xs ml-2" style={{ color: '#5a5a72' }}>
            {new Date(dump.createdAt).toLocaleDateString()} · {totalItems} items
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); deleteDump(dump.id) }}
          className="rounded p-1 transition-colors"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
          title="Delete dump"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {/* Raw text preview */}
          <div
            className="rounded-lg px-3 py-2 text-xs leading-relaxed max-h-20 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#5a5a72' }}
          >
            {dump.rawText.slice(0, 200)}{dump.rawText.length > 200 ? '…' : ''}
          </div>

          {/* Buckets */}
          <BucketSection bucket="actionable" items={dump.actionable} dumpId={dump.id} canConvert />
          <BucketSection bucket="incubating" items={dump.incubating} dumpId={dump.id} canConvert />
          <BucketSection bucket="questions" items={dump.questions} dumpId={dump.id} canConvert />
          <BucketSection bucket="emotional" items={dump.emotional} dumpId={dump.id} canConvert={false} />
        </div>
      )}
    </div>
  )
}

export default function SieveView() {
  const [rawText, setRawText] = useState('')
  const { dumps, isProcessing, addDump, setProcessing } = useSieveStore()

  async function handleProcess() {
    const text = rawText.trim()
    if (!text || isProcessing) return

    setProcessing(true)
    try {
      const result = await processBrainDump(text)
      addDump(text, result)
      setRawText('')
    } catch (err) {
      console.error('[Sieve] Processing failed', err)
    } finally {
      setProcessing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleProcess()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: '#2e2e35' }}
      >
        <Filter size={20} style={{ color: '#8b5cf6' }} />
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#e8e8f0' }}>
            Cognitive Sieve
          </h1>
          <p className="text-xs" style={{ color: '#5a5a72' }}>
            Dump everything. Let AI sort the chaos.
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="px-6 pt-4 flex-shrink-0">
        <div
          className="rounded-xl border transition-all"
          style={{
            background: '#1a1a1d',
            borderColor: rawText.trim() ? '#8b5cf6' : '#2e2e35',
            boxShadow: rawText.trim() ? '0 0 0 1px rgba(139,92,246,0.2)' : 'none',
          }}
        >
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Brain dump here — stream of consciousness, half-thoughts, frustrations, ideas, todos, all of it. Don't organize, just dump..."
            rows={6}
            className="w-full bg-transparent resize-none px-4 pt-4 pb-2 text-sm leading-relaxed focus:outline-none"
            style={{ color: '#e8e8f0', caretColor: '#8b5cf6' }}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-xs" style={{ color: '#5a5a72' }}>
              {rawText.split(/\s+/).filter(Boolean).length} words
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#5a5a72' }}>
                ⌘↵ to process
              </span>
              <button
                onClick={handleProcess}
                disabled={!rawText.trim() || isProcessing}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: rawText.trim() && !isProcessing ? 'rgba(139,92,246,0.9)' : '#2a2a2f',
                  color: rawText.trim() && !isProcessing ? 'white' : '#5a5a72',
                  cursor: rawText.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sieving…</span>
                  </>
                ) : (
                  <>
                    <Filter size={14} />
                    <span>Process</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Past dumps */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {dumps.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Filter size={32} style={{ color: '#2e2e35' }} />
            <p className="text-sm" style={{ color: '#5a5a72' }}>
              No brain dumps yet. Let it all out above.
            </p>
          </div>
        )}
        {dumps.map(dump => (
          <DumpCard key={dump.id} dump={dump} />
        ))}
      </div>
    </div>
  )
}
