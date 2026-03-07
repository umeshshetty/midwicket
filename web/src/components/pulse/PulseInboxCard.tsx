import { Activity, ArrowRight } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { usePulseCounts } from '../../lib/pulse'

export default function PulseInboxCard() {
  const setView = useUIStore(s => s.setView)
  const { tensions, blockers, openQuestions, profileQuestions, actionable } = usePulseCounts()

  if (actionable === 0) return null

  return (
    <button
      onClick={() => setView('pulse')}
      className="w-full text-left rounded-xl p-3.5 mb-3 mt-2 transition-all"
      style={{
        background: 'rgba(139,92,246,0.04)',
        border: '1px solid rgba(139,92,246,0.15)',
        borderLeft: '3px solid #8b5cf6',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(139,92,246,0.04)'
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity size={15} style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
            {actionable} item{actionable !== 1 ? 's' : ''} need{actionable === 1 ? 's' : ''} your attention
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: '#8b5cf6' }}>
          <span className="text-xs">View Pulse</span>
          <ArrowRight size={12} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 ml-6">
        {tensions > 0 && (
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
            {tensions} tension{tensions !== 1 ? 's' : ''}
          </span>
        )}
        {blockers > 0 && (
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
            {blockers} blocker{blockers !== 1 ? 's' : ''}
          </span>
        )}
        {openQuestions > 0 && (
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            {openQuestions} question{openQuestions !== 1 ? 's' : ''}
          </span>
        )}
        {profileQuestions > 0 && (
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}>
            {profileQuestions} gap{profileQuestions !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}
