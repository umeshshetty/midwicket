import { X, Focus } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import type { EntityType } from '../../types'

const ENTITY_COLORS: Record<EntityType, string> = {
  person: '#14b8a6',
  project: '#f59e0b',
  concept: '#8b5cf6',
  technology: '#3b82f6',
  organization: '#f97316',
  idea: '#e879f9',
  place: '#22c55e',
  event: '#f43f5e',
}

export default function FocusBanner() {
  const focusContext = useUIStore(s => s.focusContext)

  if (!focusContext) return null

  const color = ENTITY_COLORS[focusContext.entityType] ?? '#8b5cf6'

  return (
    <div
      className="flex items-center gap-2 px-4 shrink-0"
      style={{
        height: 36,
        background: 'rgba(139,92,246,0.06)',
        borderBottom: '1px solid rgba(139,92,246,0.12)',
      }}
    >
      <Focus size={14} style={{ color }} />
      <span style={{ color: '#9090a8', fontSize: 13 }}>Focused on:</span>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color,
          background: `${color}18`,
          border: `1px solid ${color}30`,
        }}
      >
        {focusContext.entityLabel}
      </span>
      <span style={{ color: '#5a5a72', fontSize: 11 }}>
        {focusContext.entityType}
      </span>
      <div className="flex-1" />
      <button
        onClick={() => useUIStore.getState().exitFocus()}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-white/5"
        style={{ color: '#9090a8', fontSize: 12 }}
      >
        <X size={12} />
        Exit
      </button>
    </div>
  )
}
