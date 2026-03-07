import { useState } from 'react'
import { ArrowRight, ArrowLeft, SkipForward, X, Plus } from 'lucide-react'

interface Props {
  focusAreas: string[]
  onNext: (areas: string[]) => void
  onBack: () => void
  onSkip: () => void
}

const SUGGESTIONS = [
  'Product strategy', 'Engineering', 'AI / ML', 'Design', 'User research',
  'Writing', 'Startup building', 'Investing', 'Personal growth', 'Health',
  'Leadership', 'Data science', 'Marketing', 'Sales', 'Operations',
  'Philosophy', 'Creative projects', 'Relationships', 'Finance', 'Learning',
]

export default function FocusStep({ focusAreas: initial, onNext, onBack, onSkip }: Props) {
  const [areas, setAreas] = useState<string[]>(initial.length > 0 ? initial : [])
  const [custom, setCustom] = useState('')

  function toggle(area: string) {
    setAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : prev.length < 7 ? [...prev, area] : prev
    )
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (trimmed && !areas.includes(trimmed) && areas.length < 7) {
      setAreas(prev => [...prev, trimmed])
      setCustom('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext(areas)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#e8e8f0' }}>Your world</h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Pick 3–5 areas you think about most. I'll prioritize these in our conversations.
        </p>
      </div>

      {/* Selected chips */}
      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {areas.map(a => (
            <span
              key={a}
              className="flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              {a}
              <button type="button" onClick={() => toggle(a)} className="opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggestions grid */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.filter(s => !areas.includes(s)).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className="text-xs rounded-full px-2.5 py-1.5 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#9090a8',
              border: '1px solid #2e2e35',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          maxLength={50}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Add your own…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={{ background: '#1a1a1d', color: '#e8e8f0', border: '1px solid #2e2e35', caretColor: '#8b5cf6' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="rounded-xl px-3 py-2.5 transition-colors"
          style={{ background: custom.trim() ? 'rgba(139,92,246,0.15)' : 'transparent', color: custom.trim() ? '#8b5cf6' : '#5a5a72' }}
        >
          <Plus size={16} />
        </button>
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
