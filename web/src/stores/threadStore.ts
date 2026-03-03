import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { ChatThread } from '../types'

interface ThreadStore {
  threads: ChatThread[]
  activeThreadId: string | null
  forkedIdeas: Array<{ id: string; text: string; fromThreadId: string; createdAt: string; savedAsNoteId?: string }>

  startThread: (topic: string, projectEntity?: string) => ChatThread
  updateThread: (id: string, updates: Partial<ChatThread>) => void
  setActiveThread: (id: string | null) => void
  getActiveThread: () => ChatThread | null
  getRecentThreads: (limit?: number) => ChatThread[]

  addForkedIdea: (text: string, fromThreadId: string) => string
  markIdeaAsSaved: (id: string, noteId: string) => void
}

export const useThreadStore = create<ThreadStore>()(
  persist(
    (set, get) => ({
      threads: [],
      activeThreadId: null,
      forkedIdeas: [],

      startThread: (topic, projectEntity) => {
        const thread: ChatThread = {
          id: uuidv4(),
          topic,
          projectEntity,
          lastActiveAt: new Date().toISOString(),
          messageCount: 0,
        }
        set(state => ({
          threads: [thread, ...state.threads],
          activeThreadId: thread.id,
        }))
        return thread
      },

      updateThread: (id, updates) => {
        set(state => ({
          threads: state.threads.map(t =>
            t.id === id
              ? { ...t, ...updates, lastActiveAt: new Date().toISOString() }
              : t
          ),
        }))
      },

      setActiveThread: (id) => set({ activeThreadId: id }),

      getActiveThread: () => {
        const { threads, activeThreadId } = get()
        return threads.find(t => t.id === activeThreadId) ?? null
      },

      getRecentThreads: (limit = 5) => {
        return get().threads
          .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
          .slice(0, limit)
      },

      addForkedIdea: (text, fromThreadId) => {
        const id = uuidv4()
        set(state => ({
          forkedIdeas: [
            { id, text, fromThreadId, createdAt: new Date().toISOString() },
            ...state.forkedIdeas,
          ],
        }))
        return id
      },

      markIdeaAsSaved: (id, noteId) => {
        set(state => ({
          forkedIdeas: state.forkedIdeas.map(f =>
            f.id === id ? { ...f, savedAsNoteId: noteId } : f
          ),
        }))
      },
    }),
    {
      name: 'midwicket-threads',
      version: 1,
    }
  )
)
