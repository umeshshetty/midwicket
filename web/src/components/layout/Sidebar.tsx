import { Home, Inbox, Search, GitFork, Bell, Settings, Brain, ChevronLeft, ChevronRight, Users, Briefcase, AlertTriangle, Filter, BookOpen, Zap, Activity, FileStack } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useNotesStore } from '../../stores/notesStore'
import { useRemindersStore } from '../../stores/remindersStore'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { usePulseCounts } from '../../lib/pulse'
import { useCognitiveDebt } from '../../lib/cognitiveDebt'
import type { View } from '../../types'

interface NavItem {
  id: View
  label: string
  icon: React.ElementType
  badge?: number
  hint?: string  // tooltip description
}

export default function Sidebar() {
  const { view, setView, isSidebarCollapsed, toggleSidebar, openProfile } = useUIStore()
  const notes = useNotesStore(s => s.notes)
  const pendingReminders = useRemindersStore(s => s.pendingCount())
  const graphNodes = useGraphStore(s => s.nodes)

  const peopleCount = graphNodes.filter(n => n.type === 'entity' && n.entityType === 'person').length
  const workCount = graphNodes.filter(n => n.type === 'entity' && (n.entityType === 'project' || n.entityType === 'organization')).length
  const tensionCount = useTensionsStore(s => s.pendingCount())
  const wikiCount = graphNodes.filter(n => n.type === 'entity' && n.metadata?.wiki).length
  const pulseCount = usePulseCounts().actionable
  const debt = useCognitiveDebt()

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, hint: 'Your daily briefing' },
    { id: 'pulse', label: 'Attention', icon: Activity, badge: pulseCount || undefined, hint: 'Things that need your input' },
    { id: 'inbox', label: 'Notes', icon: Inbox, badge: notes.length, hint: 'All your captured thoughts' },
    { id: 'search', label: 'Search', icon: Search, hint: 'Find anything' },
    { id: 'graph', label: 'Connections', icon: GitFork, hint: 'How your ideas link together' },
    { id: 'wiki', label: 'Knowledge', icon: BookOpen, badge: wikiCount || undefined, hint: 'Auto-generated summaries' },
    { id: 'assembly', label: 'Compose', icon: FileStack, hint: 'Build outlines from your knowledge' },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: pendingReminders || undefined, hint: 'Tasks and deadlines' },
    { id: 'people', label: 'People', icon: Users, badge: peopleCount || undefined, hint: 'Everyone mentioned in your notes' },
    { id: 'work', label: 'Projects', icon: Briefcase, badge: workCount || undefined, hint: 'Projects and organizations' },
    { id: 'tensions', label: 'Conflicts', icon: AlertTriangle, badge: tensionCount || undefined, hint: 'When your notes contradict' },
    { id: 'collisions', label: 'Sparks', icon: Zap, hint: 'Unexpected connections between ideas' },
    { id: 'sieve', label: 'Brain Dump', icon: Filter, hint: 'Unload and sort your thoughts' },
  ]

  return (
    <aside
      className="flex flex-col border-r transition-all duration-200"
      style={{
        width: isSidebarCollapsed ? 56 : 220,
        background: '#131315',
        borderColor: '#2e2e35',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-3 py-4 border-b"
        style={{ borderColor: '#2e2e35', height: 56 }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)',
          }}
        >
          <Brain size={18} color="white" />
        </div>
        {!isSidebarCollapsed && (
          <span className="font-semibold text-sm tracking-tight" style={{ color: '#e8e8f0' }}>
            Midwicket
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.hint}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 w-full text-left"
              style={{
                background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                color: isActive ? '#8b5cf6' : '#9090a8',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLElement).style.color = '#e8e8f0'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#9090a8'
                }
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="text-xs rounded-full px-1.5 py-0.5 font-medium"
                      style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', minWidth: 20, textAlign: 'center' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Cognitive Debt Meter */}
      {debt.score > 0 && (
        <div className="px-3 py-2" title={`Cognitive debt: ${debt.score}/100 (${debt.level})`}>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: '#1a1a1d' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${debt.score}%`,
                background: debt.level === 'low' ? '#22c55e'
                  : debt.level === 'moderate' ? '#f59e0b'
                  : '#f43f5e',
              }}
            />
          </div>
          {!isSidebarCollapsed && (
            <p className="text-[10px] mt-1" style={{ color: '#3d3d47' }}>
              {debt.level === 'low' ? 'Clear mind' : debt.level === 'moderate' ? 'Some open loops' : 'High cognitive load'}
            </p>
          )}
        </div>
      )}

      {/* Bottom: settings + collapse */}
      <div className="p-2 border-t flex flex-col gap-1" style={{ borderColor: '#2e2e35' }}>
        <button
          onClick={openProfile}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left"
          style={{ color: '#9090a8' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLElement).style.color = '#e8e8f0'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#9090a8'
          }}
        >
          <Settings size={18} style={{ flexShrink: 0 }} />
          {!isSidebarCollapsed && <span>Settings</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#9090a8'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#5a5a72'
          }}
        >
          {isSidebarCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
