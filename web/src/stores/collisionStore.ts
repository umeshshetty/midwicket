import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Collision } from '../types'

interface CollisionStore {
  collisions: Collision[]
  isGenerating: boolean
  addCollision: (data: Omit<Collision, 'id' | 'createdAt' | 'isBookmarked'>) => Collision
  toggleBookmark: (id: string) => void
  deleteCollision: (id: string) => void
  setGenerating: (v: boolean) => void
}

export const useCollisionStore = create<CollisionStore>()(
  persist(
    (set, get) => ({
      collisions: [],
      isGenerating: false,

      addCollision: (data) => {
        const collision: Collision = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          isBookmarked: false,
        }
        set(s => ({ collisions: [collision, ...s.collisions].slice(0, 100) }))
        return collision
      },

      toggleBookmark: (id) => set(s => ({
        collisions: s.collisions.map(c =>
          c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c
        ),
      })),

      deleteCollision: (id) => set(s => ({
        collisions: s.collisions.filter(c => c.id !== id),
      })),

      setGenerating: (isGenerating) => set({ isGenerating }),
    }),
    { name: 'midwicket-collisions', version: 1 }
  )
)
