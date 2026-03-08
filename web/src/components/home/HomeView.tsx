import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Sun, Moon, Sunrise, Sunset, Plus, Brain,
  AlertTriangle, Zap, Sparkles, MessageCircleQuestion,
  ArrowRight, ChevronRight, Filter, CornerDownRight,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useUserStore } from '../../stores/userStore'
import { useNotesStore } from '../../stores/notesStore'
import { useRemindersStore } from '../../stores/remindersStore'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useSieveStore } from '../../stores/sieveStore'
import { useCollisionStore } from '../../stores/collisionStore'
import { useUIStore } from '../../stores/uiStore'
import { computeDecayScore } from '../../lib/decay'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(name: string): { text: string; sub: string; Icon: React.ElementType } {
  const hour = new Date().getHours()
  if (hour < 5) return { text: `Still at it, ${name}?`, sub: 'Your brain never sleeps.', Icon: Moon }
  if (hour < 12) return { text: `Good morning, ${name}`, sub: 'What\'s on your mind today?', Icon: Sunrise }
  if (hour < 17) return { text: `Good afternoon, ${name}`, sub: 'Let\'s keep the momentum going.', Icon: Sun }
  if (hour < 21) return { text: `Good evening, ${name}`, sub: 'Time to think clearly.', Icon: Sunset }
  return { text: `Evening, ${name}`, sub: 'Quiet hours are for deep thinking.', Icon: Moon }
}

function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function HomeView() {
  const profile = useUserStore(s => s.profile)
  const notes = useNotesStore(s => s.notes)
  const addNote = useNotesStore(s => s.addNote)
  const reminders = useRemindersStore(s => s.reminders)
  const graphNodes = useGraphStore(s => s.nodes)
  const tensions = useTensionsStore(s => s.tensions)
  const sieveDumps = useSieveStore(s => s.dumps)
  const collisions = useCollisionStore(s => s.collisions)
  const setView = useUIStore(s => s.setView)

  const [captureText, setCaptureText] = useState('')
  const [captureExpanded, setCaptureExpanded] = useState(false)
  const captureRef = useRef<HTMLTextAreaElement>(null)

  const name = profile?.name?.split(' ')[0] ?? 'there'
  const greeting = getGreeting(name)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // ── Focus capture on mount ────────────────────────────────────────────
  useEffect(() => {
    // Small delay so the fade-in animation plays first
    const t = setTimeout(() => captureRef.current?.focus(), 600)
    return () => clearTimeout(t)
  }, [])

  // ── 1. Pulse: Decaying ideas worth resurfacing ────────────────────────

  const pulseItems = useMemo(() => {
    const now = Date.now()
    return graphNodes
      .filter(n => {
        if (n.type !== 'entity' || n.noteIds.length < 1) return false
        const lastMentioned = n.metadata?.lastMentionedAt
        if (!lastMentioned) return true
        const daysSince = (now - new Date(lastMentioned).getTime()) / 86400000
        return daysSince >= 3
      })
      .map(n => {
        const noteUpdates = n.noteIds
          .map(id => notes.find(note => note.id === id)?.updatedAt)
          .filter(Boolean) as string[]
        const latestUpdate = noteUpdates.sort().pop() ?? n.createdAt
        const score = computeDecayScore(n.noteIds[0], latestUpdate, graphNodes)
        return { node: n, score, latestUpdate }
      })
      .filter(item => item.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [graphNodes, notes])

  // ── 2. One high-impact tension OR profile question ────────────────────

  const topChallenge = useMemo(() => {
    // First, try an unresolved tension
    const pendingTension = tensions.find(t => !t.isDismissed && !t.isReconciled)
    if (pendingTension) {
      return {
        type: 'tension' as const,
        tension: pendingTension,
      }
    }

    // Fallback: a profile question (blindspot)
    const profileQ = graphNodes
      .filter(n => n.type === 'entity' && n.metadata?.profileQuestions?.length)
      .flatMap(n => n.metadata!.profileQuestions!
        .filter(q => !q.isDismissed && !q.answeredNoteId)
        .map(q => ({ ...q, nodeSummary: n.metadata?.summary }))
      )
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      })[0]

    if (profileQ) {
      return {
        type: 'question' as const,
        question: profileQ,
      }
    }

    return null
  }, [tensions, graphNodes])

  // ── 3. Daily collision (most recent not bookmarked) ───────────────────

  const dailyCollision = useMemo(() => {
    return collisions.find(c => !c.isBookmarked) ?? collisions[0] ?? null
  }, [collisions])

  // ── 4. Unprocessed sieve items ────────────────────────────────────────

  const unprocessedSieve = useMemo(() => {
    // Find most recent dump that has items NOT yet converted to notes
    for (const dump of sieveDumps) {
      const pending = [
        ...dump.actionable.filter(i => !i.noteId),
        ...dump.incubating.filter(i => !i.noteId),
        ...dump.questions.filter(i => !i.noteId),
      ]
      if (pending.length > 0) {
        return { dump, pending: pending.slice(0, 3), totalPending: pending.length }
      }
    }
    return null
  }, [sieveDumps])

  // ── 5. Overdue reminders (subtle, not primary) ────────────────────────

  const overdueReminders = useMemo(
    () => reminders
      .filter(r => !r.isDone && r.parsedDate && r.parsedDate < todayStr)
      .sort((a, b) => (a.parsedDate! > b.parsedDate! ? 1 : -1))
      .slice(0, 2),
    [reminders, todayStr]
  )

  // ── Quick Capture handler ─────────────────────────────────────────────

  function handleCapture() {
    const text = captureText.trim()
    if (!text) return
    addNote({
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      }),
      plainText: text,
      title: text.split('\n')[0]?.slice(0, 80) ?? 'Untitled',
      sourceType: 'text',
    })
    setCaptureText('')
    setCaptureExpanded(false)
  }

  // ── Has any content at all? ───────────────────────────────────────────
  const hasContent = pulseItems.length > 0 || topChallenge || dailyCollision || unprocessedSieve || overdueReminders.length > 0

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto" style={{ background: '#0c0c0d' }}>
      <div className="max-w-xl mx-auto w-full px-6 py-8 space-y-0">

        {/* ── 1. Zero-Click Capture ─────────────────────────────────── */}
        <Section delay={0}>
          <div className="mb-10">
            {/* Subtle greeting */}
            <div className="flex items-baseline gap-3 mb-1">
              <greeting.Icon size={16} style={{ color: '#f59e0b', opacity: 0.6 }} />
              <h1 className="text-lg font-medium" style={{ color: '#e8e8f0' }}>
                {greeting.text}
              </h1>
            </div>
            <p className="text-sm mb-6 ml-7" style={{ color: '#3d3d47' }}>
              {greeting.sub} <span style={{ color: '#2e2e35' }}>{format(new Date(), 'EEEE, MMMM d')}</span>
            </p>

            {/* The capture area: the main event */}
            <div
              className="rounded-2xl transition-all duration-300"
              style={{
                background: '#111113',
                border: captureExpanded ? '1px solid rgba(139,92,246,0.3)' : '1px solid #1a1a1d',
                boxShadow: captureExpanded
                  ? '0 0 0 1px rgba(139,92,246,0.1), 0 8px 40px rgba(0,0,0,0.3)'
                  : '0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              <textarea
                ref={captureRef}
                value={captureText}
                onChange={e => setCaptureText(e.target.value)}
                onFocus={() => setCaptureExpanded(true)}
                onBlur={() => { if (!captureText.trim()) setCaptureExpanded(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCapture()
                }}
                placeholder="What's on your mind?"
                rows={captureExpanded ? 4 : 2}
                className="w-full bg-transparent text-sm resize-none outline-none px-5 pt-4 pb-2"
                style={{ color: '#e8e8f0', lineHeight: 1.7 }}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[11px]" style={{ color: '#2e2e35' }}>
                  {captureExpanded ? '⌘+Enter to save' : ''}
                </span>
                <button
                  onClick={handleCapture}
                  disabled={!captureText.trim()}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: captureText.trim() ? '#8b5cf6' : 'transparent',
                    color: captureText.trim() ? 'white' : '#2e2e35',
                  }}
                >
                  <Plus size={13} />
                  Capture
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* If there's nothing to show yet, show a gentle nudge */}
        {!hasContent && (
          <Section delay={300}>
            <div className="flex flex-col items-center text-center py-12">
              <Brain size={32} style={{ color: '#1e1e22' }} />
              <p className="text-sm mt-4" style={{ color: '#3d3d47' }}>
                Your second brain is empty.
              </p>
              <p className="text-xs mt-1" style={{ color: '#2e2e35' }}>
                Start capturing thoughts, and I'll begin connecting them.
              </p>
            </div>
          </Section>
        )}

        {/* ── Overdue reminders (urgent, compact) ───────────────────── */}
        {overdueReminders.length > 0 && (
          <Section delay={200}>
            <div className="mb-8">
              {overdueReminders.map(r => (
                <button
                  key={r.id}
                  onClick={() => setView('reminders')}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 mb-1.5 transition-colors text-left"
                  style={{
                    background: 'rgba(244,63,94,0.04)',
                    border: '1px solid rgba(244,63,94,0.1)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.04)')}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f43f5e' }} />
                  <span className="text-sm flex-1" style={{ color: '#e8e8f0' }}>
                    {r.action}
                  </span>
                  <span className="text-[11px] flex-shrink-0" style={{ color: '#f43f5e' }}>
                    overdue
                  </span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ── 2. The Pulse: Ambient Resurfacing ─────────────────────── */}
        {pulseItems.length > 0 && (
          <Section delay={400}>
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles size={14} style={{ color: '#a78bfa' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5a5a72' }}>
                  From your memory
                </span>
              </div>
              <div className="space-y-1.5">
                {pulseItems.map(({ node, latestUpdate }) => {
                  const entityColors: Record<string, string> = {
                    person: '#14b8a6', project: '#f59e0b', concept: '#8b5cf6',
                    technology: '#3b82f6', organization: '#f97316', idea: '#e879f9',
                    place: '#22c55e', event: '#f43f5e',
                  }
                  const color = entityColors[node.entityType ?? ''] ?? '#8b5cf6'
                  return (
                    <button
                      key={node.id}
                      onClick={() => setView('wiki')}
                      className="w-full flex items-start gap-3.5 rounded-xl px-4 py-3.5 transition-all duration-200 text-left group"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-1 rounded-full flex-shrink-0 mt-1"
                        style={{ height: 32, background: `${color}40` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
                            {node.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${color}12`, color }}>
                            {node.entityType}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#5a5a72' }}>
                          {node.metadata?.summary?.slice(0, 120)
                            ?? node.metadata?.wiki?.slice(0, 120)
                            ?? `${node.noteIds.length} note${node.noteIds.length > 1 ? 's' : ''} · last active ${timeAgo(latestUpdate)}`}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#3d3d47' }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ── 3. One High-Impact Challenge ──────────────────────────── */}
        {topChallenge && (
          <Section delay={600}>
            <div className="mb-10">
              {topChallenge.type === 'tension' ? (
                <button
                  onClick={() => setView('tensions')}
                  className="w-full rounded-2xl p-5 text-left transition-all duration-200 group"
                  style={{
                    background: 'rgba(245,158,11,0.03)',
                    border: '1px solid rgba(245,158,11,0.1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.1)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                      Tension
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: '#e8e8f0' }}>
                    You recently wrote: <em style={{ color: '#f59e0b' }}>"{topChallenge.tension.newFact}"</em>
                  </p>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#9090a8' }}>
                    But earlier you established: <em>"{topChallenge.tension.existingFact}"</em>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                      How do you reconcile this?
                    </span>
                    <ArrowRight size={12} style={{ color: '#f59e0b' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setView('pulse')}
                  className="w-full rounded-2xl p-5 text-left transition-all duration-200 group"
                  style={{
                    background: 'rgba(20,184,166,0.03)',
                    border: '1px solid rgba(20,184,166,0.1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(20,184,166,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(20,184,166,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(20,184,166,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(20,184,166,0.1)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircleQuestion size={14} style={{ color: '#14b8a6' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#14b8a6' }}>
                      Your brain wants to know
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: '#e8e8f0' }}>
                    {topChallenge.question.question}
                  </p>
                  <p className="text-xs mb-3" style={{ color: '#5a5a72' }}>
                    Re: <span style={{ color: '#14b8a6' }}>{topChallenge.question.entityLabel}</span>
                    {topChallenge.question.reason && <> — {topChallenge.question.reason}</>}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: '#14b8a6' }}>
                      Answer this
                    </span>
                    <ArrowRight size={12} style={{ color: '#14b8a6' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )}
            </div>
          </Section>
        )}

        {/* ── 4. Daily Collision (Forced Serendipity) ───────────────── */}
        {dailyCollision && (
          <Section delay={800}>
            <div className="mb-10">
              <button
                onClick={() => setView('collisions')}
                className="w-full rounded-2xl p-5 text-left transition-all duration-200 group"
                style={{
                  background: 'rgba(139,92,246,0.03)',
                  border: '1px solid rgba(139,92,246,0.1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.1)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: '#8b5cf6' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
                    Collision
                  </span>
                </div>

                {/* Entity pair */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
                    {dailyCollision.nodeA.label}
                  </span>
                  <Zap size={10} style={{ color: '#5a5a72' }} />
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}>
                    {dailyCollision.nodeB.label}
                  </span>
                </div>

                <p className="text-sm italic leading-relaxed mb-1" style={{ color: '#e8e8f0' }}>
                  "{dailyCollision.provocativeQuestion}"
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#5a5a72' }}>
                  {dailyCollision.connection.slice(0, 150)}
                </p>
              </button>
            </div>
          </Section>
        )}

        {/* ── 5. Unprocessed Sieve Items ─────────────────────────────── */}
        {unprocessedSieve && (
          <Section delay={1000}>
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-3">
                <Filter size={14} style={{ color: '#a3e635' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5a5a72' }}>
                  From your last brain dump
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(163,230,53,0.12)', color: '#a3e635' }}>
                  {unprocessedSieve.totalPending} ready
                </span>
              </div>

              <div className="space-y-1">
                {unprocessedSieve.pending.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setView('sieve')}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-colors text-left"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <CornerDownRight size={12} style={{ color: '#3d3d47', flexShrink: 0 }} />
                    <span className="text-sm flex-1 truncate" style={{ color: '#9090a8' }}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>

              {unprocessedSieve.totalPending > 3 && (
                <button
                  onClick={() => setView('sieve')}
                  className="flex items-center gap-1.5 text-xs mt-2 ml-4 transition-colors"
                  style={{ color: '#3d3d47' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#a3e635')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#3d3d47')}
                >
                  See all {unprocessedSieve.totalPending} items <ArrowRight size={11} />
                </button>
              )}
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}
