import { useState } from 'react'
import {
  ArrowRight, ArrowLeft, SkipForward,
  Brain, FolderKanban, BookOpen, GitFork, Heart,
} from 'lucide-react'

interface Props {
  goals: string[]
  customGoal?: string
  onNext: (data: { goals: string[]; customGoal?: string }) => void
  onBack: () => void
  onSkip: () => void
}

const GOAL_OPTIONS: { id: string; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'think', label: 'Think through problems', desc: 'Socratic questioning, structured reasoning', icon: Brain },
  { id: 'projects', label: 'Track projects & people', desc: 'Living briefs, dependency awareness', icon: FolderKanban },
  { id: 'remember', label: 'Remember everything', desc: 'Semantic search, auto-linking notes', icon: BookOpen },
  { id: 'connections', label: 'Surface connections', desc: 'Find hidden patterns across ideas', icon: GitFork },
  { id: 'emotional', label: 'Process thoughts & stress', desc: 'Brain dumps, emotional sorting', icon: Heart },
]

export default function GoalsStep({ goals: initGoals, customGoal: initCustom, onNext, onBack, onSkip }: Props) {
  const [goals, setGoals] = useState<string[]>(initGoals.length > 0 ? initGoals : [])
  const [customGoal, setCustomGoal] = useState(initCustom ?? '')

  function toggle(id: string) {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({ goals, customGoal: customGoal.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#e8e8f0' }}>What's your goal?</h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Pick everything that resonates. I'll tailor my approach accordingly.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {GOAL_OPTIONS.map(g => {
          const Icon = g.icon
          const selected = goals.includes(g.id)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              className="flex items-center gap-3 rounded-xl p-3.5 text-left transition-all"
              style={{
                background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : '#2e2e35'}`,
              }}
            >
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  background: selected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <Icon size={18} style={{ color: selected ? '#8b5cf6' : '#5a5a72' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: selected ? '#8b5cf6' : '#e8e8f0' }}>
                  {g.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>{g.desc}</div>
              </div>
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  border: `2px solid ${selected ? '#8b5cf6' : '#3d3d47'}`,
                  background: selected ? '#8b5cf6' : 'transparent',
                }}
              >
                {selected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom goal */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: '#9090a8' }}>
          Anything else? (optional)
        </label>
        <input
          type="text"
          value={customGoal}
          onChange={e => setCustomGoal(e.target.value)}
          maxLength={200}
          placeholder="e.g. Prepare for board meetings, Write my book…"
          className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
          style={{ background: '#1a1a1d', color: '#e8e8f0', border: '1px solid #2e2e35', caretColor: '#8b5cf6' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm transition-colors"
          style={{ color: '#9090a8', background: 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium flex-1 justify-center"
          style={{ background: '#8b5cf6', color: 'white' }}
        >
          Continue <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs transition-colors"
          style={{ color: '#5a5a72' }}
        >
          <SkipForward size={12} /> Skip
        </button>
      </div>
    </form>
  )
}
