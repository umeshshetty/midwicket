import { useEffect, useCallback } from 'react'
import { useUIStore } from './stores/uiStore'
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

export default function App() {
  const { view, isChatOpen, setSearchQuery } = useUIStore()

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
          </main>

          {/* AI Chat panel (collapsible) */}
          {isChatOpen && <ChatPanel />}
        </div>
      </div>
    </div>
  )
}
