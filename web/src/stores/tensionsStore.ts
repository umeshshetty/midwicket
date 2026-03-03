import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Tension } from '../types'

interface TensionsStore {
  tensions: Tension[]

  addTension: (data: Omit<Tension, 'id' | 'createdAt' | 'isDismissed'>) => void
  dismissTension: (id: string) => void
  pendingCount: () => number
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
        }
        // Prepend so newest appears first
        set(s => ({ tensions: [tension, ...s.tensions] }))
      },

      dismissTension: (id) => {
        set(s => ({
          tensions: s.tensions.map(t => (t.id === id ? { ...t, isDismissed: true } : t)),
        }))
      },

      pendingCount: () => get().tensions.filter(t => !t.isDismissed).length,
    }),
    {
      name: 'midwicket-tensions',
      version: 1,
    }
  )
)
