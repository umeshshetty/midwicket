import { useState } from 'react'
import { Brain, ArrowRight } from 'lucide-react'

interface Props {
  name: string
  onNext: (name: string) => void
}

export default function WelcomeStep({ name: initial, onNext }: Props) {
  const [name, setName] = useState(initial)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) onNext(name.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center text-center gap-8">
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)',
        }}
      >
        <Brain size={32} color="white" />
      </div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#e8e8f0' }}>
          Welcome to Midwicket
        </h1>
        <p className="text-sm mt-2 max-w-sm" style={{ color: '#9090a8' }}>
          Your thinking partner. Not an assistant that gives answers — a mirror that helps you think more clearly.
        </p>
      </div>

      <div className="w-full max-w-xs">
        <label className="text-xs font-medium block text-left mb-2" style={{ color: '#9090a8' }}>
          What should I call you?
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          placeholder="Your first name"
          autoFocus
          className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          style={{
            background: '#1a1a1d',
            color: '#e8e8f0',
            border: '1px solid #2e2e35',
            caretColor: '#8b5cf6',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
        />
      </div>

      <button
        type="submit"
        disabled={!name.trim()}
        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all"
        style={{
          background: name.trim() ? '#8b5cf6' : '#2e2e35',
          color: name.trim() ? 'white' : '#5a5a72',
          cursor: name.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        Get started
        <ArrowRight size={16} />
      </button>
    </form>
  )
}
