import { GitFork } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useNotesStore } from '../../stores/notesStore'
import KnowledgeGraph from './KnowledgeGraph'
import BulkAnalyzeButton from './BulkAnalyzeButton'

function EmptyState({ noteCount }: { noteCount: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div
        className="rounded-full p-4"
        style={{ background: 'rgba(139,92,246,0.1)' }}
      >
        <GitFork size={28} style={{ color: '#8b5cf6' }} />
      </div>
      <div className="text-center">
        <h3 className="font-semibold mb-1" style={{ color: '#e8e8f0' }}>
          Knowledge graph is empty
        </h3>
        <p className="text-sm max-w-xs" style={{ color: '#9090a8' }}>
          {noteCount === 0
            ? 'Capture some notes first, then build your knowledge graph.'
            : `You have ${noteCount} note${noteCount !== 1 ? 's' : ''} ready to analyze. Click "Build knowledge graph" to start.`}
        </p>
      </div>
    </div>
  )
}

export default function GraphView() {
  const { nodes, edges, processingNoteIds } = useGraphStore()
  const notes = useNotesStore(s => s.notes)

  const hasGraph = nodes.length > 0
  const processingCount = processingNoteIds.length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#2e2e35', flexShrink: 0, background: '#131315' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>
            Connections
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>
            {hasGraph
              ? `${nodes.length} nodes · ${edges.length} connections${processingCount > 0 ? ` · Analyzing ${processingCount} note${processingCount !== 1 ? 's' : ''}…` : ''}`
              : 'How your ideas, people, and projects link together — built automatically'}
          </p>
        </div>
        <BulkAnalyzeButton />
      </div>

      {/* Graph or empty state */}
      {hasGraph ? <KnowledgeGraph /> : <EmptyState noteCount={notes.length} />}
    </div>
  )
}
