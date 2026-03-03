import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { BrainDump, SieveItem } from '../types'

interface SieveStore {
  dumps: BrainDump[]
  isProcessing: boolean
  addDump: (raw: string, result: {
    actionable: SieveItem[]
    incubating: SieveItem[]
    questions: SieveItem[]
    emotional: SieveItem[]
  }) => BrainDump
  deleteDump: (id: string) => void
  markItemAsNote: (dumpId: string, bucket: 'actionable' | 'incubating' | 'questions', index: number, noteId: string) => void
  setProcessing: (v: boolean) => void
}

export const useSieveStore = create<SieveStore>()(
  persist(
    (set, get) => ({
      dumps: [],
      isProcessing: false,

      addDump: (rawText, result) => {
        const dump: BrainDump = {
          id: uuidv4(),
          rawText,
          ...result,
          createdAt: new Date().toISOString(),
        }
        set(state => ({ dumps: [dump, ...state.dumps] }))
        return dump
      },

      deleteDump: (id) => {
        set(state => ({ dumps: state.dumps.filter(d => d.id !== id) }))
      },

      markItemAsNote: (dumpId, bucket, index, noteId) => {
        set(state => ({
          dumps: state.dumps.map(d => {
            if (d.id !== dumpId) return d
            const items = [...d[bucket]]
            items[index] = { ...items[index], noteId }
            return { ...d, [bucket]: items }
          }),
        }))
      },

      setProcessing: (isProcessing) => set({ isProcessing }),
    }),
    {
      name: 'midwicket-sieve',
      version: 1,
    }
  )
)
