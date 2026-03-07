import { useEffect, useCallback } from 'react'
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

export default function App() {
  const { view, isChatOpen, isProfileOpen, closeProfile, setSearchQuery } = useUIStore()
  const isOnboarded = useUserStore(s => s.isOnboarded())
  const hasHydrated = useUserStore(s => s._hasHydrated)

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

  // Wait for localStorage hydration before deciding onboarding state
  if (!hasHydrated) {
    return null
  }

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
            {view === 'sieve' && (
              <SieveView />
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
