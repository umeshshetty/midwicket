import { useState } from 'react'
import { ArrowRight, ArrowLeft, SkipForward } from 'lucide-react'

interface Props {
  role?: string
  organization?: string
  industry?: string
  onNext: (data: { role?: string; organization?: string; industry?: string }) => void
  onBack: () => void
  onSkip: () => void
}

const INDUSTRY_SUGGESTIONS = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Design',
  'Consulting', 'Media', 'Research', 'Government', 'Nonprofit',
]

export default function RoleStep({ role: initRole, organization: initOrg, industry: initInd, onNext, onBack, onSkip }: Props) {
  const [role, setRole] = useState(initRole ?? '')
  const [organization, setOrganization] = useState(initOrg ?? '')
  const [industry, setIndustry] = useState(initInd ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({
      role: role.trim() || undefined,
      organization: organization.trim() || undefined,
      industry: industry.trim() || undefined,
    })
  }

  const inputStyle = {
    background: '#1a1a1d',
    color: '#e8e8f0',
    border: '1px solid #2e2e35',
    caretColor: '#8b5cf6',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#e8e8f0' }}>What do you do?</h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Helps me understand the lens you think through.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: '#9090a8' }}>Role</label>
          <input
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            maxLength={100}
            placeholder="e.g. Product Manager, Engineer, Founder"
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: '#9090a8' }}>Organization</label>
          <input
            type="text"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            maxLength={100}
            placeholder="e.g. Anthropic, freelance, Stanford"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: '#9090a8' }}>Industry</label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            maxLength={100}
            placeholder="e.g. Technology, Healthcare"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INDUSTRY_SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setIndustry(s)}
                className="text-xs rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: industry === s ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                  color: industry === s ? '#8b5cf6' : '#9090a8',
                  border: `1px solid ${industry === s ? 'rgba(139,92,246,0.3)' : '#2e2e35'}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
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
