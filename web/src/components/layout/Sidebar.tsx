import { Home, Inbox, Search, GitFork, Bell, Settings, Brain, ChevronLeft, ChevronRight, Users, Briefcase, AlertTriangle, Filter, BookOpen, Zap, Activity } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useNotesStore } from '../../stores/notesStore'
import { useRemindersStore } from '../../stores/remindersStore'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { usePulseCounts } from '../../lib/pulse'
import type { View } from '../../types'

interface NavItem {
  id: View
  label: string
  icon: React.ElementType
  badge?: number
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

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'pulse', label: 'Pulse', icon: Activity, badge: pulseCount || undefined },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: notes.length },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'graph', label: 'Graph', icon: GitFork },
    { id: 'wiki', label: 'Wiki', icon: BookOpen, badge: wikiCount || undefined },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: pendingReminders || undefined },
    { id: 'people', label: 'People', icon: Users, badge: peopleCount || undefined },
    { id: 'work', label: 'Work', icon: Briefcase, badge: workCount || undefined },
    { id: 'tensions', label: 'Tensions', icon: AlertTriangle, badge: tensionCount || undefined },
    { id: 'collisions', label: 'Collisions', icon: Zap },
    { id: 'sieve', label: 'Sieve', icon: Filter },
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
