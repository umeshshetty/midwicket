import { useState, useMemo } from 'react'
import {
  Activity, AlertTriangle, AlertOctagon, HelpCircle, EyeOff, Ghost,
  ChevronDown, ChevronRight, ArrowRight, CheckCircle,
} from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useBlindspotStore } from '../../stores/blindspotStore'
import { useUIStore } from '../../stores/uiStore'
import { usePulseCounts } from '../../lib/pulse'
import type { EntityType } from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const THIRTY_DAYS = 30 * 86400000

const ENTITY_COLORS: Record<string, string> = {
  person: '#14b8a6', project: '#f59e0b', concept: '#8b5cf6',
  technology: '#3b82f6', organization: '#f97316', idea: '#e879f9',
  place: '#22c55e', event: '#f43f5e',
}

const BLINDSPOT_COLORS: Record<string, string> = {
  'Missing Perspective': '#8b5cf6', 'Assumption Gap': '#f43f5e',
  'Unconsidered Risk': '#f59e0b', 'Information Gap': '#14b8a6',
  'Confirmation Bias': '#f97316', 'Temporal Blindspot': '#3b82f6',
  'Stakeholder Gap': '#e879f9', 'Alternative Approach': '#22c55e',
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────

function PulseSection({
  icon: Icon, title, count, accentColor, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; count: number; accentColor: string
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div>
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isOpen ? <ChevronDown size={13} style={{ color: accentColor }} /> : <ChevronRight size={13} style={{ color: accentColor }} />}
        <Icon size={14} style={{ color: accentColor }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
          {title}
        </span>
        <span
          className="text-xs rounded-full px-1.5 py-0.5"
          style={{ background: `${accentColor}18`, color: accentColor }}
        >
          {count}
        </span>
      </button>
      {isOpen && <div className="space-y-1.5 ml-1">{children}</div>}
    </div>
  )
}

// ─── Entity Chip ─────────────────────────────────────────────────────────────

function EntityChip({ label, entityType }: { label: string; entityType?: EntityType }) {
  const color = ENTITY_COLORS[entityType ?? ''] ?? '#9090a8'
  return (
    <span
      className="text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
}

// ─── Pulse Item Card ─────────────────────────────────────────────────────────

function PulseItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 transition-all flex items-start gap-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e35' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        e.currentTarget.style.borderColor = '#3d3d47'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        e.currentTarget.style.borderColor = '#2e2e35'
      }}
    >
      {children}
    </button>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function PulseView() {
  const setView = useUIStore(s => s.setView)
  const nodes = useGraphStore(s => s.nodes)
  const tensions = useTensionsStore(s => s.tensions)
  const analyses = useBlindspotStore(s => s.analyses)
  const counts = usePulseCounts()

  // Pending tensions
  const pendingTensions = useMemo(
    () => tensions.filter(t => !t.isDismissed && !t.isReconciled).slice(0, 10),
    [tensions]
  )

  // Blockers grouped by entity
  const blockerItems = useMemo(() =>
    nodes
      .filter(n => n.type === 'entity' && n.metadata?.blockers?.length)
      .flatMap(n => n.metadata!.blockers!.map(b => ({
        entityLabel: n.label, entityType: n.entityType, blocker: b,
      }))),
    [nodes]
  )

  // Open questions grouped by entity
  const questionItems = useMemo(() =>
    nodes
      .filter(n => n.type === 'entity' && n.metadata?.openQuestions?.length)
      .flatMap(n => n.metadata!.openQuestions!.map(q => ({
        entityLabel: n.label, entityType: n.entityType, question: q,
      }))),
    [nodes]
  )

  // Recent blindspot findings
  const blindspotItems = useMemo(() =>
    analyses.slice(0, 10).flatMap(a =>
      a.blindspots.map(b => ({
        ...b, entityLabel: a.entityLabel, analyzedAt: a.createdAt,
      }))
    ),
    [analyses]
  )

  // Sparse or stale entities
  const sparseItems = useMemo(() => {
    const now = Date.now()
    return nodes
      .filter(n => {
        if (n.type !== 'entity') return false
        const isSparse = n.noteIds.length <= 1
        const isStale = n.metadata?.lastMentionedAt
          ? (now - new Date(n.metadata.lastMentionedAt).getTime()) > THIRTY_DAYS
          : false
        return isSparse || isStale
      })
      .sort((a, b) => a.noteIds.length - b.noteIds.length)
      .slice(0, 15)
  }, [nodes])

  function navigateToEntity(entityType?: EntityType) {
    if (entityType === 'person') setView('people')
    else if (entityType === 'project' || entityType === 'organization') setView('work')
    else setView('wiki')
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto" style={{ background: '#0c0c0d' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2e2e35' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Activity size={18} style={{ color: '#8b5cf6' }} />
          <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Pulse</h1>
          {counts.actionable > 0 && (
            <span
              className="text-xs rounded-full px-2 py-0.5"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
            >
              {counts.actionable} actionable
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: '#5a5a72' }}>
          Everything your second brain needs clarification on — in one place.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-6">
        {counts.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={36} style={{ color: '#2e2e35', marginBottom: 12 }} />
            <p className="text-sm font-medium" style={{ color: '#5a5a72' }}>Your second brain is up to speed</p>
            <p className="text-xs mt-1" style={{ color: '#3d3d47' }}>
              As you capture more notes, items needing your attention will surface here.
            </p>
          </div>
        ) : (
          <>
            {/* Blockers */}
            <PulseSection icon={AlertOctagon} title="Blockers" count={counts.blockers} accentColor="#f43f5e">
              {blockerItems.map((item, i) => (
                <PulseItem key={`b-${i}`} onClick={() => navigateToEntity(item.entityType)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EntityChip label={item.entityLabel} entityType={item.entityType} />
                    </div>
                    <p className="text-sm" style={{ color: '#e8e8f0' }}>{item.blocker}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: '#3d3d47', flexShrink: 0, marginTop: 2 }} />
                </PulseItem>
              ))}
            </PulseSection>

            {/* Tensions */}
            <PulseSection icon={AlertTriangle} title="Tensions" count={counts.tensions} accentColor="#f43f5e">
              {pendingTensions.map(t => (
                <PulseItem key={t.id} onClick={() => setView('tensions')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}
                      >
                        {t.entityLabel}
                      </span>
                      <span className="text-xs truncate" style={{ color: '#9090a8' }}>
                        {t.conflictDescription}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="rounded px-2 py-1" style={{ background: 'rgba(244,63,94,0.06)' }}>
                        <span className="text-xs font-semibold" style={{ color: '#f43f5e' }}>Was </span>
                        <span className="text-xs" style={{ color: '#c4a0a8' }}>{t.existingFact}</span>
                      </div>
                      <div className="rounded px-2 py-1" style={{ background: 'rgba(20,184,166,0.06)' }}>
                        <span className="text-xs font-semibold" style={{ color: '#14b8a6' }}>Now </span>
                        <span className="text-xs" style={{ color: '#9adbd5' }}>{t.newFact}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: '#3d3d47', flexShrink: 0, marginTop: 2 }} />
                </PulseItem>
              ))}
            </PulseSection>

            {/* Open Questions */}
            <PulseSection icon={HelpCircle} title="Open Questions" count={counts.openQuestions} accentColor="#f59e0b">
              {questionItems.map((item, i) => (
                <PulseItem key={`q-${i}`} onClick={() => navigateToEntity(item.entityType)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EntityChip label={item.entityLabel} entityType={item.entityType} />
                    </div>
                    <p className="text-sm" style={{ color: '#e8e8f0' }}>{item.question}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: '#3d3d47', flexShrink: 0, marginTop: 2 }} />
                </PulseItem>
              ))}
            </PulseSection>

            {/* Blindspots */}
            <PulseSection icon={EyeOff} title="Blindspots" count={counts.blindspots} accentColor="#8b5cf6" defaultOpen={false}>
              {blindspotItems.map((item, i) => (
                <PulseItem key={`bs-${i}`} onClick={() => navigateToEntity()}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs rounded-full px-2 py-0.5 font-medium"
                        style={{
                          background: `${BLINDSPOT_COLORS[item.category] ?? '#9090a8'}15`,
                          color: BLINDSPOT_COLORS[item.category] ?? '#9090a8',
                        }}
                      >
                        {item.category}
                      </span>
                      {item.entityLabel && (
                        <span className="text-xs" style={{ color: '#5a5a72' }}>{item.entityLabel}</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#e8e8f0' }}>{item.gap}</p>
                    <p className="text-xs mt-1" style={{ color: '#14b8a6' }}>→ {item.suggestion}</p>
                  </div>
                </PulseItem>
              ))}
            </PulseSection>

            {/* Sparse / Stale */}
            <PulseSection icon={Ghost} title="Needs More Context" count={counts.sparse} accentColor="#5a5a72" defaultOpen={false}>
              {sparseItems.map(node => {
                const daysSince = node.metadata?.lastMentionedAt
                  ? Math.floor((Date.now() - new Date(node.metadata.lastMentionedAt).getTime()) / 86400000)
                  : null
                return (
                  <PulseItem key={node.id} onClick={() => navigateToEntity(node.entityType)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <EntityChip label={node.label} entityType={node.entityType} />
                        <span className="text-xs" style={{ color: '#5a5a72' }}>
                          {node.noteIds.length} note{node.noteIds.length !== 1 ? 's' : ''}
                        </span>
                        {daysSince !== null && daysSince > 30 && (
                          <span className="text-xs" style={{ color: '#f43f5e' }}>
                            {daysSince}d ago
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: '#3d3d47', flexShrink: 0, marginTop: 2 }} />
                  </PulseItem>
                )
              })}
            </PulseSection>
          </>
        )}
      </div>
    </div>
  )
}
