import { useState, useMemo } from 'react'
import {
  Activity, AlertTriangle, AlertOctagon, HelpCircle, EyeOff, Ghost,
  ChevronDown, ChevronRight, ArrowRight, CheckCircle,
  MessageCircleQuestion, GitMerge, Clock,
} from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useBlindspotStore } from '../../stores/blindspotStore'
import { useUIStore } from '../../stores/uiStore'
import { usePulseCounts } from '../../lib/pulse'
import { useCognitiveDebt } from '../../lib/cognitiveDebt'
import { EntityChip, ProfileQuestionCard } from './shared'
import type { EntityType } from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const THIRTY_DAYS = 30 * 86400000

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

  // Profile questions (active only)
  const profileQuestionItems = useMemo(() =>
    nodes
      .filter(n => n.type === 'entity' && n.metadata?.profileQuestions?.length)
      .flatMap(n => n.metadata!.profileQuestions!
        .filter(q => !q.isDismissed && !q.answeredNoteId)
        .map(q => ({
          ...q,
          nodeId: n.id,
          entityLabel: n.label,
          entityType: n.entityType,
        }))
      )
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      })
      .slice(0, 15),
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

  // Merge suggestions from theme clustering
  const mergeSuggestions = useMemo(() =>
    nodes
      .filter(n => n.type === 'entity' && n.metadata?.mergeSuggestion && !n.metadata.mergeSuggestion.isDismissed)
      .map(n => ({
        sourceNode: n,
        suggestion: n.metadata!.mergeSuggestion!,
        targetNode: nodes.find(t => t.id === n.metadata!.mergeSuggestion!.targetEntityId),
      }))
      .filter(item => item.targetNode != null),
    [nodes]
  )

  // Cognitive debt — adapts section ordering when overloaded
  const debt = useCognitiveDebt()
  const isHighDebt = debt.level === 'high' || debt.level === 'overloaded'

  // Stale projects — active projects with no recent notes (45+ days)
  const FORTY_FIVE_DAYS = 45 * 86400000
  const staleProjects = useMemo(() => {
    const now = Date.now()
    return nodes
      .filter(n => {
        if (n.type !== 'entity' || n.entityType !== 'project') return false
        if (n.metadata?.status && n.metadata.status !== 'active') return false
        if (n.metadata?.staleDismissedAt) return false
        const lastDate = n.metadata?.lastMentionedAt ?? n.createdAt
        return (now - new Date(lastDate).getTime()) > FORTY_FIVE_DAYS
      })
      .map(n => {
        const lastDate = n.metadata?.lastMentionedAt ?? n.createdAt
        const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
        return { node: n, daysSince }
      })
      .sort((a, b) => b.daysSince - a.daysSince)
  }, [nodes])

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

  function handleDismissQuestion(entityId: string, questionId: string) {
    useGraphStore.getState().dismissProfileQuestion(entityId, questionId)
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto" style={{ background: '#0c0c0d' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2e2e35' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Activity size={18} style={{ color: '#8b5cf6' }} />
          <h1 className="font-bold text-sm" style={{ color: '#e8e8f0' }}>Attention</h1>
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
          Things your second brain needs your help with — all in one place.
        </p>
      </div>

      {/* Cognitive Debt Banner */}
      {isHighDebt && (
        <div
          className="mx-6 mt-3 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)' }}
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#f43f5e', animation: 'pulse 2s infinite' }}
          />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: '#f43f5e' }}>
              Cognitive load is {debt.level} — showing quick wins first
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#5a5a72' }}>
              {debt.overdueReminders} overdue · {debt.tensions} tensions · {debt.unprocessedSieve} unprocessed
            </p>
          </div>
        </div>
      )}

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
            <PulseSection icon={AlertTriangle} title="Contradictions" count={counts.tensions} accentColor="#f43f5e">
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

            {/* Profile Questions — Help your brain learn */}
            <PulseSection
              icon={MessageCircleQuestion}
              title="Help Your Brain Learn"
              count={counts.profileQuestions}
              accentColor="#14b8a6"
            >
              {profileQuestionItems.map(item => (
                <ProfileQuestionCard
                  key={item.id}
                  item={item}
                  onDismiss={handleDismissQuestion}
                />
              ))}
            </PulseSection>

            {/* Stale Projects */}
            <PulseSection icon={Clock} title="Neglected Projects" count={staleProjects.length} accentColor="#f97316">
              {staleProjects.map(({ node, daysSince }) => (
                <PulseItem key={node.id}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <EntityChip label={node.label} entityType={node.entityType} />
                      <span className="text-[11px]" style={{ color: '#f97316' }}>
                        {daysSince}d since last mention
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#9090a8' }}>
                      Is this project still active?
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          useGraphStore.getState().patchEntityMetadata(node.id, {
                            staleDismissedAt: new Date().toISOString(),
                          })
                        }}
                        className="text-xs px-3 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,184,166,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(20,184,166,0.1)')}
                      >
                        Still active
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          useGraphStore.getState().patchEntityMetadata(node.id, { status: 'on-hold' })
                        }}
                        className="text-xs px-3 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.1)')}
                      >
                        No longer active
                      </button>
                    </div>
                  </div>
                </PulseItem>
              ))}
            </PulseSection>

            {/* Blindspots */}
            <PulseSection icon={EyeOff} title="Blind Spots" count={counts.blindspots} accentColor="#8b5cf6" defaultOpen={false}>
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
                    <p className="text-xs mt-1" style={{ color: '#14b8a6' }}>{item.suggestion}</p>
                  </div>
                </PulseItem>
              ))}
            </PulseSection>

            {/* Merge Suggestions */}
            <PulseSection icon={GitMerge} title="Possible Duplicates" count={mergeSuggestions.length} accentColor="#e879f9" defaultOpen={false}>
              {mergeSuggestions.map(({ sourceNode, suggestion, targetNode }) => (
                <PulseItem key={sourceNode.id} onClick={() => setView('wiki')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EntityChip label={sourceNode.label} entityType={sourceNode.entityType} />
                      <ArrowRight size={12} style={{ color: '#5a5a72' }} />
                      <EntityChip label={targetNode!.label} entityType={targetNode!.entityType} />
                    </div>
                    <p className="text-xs" style={{ color: '#9090a8' }}>
                      {suggestion.overlapScore}% overlap — {suggestion.reason}
                    </p>
                  </div>
                </PulseItem>
              ))}
            </PulseSection>

            {/* Sparse / Stale */}
            <PulseSection icon={Ghost} title="Underdeveloped" count={counts.sparse} accentColor="#5a5a72" defaultOpen={false}>
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
