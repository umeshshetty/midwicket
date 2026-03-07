import { create } from 'zustand'
import type { View } from '../types'

interface UIStore {
  view: View
  activeNoteId: string | null
  isChatOpen: boolean
  isSidebarCollapsed: boolean
  searchQuery: string
  isProfileOpen: boolean
  setView: (view: View) => void
  openNote: (id: string) => void
  closeNote: () => void
  toggleChat: () => void
  toggleSidebar: () => void
  setSearchQuery: (q: string) => void
  openProfile: () => void
  closeProfile: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  view: 'home',
  activeNoteId: null,
  isChatOpen: false,
  isSidebarCollapsed: false,
  searchQuery: '',
  isProfileOpen: false,

  setView: (view) => set({ view, activeNoteId: null }),
  openNote: (id) => set({ view: 'note', activeNoteId: id }),
  closeNote: () => set({ view: 'home', activeNoteId: null }),
  toggleChat: () => set(s => ({ isChatOpen: !s.isChatOpen })),
  toggleSidebar: () => set(s => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSearchQuery: (searchQuery) => set({ searchQuery, view: 'search' }),
  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),
}))
