import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssemblyItem, AssemblyOutline } from '../types'

interface AssemblyStore {
  selectedEntities: AssemblyItem[]
  outlines: AssemblyOutline[]
  isGenerating: boolean
  currentOutlineId: string | null

  addEntity: (item: AssemblyItem) => void
  removeEntity: (entityId: string) => void
  clearSelection: () => void
  addOutline: (outline: AssemblyOutline) => void
  setGenerating: (v: boolean) => void
  setCurrentOutline: (id: string | null) => void
  deleteOutline: (id: string) => void
}

export const useAssemblyStore = create<AssemblyStore>()(
  persist(
    (set, get) => ({
      selectedEntities: [],
      outlines: [],
      isGenerating: false,
      currentOutlineId: null,

      addEntity: (item) => {
        const exists = get().selectedEntities.some(e => e.entityId === item.entityId)
        if (exists) return
        set(s => ({ selectedEntities: [...s.selectedEntities, item] }))
      },

      removeEntity: (entityId) => {
        set(s => ({
          selectedEntities: s.selectedEntities.filter(e => e.entityId !== entityId),
        }))
      },

      clearSelection: () => set({ selectedEntities: [], currentOutlineId: null }),

      addOutline: (outline) => {
        set(s => ({
          outlines: [outline, ...s.outlines],
          currentOutlineId: outline.id,
        }))
      },

      setGenerating: (v) => set({ isGenerating: v }),

      setCurrentOutline: (id) => set({ currentOutlineId: id }),

      deleteOutline: (id) => {
        set(s => ({
          outlines: s.outlines.filter(o => o.id !== id),
          currentOutlineId: s.currentOutlineId === id ? null : s.currentOutlineId,
        }))
      },
    }),
    {
      name: 'midwicket-assembly',
      version: 1,
    }
  )
)
