import type { GraphNode, GraphEdge } from '../types'

/**
 * Find maximally disconnected entity node pairs using BFS shortest path.
 * Returns pairs sorted by distance (most disconnected first).
 */
export function findDisconnectedPairs(
  nodes: GraphNode[],
  edges: GraphEdge[],
  count: number = 5
): Array<[GraphNode, GraphNode, number]> {
  const entityNodes = nodes.filter(n => n.type === 'entity' && n.noteIds.length >= 2)
  if (entityNodes.length < 2) return []

  // Build adjacency list (entity-to-entity only, skip note->entity "contains" edges)
  const adj = new Map<string, Set<string>>()
  for (const node of entityNodes) {
    adj.set(node.id, new Set())
  }
  for (const edge of edges) {
    if (edge.type === 'contains') continue
    if (adj.has(edge.source) && adj.has(edge.target)) {
      adj.get(edge.source)!.add(edge.target)
      adj.get(edge.target)!.add(edge.source)
    }
  }

  // BFS from a node to compute shortest distances
  function bfsDistance(startId: string): Map<string, number> {
    const dist = new Map<string, number>()
    dist.set(startId, 0)
    const queue = [startId]
    let i = 0
    while (i < queue.length) {
      const current = queue[i++]
      const d = dist.get(current)!
      for (const neighbor of adj.get(current) ?? []) {
        if (!dist.has(neighbor)) {
          dist.set(neighbor, d + 1)
          queue.push(neighbor)
        }
      }
    }
    return dist
  }

  // Score all pairs
  const pairs: Array<[GraphNode, GraphNode, number]> = []

  for (let i = 0; i < entityNodes.length; i++) {
    const distMap = bfsDistance(entityNodes[i].id)
    for (let j = i + 1; j < entityNodes.length; j++) {
      const dist = distMap.get(entityNodes[j].id) ?? Infinity
      pairs.push([entityNodes[i], entityNodes[j], dist])
    }
  }

  // Sort by distance descending (most disconnected first), randomize ties
  pairs.sort((a, b) => {
    if (b[2] !== a[2]) return b[2] - a[2]
    return Math.random() - 0.5
  })

  return pairs.slice(0, count)
}

/**
 * Pick a random maximally disconnected pair for collision generation.
 */
export function pickCollisionPair(
  nodes: GraphNode[],
  edges: GraphEdge[]
): [GraphNode, GraphNode] | null {
  const pairs = findDisconnectedPairs(nodes, edges, 10)
  if (pairs.length === 0) return null
  const pool = pairs.slice(0, Math.min(5, pairs.length))
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return [pick[0], pick[1]]
}
