import { Sparkles, User, Briefcase, Target, Brain, Zap } from 'lucide-react'
import type { UserProfile, ThinkingStyle } from '../../../types'

interface Props {
  profile: Partial<UserProfile> & { name: string }
  onFinish: () => void
}

const CHALLENGE_LABELS: Record<number, string> = {
  1: 'Gentle', 2: 'Supportive', 3: 'Balanced', 4: 'Rigorous', 5: 'Relentless',
}

const STYLE_LABELS: Record<ThinkingStyle, string> = {
  visual: 'Visual thinker',
  verbal: 'Verbal thinker',
  kinesthetic: 'Hands-on learner',
  mixed: 'Mixed approach',
}

const GOAL_LABELS: Record<string, string> = {
  think: 'Think through problems',
  projects: 'Track projects & people',
  remember: 'Remember everything',
  connections: 'Surface connections',
  emotional: 'Process thoughts & stress',
}

export default function ReadyStep({ profile, onFinish }: Props) {
  const items: { icon: React.ElementType; label: string; value: string }[] = []

  if (profile.role || profile.organization) {
    items.push({
      icon: Briefcase,
      label: 'Role',
      value: [profile.role, profile.organization].filter(Boolean).join(' @ '),
    })
  }

  if (profile.focusAreas && profile.focusAreas.length > 0) {
    items.push({
      icon: Target,
      label: 'Focus',
      value: profile.focusAreas.slice(0, 4).join(', ') + (profile.focusAreas.length > 4 ? ` +${profile.focusAreas.length - 4}` : ''),
    })
  }

  if (profile.thinkingStyle) {
    items.push({
      icon: Brain,
      label: 'Style',
      value: STYLE_LABELS[profile.thinkingStyle],
    })
  }

  items.push({
    icon: Zap,
    label: 'Challenge',
    value: CHALLENGE_LABELS[profile.challengeLevel ?? 3] ?? 'Balanced',
  })

  if (profile.goals && profile.goals.length > 0) {
    items.push({
      icon: Sparkles,
      label: 'Goals',
      value: profile.goals.map(g => GOAL_LABELS[g] ?? g).join(', '),
    })
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(20,184,166,0.2))',
          border: '2px solid rgba(139,92,246,0.3)',
        }}
      >
        <User size={24} style={{ color: '#8b5cf6' }} />
      </div>

      <div>
        <h2 className="text-xl font-bold" style={{ color: '#e8e8f0' }}>
          Ready, {profile.name}
        </h2>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Here's what I know about you. You can update this anytime in Settings.
        </p>
      </div>

      {/* Summary card */}
      <div
        className="w-full rounded-xl p-4 text-left"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
      >
        <div className="flex flex-col gap-3">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon size={16} style={{ color: '#5a5a72', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span className="text-xs" style={{ color: '#5a5a72' }}>{item.label}</span>
                  <div className="text-sm" style={{ color: '#e8e8f0' }}>{item.value}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={onFinish}
        className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-medium transition-all"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)', color: 'white' }}
      >
        <Sparkles size={16} />
        Start thinking
      </button>
    </div>
  )
}
