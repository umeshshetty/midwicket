import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { AuditEntry, AuditActionType, CascadeSuggestion } from '../types'

interface AuditStore {
  entries: AuditEntry[]
  cascadeSuggestions: CascadeSuggestion[]

  addEntry: (entry: Omit<AuditEntry, 'id' | 'createdAt' | 'isUndone'>) => AuditEntry
  undoEntry: (id: string) => AuditEntry | undefined
  getRecentEntries: (limit?: number) => AuditEntry[]

  addCascadeSuggestion: (suggestion: Omit<CascadeSuggestion, 'id' | 'createdAt' | 'isDismissed'>) => void
  dismissCascade: (id: string) => void
  getPendingCascades: () => CascadeSuggestion[]
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      entries: [],
      cascadeSuggestions: [],

      addEntry: (data) => {
        const entry: AuditEntry = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          isUndone: false,
        }
        set(s => ({
          entries: [entry, ...s.entries].slice(0, 200), // cap at 200 entries
        }))
        return entry
      },

      undoEntry: (id) => {
        const entry = get().entries.find(e => e.id === id)
        if (!entry || entry.isUndone) return undefined
        set(s => ({
          entries: s.entries.map(e => (e.id === id ? { ...e, isUndone: true } : e)),
        }))
        return entry
      },

      getRecentEntries: (limit = 20) => {
        return get().entries.slice(0, limit)
      },

      addCascadeSuggestion: (data) => {
        const suggestion: CascadeSuggestion = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          isDismissed: false,
        }
        set(s => ({
          cascadeSuggestions: [suggestion, ...s.cascadeSuggestions],
        }))
      },

      dismissCascade: (id) => {
        set(s => ({
          cascadeSuggestions: s.cascadeSuggestions.map(c =>
            c.id === id ? { ...c, isDismissed: true } : c
          ),
        }))
      },

      getPendingCascades: () => {
        return get().cascadeSuggestions.filter(c => !c.isDismissed)
      },
    }),
    {
      name: 'midwicket-audit',
      version: 1,
    }
  )
)
