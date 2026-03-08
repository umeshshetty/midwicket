import { create } from 'zustand'
import type { View, FocusContext } from '../types'
import { computeFocusContext } from '../lib/focusFilter'
import { useGraphStore } from './graphStore'

interface UIStore {
  view: View
  activeNoteId: string | null
  isChatOpen: boolean
  isSidebarCollapsed: boolean
  searchQuery: string
  isProfileOpen: boolean
  focusContext: FocusContext | null
  setView: (view: View) => void
  openNote: (id: string) => void
  closeNote: () => void
  toggleChat: () => void
  toggleSidebar: () => void
  setSearchQuery: (q: string) => void
  openProfile: () => void
  closeProfile: () => void
  enterFocus: (entityId: string) => void
  exitFocus: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  view: 'home',
  activeNoteId: null,
  isChatOpen: false,
  isSidebarCollapsed: false,
  searchQuery: '',
  isProfileOpen: false,
  focusContext: null,

  setView: (view) => set({ view, activeNoteId: null }),
  openNote: (id) => set({ view: 'note', activeNoteId: id }),
  closeNote: () => set({ view: 'home', activeNoteId: null }),
  toggleChat: () => set(s => ({ isChatOpen: !s.isChatOpen })),
  toggleSidebar: () => set(s => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSearchQuery: (searchQuery) => set({ searchQuery, view: 'search' }),
  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),
  enterFocus: (entityId) => {
    const { nodes, edges } = useGraphStore.getState()
    const focusContext = computeFocusContext(entityId, nodes, edges)
    set({ focusContext })
  },
  exitFocus: () => set({ focusContext: null }),
}))
