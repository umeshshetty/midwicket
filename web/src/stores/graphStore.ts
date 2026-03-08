import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { GraphNode, GraphEdge, EntityType, EdgeType, EntityMetadata } from '../types'

// Merge strategy: preserve prior context, only overwrite with non-empty incoming values.
// For lastMentionedAt, keep the most recent date.
function mergeMetadata(
  existing: EntityMetadata | undefined,
  incoming: EntityMetadata | undefined
): EntityMetadata | undefined {
  if (!incoming) return existing
  const merged: EntityMetadata = { ...existing }
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
      ;(merged as Record<string, unknown>)[k] = v
    }
  }
  if (incoming.lastMentionedAt) {
    if (!merged.lastMentionedAt || incoming.lastMentionedAt > merged.lastMentionedAt) {
      merged.lastMentionedAt = incoming.lastMentionedAt
    }
  }
  return merged
}

interface GraphStore {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lastFullAnalysis: string | null
  processingNoteIds: string[]

  // Mutations
  upsertEntityNode: (
    label: string,
    entityType: EntityType,
    noteId: string,
    metadata?: EntityMetadata
  ) => GraphNode
  upsertNoteNode: (noteId: string, title: string) => GraphNode
  upsertEdge: (
    source: string,
    target: string,
    type: EdgeType,
    label: string | undefined,
    weight: number,
    noteId: string
  ) => void
  removeNoteFromGraph: (noteId: string) => void
  setNodePosition: (nodeId: string, x: number, y: number) => void
  setProcessing: (noteId: string, isProcessing: boolean) => void
  setLastFullAnalysis: (date: string) => void
  clearGraph: () => void

  // Entity metadata patching (for reconciliation agent)
  patchEntityMetadata: (entityId: string, patch: Partial<EntityMetadata>) => void

  // Profile question lifecycle
  dismissProfileQuestion: (entityId: string, questionId: string) => void
  answerProfileQuestion: (entityId: string, questionId: string, noteId: string) => void

  // Selectors
  getNodeById: (id: string) => GraphNode | undefined
  getEdgesForNode: (nodeId: string) => GraphEdge[]
  getRelatedNoteIds: (noteId: string) => string[]
  /**
   * Graph-guided retrieval index: given a list of entity label strings,
   * find existing entity nodes that match (case-insensitive, prefix match).
   * Returns matched nodes so callers can retrieve their noteIds.
   */
  findNodesByLabels: (labels: string[]) => GraphNode[]
}

export const useGraphStore = create<GraphStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      lastFullAnalysis: null,
      processingNoteIds: [],

      upsertEntityNode: (label, entityType, noteId, metadata) => {
        const normalised = label.toLowerCase()
        const existing = get().nodes.find(
          n => n.type === 'entity' && n.label.toLowerCase() === normalised
        )
        if (existing) {
          const merged = mergeMetadata(existing.metadata, metadata)
          const needsNoteId = !existing.noteIds.includes(noteId)
          const updatedNode: GraphNode = {
            ...existing,
            noteIds: needsNoteId ? [...existing.noteIds, noteId] : existing.noteIds,
            metadata: merged,
          }
          set(s => ({
            nodes: s.nodes.map(n => (n.id === existing.id ? updatedNode : n)),
          }))
          return updatedNode
        }
        const node: GraphNode = {
          id: uuidv4(),
          type: 'entity',
          label,
          entityType,
          noteIds: [noteId],
          metadata: metadata ? mergeMetadata(undefined, metadata) : undefined,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ nodes: [...s.nodes, node] }))
        return node
      },

      upsertNoteNode: (noteId, title) => {
        const existing = get().nodes.find(n => n.id === noteId)
        if (existing) {
          set(s => ({
            nodes: s.nodes.map(n => (n.id === noteId ? { ...n, label: title } : n)),
          }))
          return { ...existing, label: title }
        }
        const node: GraphNode = {
          id: noteId,
          type: 'note',
          label: title,
          noteIds: [noteId],
          createdAt: new Date().toISOString(),
        }
        set(s => ({ nodes: [...s.nodes, node] }))
        return node
      },

      upsertEdge: (source, target, type, label, weight, noteId) => {
        const existing = get().edges.find(
          e => e.source === source && e.target === target && e.type === type
        )
        if (existing) {
          set(s => ({
            edges: s.edges.map(e =>
              e.id === existing.id
                ? {
                    ...e,
                    weight: Math.min(10, e.weight + weight * 0.3),
                    noteIds: e.noteIds.includes(noteId) ? e.noteIds : [...e.noteIds, noteId],
                  }
                : e
            ),
          }))
          return
        }
        const edge: GraphEdge = {
          id: uuidv4(),
          source,
          target,
          type,
          label,
          weight: Math.max(1, Math.min(10, weight)),
          noteIds: [noteId],
          createdAt: new Date().toISOString(),
        }
        set(s => ({ edges: [...s.edges, edge] }))
      },

      removeNoteFromGraph: (noteId) => {
        set(s => {
          const updatedEdges = s.edges
            .map(e => ({ ...e, noteIds: e.noteIds.filter(id => id !== noteId) }))
            .filter(e => e.noteIds.length > 0)

          const updatedNodes = s.nodes
            .map(n =>
              n.type === 'entity'
                ? { ...n, noteIds: n.noteIds.filter(id => id !== noteId) }
                : n
            )
            .filter(n => (n.type === 'note' ? n.id !== noteId : n.noteIds.length > 0))

          return { nodes: updatedNodes, edges: updatedEdges }
        })
      },

      setNodePosition: (nodeId, x, y) => {
        set(s => ({
          nodes: s.nodes.map(n => (n.id === nodeId ? { ...n, x, y } : n)),
        }))
      },

      setProcessing: (noteId, isProcessing) => {
        set(s => ({
          processingNoteIds: isProcessing
            ? s.processingNoteIds.includes(noteId)
              ? s.processingNoteIds
              : [...s.processingNoteIds, noteId]
            : s.processingNoteIds.filter(id => id !== noteId),
        }))
      },

      setLastFullAnalysis: (date) => set({ lastFullAnalysis: date }),
      clearGraph: () => set({ nodes: [], edges: [], lastFullAnalysis: null }),

      patchEntityMetadata: (entityId, patch) => {
        set(s => ({
          nodes: s.nodes.map(n => {
            if (n.id !== entityId || n.type !== 'entity') return n
            return { ...n, metadata: mergeMetadata(n.metadata, patch) }
          }),
        }))
      },

      dismissProfileQuestion: (entityId, questionId) => {
        set(s => ({
          nodes: s.nodes.map(n => {
            if (n.id !== entityId || !n.metadata?.profileQuestions) return n
            return {
              ...n,
              metadata: {
                ...n.metadata,
                profileQuestions: n.metadata.profileQuestions.map(q =>
                  q.id === questionId ? { ...q, isDismissed: true } : q
                ),
              },
            }
          }),
        }))
      },

      answerProfileQuestion: (entityId, questionId, noteId) => {
        set(s => ({
          nodes: s.nodes.map(n => {
            if (n.id !== entityId || !n.metadata?.profileQuestions) return n
            return {
              ...n,
              metadata: {
                ...n.metadata,
                profileQuestions: n.metadata.profileQuestions.map(q =>
                  q.id === questionId ? { ...q, answeredNoteId: noteId } : q
                ),
              },
            }
          }),
        }))
      },

      getNodeById: (id) => get().nodes.find(n => n.id === id),
      getEdgesForNode: (nodeId) =>
        get().edges.filter(e => e.source === nodeId || e.target === nodeId),
      getRelatedNoteIds: (noteId) => {
        const edges = get().edges.filter(
          e =>
            (e.source === noteId || e.target === noteId) && e.type === 'shares_concept'
        )
        return [...new Set(edges.flatMap(e => [e.source, e.target]).filter(id => id !== noteId))]
      },

      findNodesByLabels: (labels) => {
        const normalised = labels.map(l => l.toLowerCase().trim())
        return get().nodes.filter(
          n => {
            if (n.type !== 'entity') return false
            const nodeLabel = n.label.toLowerCase()
            return normalised.some(label => {
              // Exact match — always good
              if (nodeLabel === label) return true
              // Prefix match only if the shorter side is ≥3 chars (avoid "Sa" → "Sarah")
              const shorter = Math.min(nodeLabel.length, label.length)
              if (shorter < 3) return false
              return nodeLabel.startsWith(label) || label.startsWith(nodeLabel)
            })
          }
        )
      },
    }),
    {
      name: 'midwicket-graph',
      version: 1,
    }
  )
)
