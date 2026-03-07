/**
 * Cluster Agent — Emergent Theme Clustering
 *
 * Detects entity pairs with high note overlap (shared notes / total unique notes).
 * When overlap exceeds threshold, creates a MergeSuggestion on the smaller entity.
 * Runs locally — no API calls needed.
 */

import type { MergeSuggestion } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const OVERLAP_THRESHOLD = 0.5 // 50% shared notes
const MIN_SHARED_NOTES = 2

/**
 * Detect merge candidates among all entity nodes.
 * Returns suggestions for entities that share enough notes.
 */
export function detectMergeCandidates(graphStore: GraphStoreState): MergeSuggestion[] {
  const entityNodes = graphStore.nodes.filter(n => n.type === 'entity' && n.noteIds.length >= 2)
  const suggestions: MergeSuggestion[] = []
  const seen = new Set<string>() // Avoid duplicate A↔B and B↔A

  for (let i = 0; i < entityNodes.length; i++) {
    for (let j = i + 1; j < entityNodes.length; j++) {
      const a = entityNodes[i]
      const b = entityNodes[j]

      const pairKey = [a.id, b.id].sort().join(':')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      // Compute overlap
      const aSet = new Set(a.noteIds)
      const bSet = new Set(b.noteIds)
      const shared = a.noteIds.filter(id => bSet.has(id)).length

      if (shared < MIN_SHARED_NOTES) continue

      const unionSize = new Set([...a.noteIds, ...b.noteIds]).size
      const overlapScore = Math.round((shared / unionSize) * 100)

      if (overlapScore < OVERLAP_THRESHOLD * 100) continue

      // Skip if already has a non-dismissed suggestion for this pair
      const existingA = a.metadata?.mergeSuggestion
      if (existingA && !existingA.isDismissed && existingA.targetEntityId === b.id) continue
      const existingB = b.metadata?.mergeSuggestion
      if (existingB && !existingB.isDismissed && existingB.targetEntityId === a.id) continue

      // Suggest merging the smaller entity into the larger
      const [smaller, larger] = a.noteIds.length <= b.noteIds.length ? [a, b] : [b, a]

      suggestions.push({
        targetEntityId: larger.id,
        targetLabel: larger.label,
        overlapScore,
        reason: `${shared} shared notes out of ${unionSize} total (${overlapScore}% overlap)`,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      })

      // Store on the smaller entity
      graphStore.upsertEntityNode(smaller.label, smaller.entityType!, smaller.noteIds[0], {
        mergeSuggestion: {
          targetEntityId: larger.id,
          targetLabel: larger.label,
          overlapScore,
          reason: `${shared} shared notes out of ${unionSize} total`,
          isDismissed: false,
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  return suggestions
}

/**
 * Execute a merge: move all noteIds from source entity to target entity,
 * reassign edges, then remove source node.
 */
export function mergeEntities(
  graphStore: GraphStoreState,
  sourceEntityId: string,
  targetEntityId: string
): void {
  const source = graphStore.getNodeById(sourceEntityId)
  const target = graphStore.getNodeById(targetEntityId)
  if (!source || !target) return

  // Add source's noteIds to target
  for (const noteId of source.noteIds) {
    graphStore.upsertEntityNode(target.label, target.entityType!, noteId)
  }

  // Reassign edges from source to target
  const edges = graphStore.getEdgesForNode(sourceEntityId)
  for (const edge of edges) {
    const otherEnd = edge.source === sourceEntityId ? edge.target : edge.source
    if (otherEnd === targetEntityId) continue // Skip self-loops
    graphStore.upsertEdge(
      targetEntityId,
      otherEnd,
      edge.type,
      edge.label,
      edge.weight,
      edge.noteIds[0]
    )
  }

  // Remove source entity from graph (remove it from all note associations)
  for (const noteId of source.noteIds) {
    graphStore.removeNoteFromGraph(noteId)
    // Re-add note to graph since removeNoteFromGraph clears it
    graphStore.upsertEntityNode(target.label, target.entityType!, noteId)
  }
}
