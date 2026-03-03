import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useRemindersStore } from '../../stores/remindersStore'
import { useNotesStore } from '../../stores/notesStore'

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 1200  // slightly > 1s for safety

export default function BulkAnalyzeButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const { lastFullAnalysis, setLastFullAnalysis } = useGraphStore()
  const notes = useNotesStore(s => s.notes)

  const alreadyDone = !!lastFullAnalysis
  const hasNotes = notes.length > 0

  async function runBulkAnalysis() {
    if (!hasNotes || isRunning) return

    setIsRunning(true)
    setProgress({ done: 0, total: notes.length })

    const [{ analyzeNoteForGraph }, { analyzeNoteForReminders }] = await Promise.all([
      import('../../lib/agents/graphAgent'),
      import('../../lib/agents/reminderAgent'),
    ])

    /**
     * Two-pass strategy for maximum cross-note linking:
     * Pass A: Extract entities for all notes (builds the graph index)
     * Pass B: Re-run all notes (now Pass 1b finds related notes via the index)
     */
    const runPass = async (passLabel: string) => {
      for (let i = 0; i < notes.length; i += BATCH_SIZE) {
        const batch = notes.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(note =>
            Promise.all([
              analyzeNoteForGraph(note, useGraphStore.getState(), notes),
              passLabel === 'A' ? Promise.resolve() : analyzeNoteForReminders(note, useRemindersStore.getState()),
            ])
          )
        )
        setProgress(p => ({ ...p, done: Math.min(i + BATCH_SIZE, notes.length) }))
        if (i + BATCH_SIZE < notes.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
        }
      }
    }

    try {
      // Pass A: build entity graph index
      await runPass('A')
      // Reset progress counter for Pass B
      setProgress({ done: 0, total: notes.length })
      // Pass B: cross-link using populated graph + extract reminders
      await runPass('B')
      setLastFullAnalysis(new Date().toISOString())
    } catch (err) {
      console.warn('[BulkAnalyze] Error:', err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {isRunning && (
        <div className="flex items-center gap-2">
          <div
            className="animate-spin rounded-full"
            style={{ width: 14, height: 14, border: '2px solid #2e2e35', borderTopColor: '#8b5cf6' }}
          />
          <span className="text-xs" style={{ color: '#9090a8' }}>
            Analyzing {progress.done}/{progress.total} notes…
          </span>
        </div>
      )}
      <button
        onClick={runBulkAnalysis}
        disabled={isRunning || !hasNotes}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          background: alreadyDone ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.15)',
          color: isRunning || !hasNotes ? '#5a5a72' : alreadyDone ? '#9090a8' : '#8b5cf6',
          border: `1px solid ${alreadyDone ? '#2e2e35' : 'rgba(139,92,246,0.3)'}`,
          cursor: isRunning || !hasNotes ? 'not-allowed' : 'pointer',
        }}
      >
        {alreadyDone ? (
          <>
            <RefreshCw size={12} />
            <span>Re-analyze all</span>
          </>
        ) : (
          <>
            <Sparkles size={12} />
            <span>Build knowledge graph</span>
          </>
        )}
      </button>
    </div>
  )
}
