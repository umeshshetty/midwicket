import { useState, useMemo } from 'react'
import {
  Sun, Moon, Sunrise, Sunset, ArrowRight, FileText, MessageSquare,
  AlertTriangle, AlertOctagon, Bell, Check, Plus, MessageCircleQuestion,
  Clock, Sparkles,
} from 'lucide-react'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import { useUserStore } from '../../stores/userStore'
import { useNotesStore } from '../../stores/notesStore'
import { useRemindersStore } from '../../stores/remindersStore'
import { useThreadStore } from '../../stores/threadStore'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useUIStore } from '../../stores/uiStore'
import { usePulseCounts } from '../../lib/pulse'
import { computeDecayScore } from '../../lib/decay'
import { EntityChip, ProfileQuestionCard } from '../pulse/shared'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): { text: string; Icon: React.ElementType } {
  const hour = new Date().getHours()
  if (hour < 5) return { text: `Night owl, ${name}`, Icon: Moon }
  if (hour < 12) return { text: `Good morning, ${name}`, Icon: Sunrise }
  if (hour < 17) return { text: `Good afternoon, ${name}`, Icon: Sun }
  if (hour < 21) return { text: `Good evening, ${name}`, Icon: Sunset }
  return { text: `Good evening, ${name}`, Icon: Moon }
}

function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

// ─── Internal Components ─────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, accentColor }: {
  icon: React.ElementType; title: string; accentColor: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} style={{ color: accentColor }} />
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
        {title}
      </span>
    </div>
  )
}

function SectionLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs mt-3 transition-colors"
      style={{ color: '#5a5a72' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#8b5cf6')}
      onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}
    >
      {label} <ArrowRight size={11} />
    </button>
  )
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-xs rounded-full px-2.5 py-1"
      style={{ background: `${color}12`, color }}
    >
      {label}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeView() {
  const profile = useUserStore(s => s.profile)
  const notes = useNotesStore(s => s.notes)
  const addNote = useNotesStore(s => s.addNote)
  const reminders = useRemindersStore(s => s.reminders)
  const toggleDone = useRemindersStore(s => s.toggleDone)
  const threads = useThreadStore(s => s.threads)
  const nodes = useGraphStore(s => s.nodes)
  const tensions = useTensionsStore(s => s.tensions)
  const { setView, openNote, toggleChat } = useUIStore(s => ({
    setView: s.setView, openNote: s.openNote, toggleChat: s.toggleChat,
  }))
  const counts = usePulseCounts()

  const [captureText, setCaptureText] = useState('')

  const name = profile?.name?.split(' ')[0] ?? 'there'
  const greeting = getGreeting(name)

  // ── Derived data ──────────────────────────────────────────────────────────

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const overdueReminders = useMemo(
    () => reminders.filter(r => !r.isDone && r.parsedDate && r.parsedDate < todayStr)
      .sort((a, b) => (a.parsedDate! > b.parsedDate! ? 1 : -1)),
    [reminders, todayStr]
  )

  const todayReminders = useMemo(
    () => reminders.filter(r => !r.isDone && r.parsedDate && r.parsedDate === todayStr),
    [reminders, todayStr]
  )

  const allTodayReminders = useMemo(
    () => [...overdueReminders, ...todayReminders].slice(0, 8),
    [overdueReminders, todayReminders]
  )

  // Attention items: overdue reminders + blockers + tensions (max 5)
  const attentionItems = useMemo(() => {
    const items: Array<{ type: string; text: string; color: string; view: () => void }> = []
    for (const r of overdueReminders.slice(0, 2)) {
      items.push({ type: 'overdue', text: r.action, color: '#f43f5e', view: () => setView('reminders') })
    }
    for (const n of nodes) {
      if (n.type !== 'entity' || !n.metadata?.blockers?.length) continue
      for (const b of n.metadata.blockers) {
        items.push({ type: 'blocker', text: `${n.label}: ${b}`, color: '#f43f5e', view: () => setView('pulse') })
      }
    }
    const pendingTensions = tensions.filter(t => !t.isDismissed && !t.isReconciled)
    for (const t of pendingTensions.slice(0, 2)) {
      items.push({ type: 'tension', text: `${t.entityLabel}: ${t.conflictDescription}`, color: '#f59e0b', view: () => setView('tensions') })
    }
    return items.slice(0, 5)
  }, [overdueReminders, nodes, tensions, setView])

  // Recent threads
  const recentThreads = useMemo(
    () => threads.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()).slice(0, 3),
    [threads]
  )

  // Active projects
  const activeProjects = useMemo(
    () => nodes
      .filter(n => n.type === 'entity' && n.entityType === 'project' && n.metadata?.status === 'active')
      .slice(0, 3),
    [nodes]
  )

  // Profile questions (top 3)
  const profileQuestionItems = useMemo(() =>
    nodes
      .filter(n => n.type === 'entity' && n.metadata?.profileQuestions?.length)
      .flatMap(n => n.metadata!.profileQuestions!
        .filter(q => !q.isDismissed && !q.answeredNoteId)
        .map(q => ({ ...q, nodeId: n.id, entityLabel: n.label, entityType: n.entityType }))
      )
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      })
      .slice(0, 3),
    [nodes]
  )

  // Recent notes
  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [notes]
  )

  // Ambient resurfacing: entities with high value (many connections) but decaying (not recently mentioned)
  const resurfacingItems = useMemo(() => {
    const MIN_NOTES = 2
    const MAX_RECENCY_DAYS = 3 // Skip entities mentioned in last 3 days
    const now = Date.now()
    return nodes
      .filter(n => {
        if (n.type !== 'entity' || n.noteIds.length < MIN_NOTES) return false
        const lastMentioned = n.metadata?.lastMentionedAt
        if (!lastMentioned) return true // Never has a date → definitely resurfaceable
        const daysSince = (now - new Date(lastMentioned).getTime()) / 86400000
        return daysSince >= MAX_RECENCY_DAYS
      })
      .map(n => {
        // Use the most recent note's updatedAt for decay score
        const noteUpdates = n.noteIds
          .map(id => notes.find(note => note.id === id)?.updatedAt)
          .filter(Boolean) as string[]
        const latestUpdate = noteUpdates.sort().pop() ?? n.createdAt
        const score = computeDecayScore(n.noteIds[0], latestUpdate, nodes)
        return { node: n, score }
      })
      .filter(item => item.score > 0.3) // Only surface items with meaningful value
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [nodes, notes])

  const hasPickUp = recentThreads.length > 0 || activeProjects.length > 0

  // ── Quick Capture ─────────────────────────────────────────────────────────

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
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto" style={{ background: '#0c0c0d' }}>
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">

        {/* ── Section 1: Greeting + Stats ──────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <greeting.Icon size={20} style={{ color: '#f59e0b' }} />
            <h1 className="text-xl font-semibold" style={{ color: '#e8e8f0' }}>
              {greeting.text}
            </h1>
          </div>
          <p className="text-sm mb-4" style={{ color: '#5a5a72' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex flex-wrap gap-2">
            <StatChip label={`${notes.length} note${notes.length !== 1 ? 's' : ''}`} color="#8b5cf6" />
            {allTodayReminders.length > 0 && (
              <StatChip label={`${allTodayReminders.length} due today`} color="#f59e0b" />
            )}
            {counts.actionable > 0 && (
              <StatChip label={`${counts.actionable} need attention`} color="#f43f5e" />
            )}
          </div>
        </div>

        {/* ── Section 2: Needs Your Attention ──────────────────────────────── */}
        {attentionItems.length > 0 && (
          <div>
            <SectionHeader icon={AlertOctagon} title="Needs Your Attention" accentColor="#f43f5e" />
            <div className="space-y-1">
              {attentionItems.map((item, i) => (
                <button
                  key={i}
                  onClick={item.view}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-sm flex-1 truncate" style={{ color: '#e8e8f0' }}>
                    {item.text}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#5a5a72' }}>
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
            <SectionLink label="View all in Pulse" onClick={() => setView('pulse')} />
          </div>
        )}

        {/* ── Section 3: Pick Up Where You Left Off ────────────────────────── */}
        {hasPickUp && (
          <div>
            <SectionHeader icon={MessageSquare} title="Pick Up Where You Left Off" accentColor="#8b5cf6" />
            <div className="space-y-1">
              {recentThreads.map(t => (
                <button
                  key={t.id}
                  onClick={toggleChat}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <MessageSquare size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>{t.topic}</span>
                    {t.summary && (
                      <p className="text-xs truncate" style={{ color: '#5a5a72' }}>{t.summary}</p>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: '#3d3d47' }}>
                    {timeAgo(t.lastActiveAt)}
                  </span>
                </button>
              ))}
              {activeProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setView('work')}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <EntityChip label={p.label} entityType={p.entityType} />
                  <span className="text-xs flex-1 truncate" style={{ color: '#5a5a72' }}>
                    {p.metadata?.summary?.slice(0, 80) ?? p.metadata?.description ?? ''}
                  </span>
                  <ArrowRight size={12} style={{ color: '#3d3d47', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 4: Your Brain Wants to Know ──────────────────────────── */}
        {profileQuestionItems.length > 0 && (
          <div>
            <SectionHeader icon={MessageCircleQuestion} title="Your Brain Wants to Know" accentColor="#14b8a6" />
            <div className="space-y-1.5">
              {profileQuestionItems.map(item => (
                <ProfileQuestionCard
                  key={item.id}
                  item={item}
                  onDismiss={(entityId, questionId) => {
                    useGraphStore.getState().dismissProfileQuestion(entityId, questionId)
                  }}
                />
              ))}
            </div>
            {counts.profileQuestions > 3 && (
              <SectionLink label="See all in Pulse" onClick={() => setView('pulse')} />
            )}
          </div>
        )}

        {/* ── Section 5: Today's Reminders ─────────────────────────────────── */}
        {allTodayReminders.length > 0 && (
          <div>
            <SectionHeader icon={Bell} title="Today's Reminders" accentColor="#f59e0b" />
            <div className="space-y-0.5">
              {allTodayReminders.map(r => {
                const isOverdue = r.parsedDate! < todayStr
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={isOverdue ? { borderLeft: '2px solid #f43f5e' } : {}}
                  >
                    <button
                      onClick={() => toggleDone(r.id)}
                      className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ borderColor: '#3d3d47' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#3d3d47')}
                    >
                      <Check size={10} style={{ color: 'transparent' }} className="group-hover:text-teal-400" />
                    </button>
                    <span className="text-sm flex-1" style={{ color: '#e8e8f0' }}>{r.action}</span>
                    {isOverdue && (
                      <span className="text-xs flex-shrink-0" style={{ color: '#f43f5e' }}>overdue</span>
                    )}
                    {r.parsedDate && isToday(new Date(r.parsedDate + 'T00:00:00')) && (
                      <Clock size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
            <SectionLink label="View all reminders" onClick={() => setView('reminders')} />
          </div>
        )}

        {/* ── Section 6: Recent Captures ───────────────────────────────────── */}
        {recentNotes.length > 0 && (
          <div>
            <SectionHeader icon={FileText} title="Recent Captures" accentColor="#5a5a72" />
            <div className="space-y-0.5">
              {recentNotes.map(n => (
                <button
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: '#e8e8f0' }}>
                      {n.title}
                    </span>
                    <p className="text-xs truncate" style={{ color: '#5a5a72' }}>
                      {n.plainText.slice(0, 80)}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: '#3d3d47' }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))}
            </div>
            <SectionLink label="View all notes" onClick={() => setView('inbox')} />
          </div>
        )}

        {/* ── Section 7: Ambient Resurfacing ──────────────────────────────── */}
        {resurfacingItems.length > 0 && (
          <div>
            <SectionHeader icon={Sparkles} title="Rediscover" accentColor="#a78bfa" />
            <div className="space-y-1">
              {resurfacingItems.map(({ node, score }) => (
                <button
                  key={node.id}
                  onClick={() => setView('wiki')}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <EntityChip label={node.label} entityType={node.entityType} />
                  <span className="text-xs flex-1 truncate" style={{ color: '#5a5a72' }}>
                    {node.metadata?.summary?.slice(0, 60) ?? `${node.noteIds.length} notes`}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}
                  >
                    {node.metadata?.confidence?.level === 'assumption' ? 'assumption' : `${node.noteIds.length} refs`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 8: Quick Capture ─────────────────────────────────────── */}
        <div>
          <div className="flex gap-2">
            <input
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCapture() }}
              placeholder="Capture a thought..."
              className="flex-1 text-sm rounded-xl px-4 py-3 outline-none transition-colors"
              style={{ background: '#1a1a1d', border: '1px solid #2e2e35', color: '#e8e8f0' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#3d3d47')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2e2e35')}
            />
            <button
              onClick={handleCapture}
              disabled={!captureText.trim()}
              className="rounded-xl px-3 py-3 transition-colors flex-shrink-0"
              style={{
                background: captureText.trim() ? '#8b5cf6' : '#1a1a1d',
                color: captureText.trim() ? 'white' : '#5a5a72',
                border: `1px solid ${captureText.trim() ? '#8b5cf6' : '#2e2e35'}`,
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
