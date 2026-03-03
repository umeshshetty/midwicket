import type { GraphNode } from '../types'

/**
 * Time-decay relevance score for a note.
 *
 * score = (1 + connectionCount) × e^(-λ × daysSinceUpdate)
 *
 * λ = 0.05  → half-life ~14 days
 * connectionCount = number of entity nodes that reference this note (graph connectivity bonus)
 *
 * A note with many entity connections that was updated yesterday scores higher than a
 * note with no connections updated a month ago.
 */
export function computeDecayScore(
  noteId: string,
  updatedAt: string,
  graphNodes: GraphNode[]
): number {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / 86400000
  const connectionCount = graphNodes.filter(
    n => n.type === 'entity' && n.noteIds.includes(noteId)
  ).length
  return (1 + connectionCount) * Math.exp(-0.05 * daysSince)
}
