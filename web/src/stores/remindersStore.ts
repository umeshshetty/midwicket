import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Reminder } from '../types'

interface RemindersStore {
  reminders: Reminder[]
  addReminder: (r: Omit<Reminder, 'id' | 'isDone' | 'createdAt' | 'updatedAt'>) => Reminder
  toggleDone: (id: string) => void
  deleteReminder: (id: string) => void
  deleteRemindersForNote: (noteId: string) => void
  getRemindersForNote: (noteId: string) => Reminder[]
  getUpcoming: () => Reminder[]
  getOverdue: () => Reminder[]
  getUndated: () => Reminder[]
  pendingCount: () => number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useRemindersStore = create<RemindersStore>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: (partial) => {
        const now = new Date().toISOString()
        const reminder: Reminder = { ...partial, id: uuidv4(), isDone: false, createdAt: now, updatedAt: now }
        set(s => ({ reminders: [...s.reminders, reminder] }))
        return reminder
      },

      toggleDone: (id) => {
        set(s => ({
          reminders: s.reminders.map(r =>
            r.id === id ? { ...r, isDone: !r.isDone, updatedAt: new Date().toISOString() } : r
          ),
        }))
      },

      deleteReminder: (id) => set(s => ({ reminders: s.reminders.filter(r => r.id !== id) })),

      deleteRemindersForNote: (noteId) =>
        set(s => ({ reminders: s.reminders.filter(r => r.noteId !== noteId) })),

      getRemindersForNote: (noteId) => get().reminders.filter(r => r.noteId === noteId),

      getUpcoming: () => {
        const t = today()
        return get()
          .reminders.filter(r => !r.isDone && r.parsedDate && r.parsedDate >= t)
          .sort((a, b) => (a.parsedDate! > b.parsedDate! ? 1 : -1))
      },

      getOverdue: () => {
        const t = today()
        return get()
          .reminders.filter(r => !r.isDone && r.parsedDate && r.parsedDate < t)
          .sort((a, b) => (a.parsedDate! > b.parsedDate! ? 1 : -1))
      },

      getUndated: () => get().reminders.filter(r => !r.isDone && !r.parsedDate),

      pendingCount: () => get().reminders.filter(r => !r.isDone).length,
    }),
    { name: 'midwicket-reminders', version: 1 }
  )
)
