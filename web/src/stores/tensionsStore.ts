import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Tension } from '../types'

interface TensionsStore {
  tensions: Tension[]

  addTension: (data: Omit<Tension, 'id' | 'createdAt' | 'isDismissed' | 'isReconciled'>) => void
  dismissTension: (id: string) => void
  reconcileTension: (id: string, noteId: string) => void
  pendingCount: () => number
  getTopPendingTensions: (limit?: number) => Tension[]
}

export const useTensionsStore = create<TensionsStore>()(
  persist(
    (set, get) => ({
      tensions: [],

      addTension: (data) => {
        // Deduplicate: skip if same entityLabel + existingFact already exists (undismissed)
        const duplicate = get().tensions.find(
          t =>
            !t.isDismissed &&
            t.entityLabel.toLowerCase() === data.entityLabel.toLowerCase() &&
            t.existingFact.toLowerCase() === data.existingFact.toLowerCase()
        )
        if (duplicate) return

        const tension: Tension = {
          id: uuidv4(),
          ...data,
          createdAt: new Date().toISOString(),
          isDismissed: false,
          isReconciled: false,
        }
        // Prepend so newest appears first
        set(s => ({ tensions: [tension, ...s.tensions] }))
      },

      dismissTension: (id) => {
        set(s => ({
          tensions: s.tensions.map(t => (t.id === id ? { ...t, isDismissed: true } : t)),
        }))
      },

      reconcileTension: (id, noteId) => {
        set(s => ({
          tensions: s.tensions.map(t =>
            t.id === id ? { ...t, isReconciled: true, reconcileNoteId: noteId } : t
          ),
        }))
      },

      pendingCount: () => get().tensions.filter(t => !t.isDismissed && !t.isReconciled).length,

      getTopPendingTensions: (limit = 2) => {
        return get().tensions
          .filter(t => !t.isDismissed && !t.isReconciled)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit)
      },
    }),
    {
      name: 'midwicket-tensions',
      version: 1,
    }
  )
)
