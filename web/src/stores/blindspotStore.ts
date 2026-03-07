import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { BlindspotAnalysis } from '../types'

interface BlindspotStore {
  analyses: BlindspotAnalysis[]
  isAnalyzing: boolean
  addAnalysis: (data: Omit<BlindspotAnalysis, 'id' | 'createdAt'>) => BlindspotAnalysis
  deleteAnalysis: (id: string) => void
  setAnalyzing: (v: boolean) => void
  getLatestForEntity: (entityLabel: string) => BlindspotAnalysis | undefined
}

export const useBlindspotStore = create<BlindspotStore>()(
  persist(
    (set, get) => ({
      analyses: [],
      isAnalyzing: false,

      addAnalysis: (data) => {
        const analysis: BlindspotAnalysis = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ analyses: [analysis, ...s.analyses].slice(0, 50) }))
        return analysis
      },

      deleteAnalysis: (id) => set(s => ({ analyses: s.analyses.filter(a => a.id !== id) })),
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      getLatestForEntity: (entityLabel) =>
        get().analyses.find(a => a.entityLabel === entityLabel),
    }),
    { name: 'midwicket-blindspots', version: 1 }
  )
)
