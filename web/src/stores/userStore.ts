import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, ThinkingStyle } from '../types'

interface UserStore {
  profile: UserProfile | null
  isOnboarded: () => boolean
  setProfile: (profile: UserProfile) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  resetProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,

      isOnboarded: () => get().profile !== null,

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) => {
        const current = get().profile
        if (!current) return
        set({
          profile: { ...current, ...updates, updatedAt: new Date().toISOString() },
        })
      },

      resetProfile: () => set({ profile: null }),
    }),
    {
      name: 'midwicket-user',
      version: 1,
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
