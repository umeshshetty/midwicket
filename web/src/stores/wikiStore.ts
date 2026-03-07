import { create } from 'zustand'
import type { EntityType } from '../types'

interface WikiStore {
  selectedEntityId: string | null
  searchQuery: string
  entityTypeFilter: EntityType | 'all'
  setSelectedEntity: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setEntityTypeFilter: (filter: EntityType | 'all') => void
}

export const useWikiStore = create<WikiStore>((set) => ({
  selectedEntityId: null,
  searchQuery: '',
  entityTypeFilter: 'all',
  setSelectedEntity: (id) => set({ selectedEntityId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setEntityTypeFilter: (filter) => set({ entityTypeFilter: filter }),
}))
