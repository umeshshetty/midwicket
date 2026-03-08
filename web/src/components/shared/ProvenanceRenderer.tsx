/**
 * ProvenanceRenderer — Renders wiki text with clickable source attribution.
 * Each sentence/clause is hoverable, showing which notes contributed.
 */

import { useState, useRef, useEffect } from 'react'
import { FileText, X } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'
import type { ProvenancedWiki } from '../../types'

const CONFIDENCE_COLORS: Record<string, string> = {
  direct: '#22c55e',
  inferred: '#f59e0b',
  synthesized: '#8b5cf6',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  inferred: 'Inferred',
  synthesized: 'Synthesized',
}

function ProvenancePopover({
  sourceNoteIds,
  confidence,
  onClose,
  anchorRect,
}: {
  sourceNoteIds: string[]
  confidence: string
  onClose: () => void
  anchorRect: DOMRect | null
}) {
  const getNoteById = useNotesStore(s => s.getNoteById)
  const openNote = useUIStore(s => s.openNote)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (!anchorRect) return null

  const notes = sourceNoteIds.map(id => getNoteById(id)).filter(Boolean)
  const color = CONFIDENCE_COLORS[confidence] ?? '#8b5cf6'

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl shadow-xl"
      style={{
        top: anchorRect.bottom + 8,
        left: Math.min(anchorRect.left, window.innerWidth - 320),
        width: 300,
        background: '#1a1a1d',
        border: '1px solid #2e2e35',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#2e2e35' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-medium" style={{ color }}>
            {CONFIDENCE_LABELS[confidence] ?? confidence}
          </span>
          <span className="text-[10px]" style={{ color: '#5a5a72' }}>
            {notes.length} source{notes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded" style={{ color: '#5a5a72' }}>
          <X size={12} />
        </button>
      </div>

      {/* Source notes */}
      <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs px-2 py-3 text-center" style={{ color: '#5a5a72' }}>
            Source notes no longer available
          </p>
        ) : (
          notes.map(note => (
            <button
              key={note!.id}
              onClick={() => { openNote(note!.id); onClose() }}
              className="w-full text-left rounded-lg p-2 flex items-start gap-2 transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <FileText size={12} style={{ color: '#5a5a72', flexShrink: 0, marginTop: 1 }} />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#e8e8f0' }}>
                  {note!.title}
                </div>
                <div className="text-[10px]" style={{ color: '#3d3d47' }}>
                  {new Date(note!.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default function ProvenanceRenderer({ wiki }: { wiki: ProvenancedWiki }) {
  const [activeSpan, setActiveSpan] = useState<number | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  function handleSpanClick(index: number, e: React.MouseEvent<HTMLSpanElement>) {
    if (activeSpan === index) {
      setActiveSpan(null)
      return
    }
    setActiveSpan(index)
    setAnchorRect(e.currentTarget.getBoundingClientRect())
  }

  return (
    <div className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>
      {wiki.spans.map((span, i) => {
        const color = CONFIDENCE_COLORS[span.confidence] ?? '#8b5cf6'
        const hasSources = span.sourceNoteIds.length > 0

        return (
          <span key={i}>
            <span
              onClick={hasSources ? (e) => handleSpanClick(i, e) : undefined}
              className="transition-all duration-150"
              style={{
                cursor: hasSources ? 'pointer' : 'default',
                borderBottom: hasSources ? `1px dashed ${color}40` : 'none',
                background: activeSpan === i ? `${color}12` : 'transparent',
                borderRadius: activeSpan === i ? 3 : 0,
                padding: activeSpan === i ? '0 2px' : 0,
              }}
              onMouseEnter={e => {
                if (hasSources) e.currentTarget.style.borderBottomColor = color
              }}
              onMouseLeave={e => {
                if (hasSources) e.currentTarget.style.borderBottomColor = `${color}40`
              }}
              title={hasSources ? `${span.confidence} — click to see sources` : undefined}
            >
              {span.text}
            </span>
            {' '}
          </span>
        )
      })}

      {/* Popover */}
      {activeSpan !== null && wiki.spans[activeSpan] && (
        <ProvenancePopover
          sourceNoteIds={wiki.spans[activeSpan].sourceNoteIds}
          confidence={wiki.spans[activeSpan].confidence}
          onClose={() => setActiveSpan(null)}
          anchorRect={anchorRect}
        />
      )}
    </div>
  )
}
