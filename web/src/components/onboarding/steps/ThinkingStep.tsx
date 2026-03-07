import { useState } from 'react'
import { ArrowRight, ArrowLeft, SkipForward, Eye, MessageSquare, Hand, Shuffle } from 'lucide-react'
import type { ThinkingStyle } from '../../../types'

interface Props {
  thinkingStyle?: ThinkingStyle
  challengeLevel: number
  onNext: (data: { thinkingStyle?: ThinkingStyle; challengeLevel: number }) => void
  onBack: () => void
  onSkip: () => void
}

const STYLES: { id: ThinkingStyle; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'visual', label: 'Visual', desc: 'Diagrams, maps, spatial thinking', icon: Eye },
  { id: 'verbal', label: 'Verbal', desc: 'Writing, talking through ideas', icon: MessageSquare },
  { id: 'kinesthetic', label: 'Kinesthetic', desc: 'Learning by doing, prototyping', icon: Hand },
  { id: 'mixed', label: 'Mixed', desc: 'A bit of everything', icon: Shuffle },
]

const CHALLENGE_LABELS = ['Gentle', 'Supportive', 'Balanced', 'Rigorous', 'Relentless']

export default function ThinkingStep({ thinkingStyle: initStyle, challengeLevel: initLevel, onNext, onBack, onSkip }: Props) {
  const [style, setStyle] = useState<ThinkingStyle | undefined>(initStyle)
  const [level, setLevel] = useState(initLevel)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({ thinkingStyle: style, challengeLevel: level })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#e8e8f0' }}>How you think</h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          This calibrates how I challenge and support your reasoning.
        </p>
      </div>

      {/* Thinking style picker */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: '#9090a8' }}>
          Thinking style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => {
            const Icon = s.icon
            const selected = style === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className="flex items-start gap-3 rounded-xl p-3 text-left transition-all"
                style={{
                  background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : '#2e2e35'}`,
                }}
              >
                <Icon
                  size={18}
                  style={{ color: selected ? '#8b5cf6' : '#5a5a72', flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <div className="text-sm font-medium" style={{ color: selected ? '#8b5cf6' : '#e8e8f0' }}>
                    {s.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>
                    {s.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Challenge level slider */}
      <div>
        <label className="text-xs font-medium block mb-2" style={{ color: '#9090a8' }}>
          Challenge level
        </label>
        <div className="px-1">
          <input
            type="range"
            min={1}
            max={5}
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            className="w-full accent-purple-500"
            style={{ accentColor: '#8b5cf6' }}
          />
          <div className="flex justify-between mt-1">
            {CHALLENGE_LABELS.map((l, i) => (
              <span
                key={l}
                className="text-xs"
                style={{ color: level === i + 1 ? '#8b5cf6' : '#5a5a72' }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs mt-3 rounded-lg p-2.5" style={{ background: 'rgba(139,92,246,0.06)', color: '#9090a8' }}>
          {level <= 2 && "I'll focus on encouragement and gentle probing. Good for brainstorming."}
          {level === 3 && "I'll balance support with challenge. Push back on weak points, affirm strong ones."}
          {level >= 4 && "I'll actively challenge assumptions and push for rigor. Expect tough questions."}
        </p>
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
