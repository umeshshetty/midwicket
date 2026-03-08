import type { FocusContext, GraphNode, GraphEdge } from '../types'

export function computeFocusContext(
  entityId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): FocusContext | null {
  const entity = nodes.find(n => n.id === entityId && n.type === 'entity')
  if (!entity) return null

  const noteIdSet = new Set<string>(entity.noteIds)
  const relatedEntityIds: string[] = []

  // Walk 1-hop edges to find related entities
  for (const edge of edges) {
    let neighborId: string | null = null
    if (edge.source === entityId) neighborId = edge.target
    else if (edge.target === entityId) neighborId = edge.source
    if (!neighborId) continue

    const neighbor = nodes.find(n => n.id === neighborId && n.type === 'entity')
    if (neighbor) {
      relatedEntityIds.push(neighbor.id)
      for (const nid of neighbor.noteIds) {
        noteIdSet.add(nid)
      }
    }
  }

  return {
    entityId,
    entityLabel: entity.label,
    entityType: entity.entityType!,
    noteIds: Array.from(noteIdSet),
    relatedEntityIds,
  }
}

export function isNoteInFocus(noteId: string, ctx: FocusContext): boolean {
  return ctx.noteIds.includes(noteId)
}

export function isEntityInFocus(entityId: string, ctx: FocusContext): boolean {
  return entityId === ctx.entityId || ctx.relatedEntityIds.includes(entityId)
}
