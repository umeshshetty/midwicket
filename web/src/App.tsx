import { useEffect, useCallback, Component, type ReactNode } from 'react'
import { useUIStore } from './stores/uiStore'
import { useUserStore } from './stores/userStore'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import QuickCapture from './components/capture/QuickCapture'
import NoteList from './components/notes/NoteList'
import NoteEditor from './components/notes/NoteEditor'
import ChatPanel from './components/chat/ChatPanel'
import SearchView from './components/search/SearchView'
import GraphView from './components/graph/GraphView'
import RemindersView from './components/reminders/RemindersView'
import PeopleView from './components/people/PeopleView'
import WorkView from './components/work/WorkView'
import TensionsView from './components/tensions/TensionsView'
import SieveView from './components/sieve/SieveView'
import WikiView from './components/wiki/WikiView'
import CollisionsView from './components/collisions/CollisionsView'
import PulseView from './components/pulse/PulseView'
import HomeView from './components/home/HomeView'
import AssemblyView from './components/assembly/AssemblyView'
import FocusBanner from './components/shared/FocusBanner'

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: '#0c0c0d',
            color: '#e8e8f0',
            fontFamily: 'Inter, sans-serif',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>Something went wrong</div>
          <p style={{ color: '#9090a8', fontSize: 14, maxWidth: 500, lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Reload App
          </button>
          <button
            onClick={() => {
              const keys = Object.keys(localStorage).filter(k => k.startsWith('midwicket-'))
              keys.forEach(k => localStorage.removeItem(k))
              window.location.reload()
            }}
            style={{
              marginTop: 12,
              padding: '8px 20px',
              background: 'transparent',
              color: '#f43f5e',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Reset All Data & Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

function AppContent() {
  const { view, isChatOpen, isProfileOpen, closeProfile, setSearchQuery } = useUIStore()
  const isOnboarded = useUserStore(s => s.isOnboarded())

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ⌘K → open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchQuery('')
    }
  }, [setSearchQuery])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOnboarded) {
    return <OnboardingFlow />
  }

  return (
    <div
      className="flex h-full"
      style={{ background: '#0c0c0d' }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <TopBar />

        {/* Content + Chat */}
        <div className="flex flex-1 min-h-0">

          {/* Main panel */}
          <main className="flex flex-col flex-1 min-w-0">
            <FocusBanner />
            {view === 'home' && (
              <HomeView />
            )}
            {view === 'pulse' && (
              <PulseView />
            )}
            {view === 'inbox' && (
              <>
                <QuickCapture />
                <NoteList />
              </>
            )}
            {view === 'note' && (
              <NoteEditor />
            )}
            {view === 'search' && (
              <SearchView />
            )}
            {view === 'graph' && (
              <GraphView />
            )}
            {view === 'reminders' && (
              <RemindersView />
            )}
            {view === 'people' && (
              <PeopleView />
            )}
            {view === 'work' && (
              <WorkView />
            )}
            {view === 'tensions' && (
              <TensionsView />
            )}
            {view === 'wiki' && (
              <WikiView />
            )}
            {view === 'collisions' && (
              <CollisionsView />
            )}
            {view === 'sieve' && (
              <SieveView />
            )}
            {view === 'assembly' && (
              <AssemblyView />
            )}
          </main>

          {/* AI Chat panel (collapsible) */}
          {isChatOpen && <ChatPanel />}
        </div>
      </div>

      {/* Profile editor overlay */}
      {isProfileOpen && (
        <OnboardingFlow isEditing onClose={closeProfile} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
