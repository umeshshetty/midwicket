import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'
import type { UserProfile } from '../../types'
import WelcomeStep from './steps/WelcomeStep'
import RoleStep from './steps/RoleStep'
import FocusStep from './steps/FocusStep'
import ThinkingStep from './steps/ThinkingStep'
import GoalsStep from './steps/GoalsStep'
import ReadyStep from './steps/ReadyStep'

const TOTAL_STEPS = 6

interface Props {
  /** When true, pre-fills from existing profile and shows a close button */
  isEditing?: boolean
  onClose?: () => void
}

export default function OnboardingFlow({ isEditing, onClose }: Props) {
  const existingProfile = useUserStore(s => s.profile)
  const setProfile = useUserStore(s => s.setProfile)

  // Draft profile — pre-filled from existing when editing
  const [draft, setDraft] = useState<Partial<UserProfile> & { name: string }>(() => {
    if (isEditing && existingProfile) {
      return { ...existingProfile }
    }
    return { name: '', focusAreas: [], challengeLevel: 3, goals: [] }
  })
  const [step, setStep] = useState(0)

  const next = useCallback(() => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)), [])
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0)), [])

  function finish() {
    const now = new Date().toISOString()
    setProfile({
      name: draft.name,
      role: draft.role,
      organization: draft.organization,
      industry: draft.industry,
      focusAreas: draft.focusAreas ?? [],
      thinkingStyle: draft.thinkingStyle,
      challengeLevel: draft.challengeLevel ?? 3,
      goals: draft.goals ?? [],
      customGoal: draft.customGoal,
      onboardedAt: existingProfile?.onboardedAt ?? now,
      updatedAt: now,
    })
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden relative"
        style={{ background: '#131315', border: '1px solid #2e2e35' }}
      >
        {/* Close button (editing mode only) */}
        {isEditing && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-lg p-1.5 transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e8e8f0')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
          >
            <X size={18} />
          </button>
        )}

        {/* Progress bar */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: i <= step ? '#8b5cf6' : '#2e2e35',
                }}
              />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: '#5a5a72' }}>
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {step === 0 && (
            <WelcomeStep
              name={draft.name}
              onNext={(name) => { setDraft(d => ({ ...d, name })); next() }}
            />
          )}

          {step === 1 && (
            <RoleStep
              role={draft.role}
              organization={draft.organization}
              industry={draft.industry}
              onNext={(data) => { setDraft(d => ({ ...d, ...data })); next() }}
              onBack={back}
              onSkip={next}
            />
          )}

          {step === 2 && (
            <FocusStep
              focusAreas={draft.focusAreas ?? []}
              onNext={(areas) => { setDraft(d => ({ ...d, focusAreas: areas })); next() }}
              onBack={back}
              onSkip={next}
            />
          )}

          {step === 3 && (
            <ThinkingStep
              thinkingStyle={draft.thinkingStyle}
              challengeLevel={draft.challengeLevel ?? 3}
              onNext={(data) => { setDraft(d => ({ ...d, ...data })); next() }}
              onBack={back}
              onSkip={next}
            />
          )}

          {step === 4 && (
            <GoalsStep
              goals={draft.goals ?? []}
              customGoal={draft.customGoal}
              onNext={(data) => { setDraft(d => ({ ...d, ...data })); next() }}
              onBack={back}
              onSkip={next}
            />
          )}

          {step === 5 && (
            <ReadyStep
              profile={draft}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  )
}
