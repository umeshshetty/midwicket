import { CheckSquare, Calendar, AlertTriangle, Bell, Trash2, ArrowRight, Check, Clock } from 'lucide-react'
import { format, isToday, isThisWeek } from 'date-fns'
import { useRemindersStore } from '../../stores/remindersStore'
import { useUIStore } from '../../stores/uiStore'
import type { Reminder, ReminderType, ReminderPriority } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeIcon(type: ReminderType) {
  const props = { size: 14 }
  switch (type) {
    case 'task':     return <CheckSquare {...props} style={{ color: '#3b82f6' }} />
    case 'event':    return <Calendar {...props} style={{ color: '#14b8a6' }} />
    case 'deadline': return <AlertTriangle {...props} style={{ color: '#f59e0b' }} />
    case 'reminder': return <Bell {...props} style={{ color: '#8b5cf6' }} />
  }
}

function priorityBadge(priority: ReminderPriority) {
  const styles: Record<ReminderPriority, { bg: string; color: string; label: string }> = {
    high:   { bg: 'rgba(244,63,94,0.12)',  color: '#f43f5e', label: 'High' },
    medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Med' },
    low:    { bg: 'rgba(90,90,114,0.15)',  color: '#9090a8', label: 'Low' },
  }
  const s = styles[priority]
  return (
    <span
      className="text-xs rounded-full px-2 py-0.5 font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function dateLabel(parsedDate: string): string {
  const d = new Date(parsedDate + 'T00:00:00')
  if (isToday(d)) return 'Today'
  if (isThisWeek(d)) return format(d, 'EEEE')
  return format(d, 'MMM d')
}

function groupUpcoming(reminders: Reminder[]): { today: Reminder[]; thisWeek: Reminder[]; later: Reminder[] } {
  const today: Reminder[] = []
  const thisWeek: Reminder[] = []
  const later: Reminder[] = []
  for (const r of reminders) {
    if (!r.parsedDate) continue
    const d = new Date(r.parsedDate + 'T00:00:00')
    if (isToday(d)) today.push(r)
    else if (isThisWeek(d)) thisWeek.push(r)
    else later.push(r)
  }
  return { today, thisWeek, later }
}

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const { toggleDone, deleteReminder } = useRemindersStore()
  const openNote = useUIStore(s => s.openNote)

  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3 group transition-all"
      style={{
        background: reminder.isDone ? 'rgba(255,255,255,0.02)' : '#1a1a1d',
        borderColor: '#2e2e35',
        opacity: reminder.isDone ? 0.5 : 1,
      }}
    >
      {/* Type icon */}
      <div className="flex-shrink-0 mt-0.5">{typeIcon(reminder.type)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-sm font-medium leading-snug"
            style={{
              color: '#e8e8f0',
              textDecoration: reminder.isDone ? 'line-through' : 'none',
            }}
          >
            {reminder.action}
          </span>
          {priorityBadge(reminder.priority)}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {reminder.person && (
            <span className="text-xs" style={{ color: '#14b8a6' }}>
              {reminder.person}
            </span>
          )}
          {reminder.person && (
            <span style={{ color: '#2e2e35' }}>·</span>
          )}
          <span className="text-xs flex items-center gap-1" style={{ color: '#9090a8' }}>
            <Clock size={10} />
            {reminder.parsedDate ? dateLabel(reminder.parsedDate) : reminder.dateText}
          </span>
        </div>
      </div>

      {/* Actions (shown on hover) */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => toggleDone(reminder.id)}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: reminder.isDone ? '#5a5a72' : '#14b8a6' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          title={reminder.isDone ? 'Mark undone' : 'Mark done'}
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => openNote(reminder.noteId)}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#8b5cf6')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
          title="Open source note"
        >
          <ArrowRight size={13} />
        </button>
        <button
          onClick={() => deleteReminder(reminder.id)}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  label,
  reminders,
  borderColor,
}: {
  label: string
  reminders: Reminder[]
  borderColor?: string
}) {
  if (reminders.length === 0) return null
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {borderColor && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: borderColor }} />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
          {label}
        </span>
        <span
          className="text-xs rounded-full px-2 py-0.5"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#9090a8' }}
        >
          {reminders.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {reminders.map(r => (
          <ReminderCard key={r.id} reminder={r} />
        ))}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RemindersView() {
  const { getOverdue, getUpcoming, getUndated, pendingCount } = useRemindersStore()

  const overdue = getOverdue()
  const upcoming = getUpcoming()
  const undated = getUndated()
  const { today, thisWeek, later } = groupUpcoming(upcoming)

  const total = pendingCount()

  if (total === 0 && overdue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div
          className="rounded-full p-4"
          style={{ background: 'rgba(139,92,246,0.1)' }}
        >
          <Bell size={28} style={{ color: '#8b5cf6' }} />
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-1" style={{ color: '#e8e8f0' }}>
            No reminders yet
          </h3>
          <p className="text-sm max-w-xs" style={{ color: '#9090a8' }}>
            Notes with dates and action items will appear here — automatically extracted by AI.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-semibold" style={{ color: '#e8e8f0' }}>
          Reminders
        </h2>
        <p className="text-sm mt-0.5" style={{ color: '#9090a8' }}>
          {total} pending · extracted automatically from your notes
        </p>
      </div>

      <div className="px-4 pb-8">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div
            className="mb-5 rounded-xl border p-4"
            style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f43f5e' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f43f5e' }}>
                Overdue
              </span>
              <span
                className="text-xs rounded-full px-2 py-0.5"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
              >
                {overdue.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {overdue.map(r => <ReminderCard key={r.id} reminder={r} />)}
            </div>
          </div>
        )}

        {/* Upcoming — grouped */}
        <Section label="Today" reminders={today} borderColor="#14b8a6" />
        <Section label="This Week" reminders={thisWeek} borderColor="#8b5cf6" />
        <Section label="Later" reminders={later} />
        <Section label="Undated tasks" reminders={undated} />
      </div>
    </div>
  )
}
