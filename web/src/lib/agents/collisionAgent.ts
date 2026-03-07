/**
 * Collision Agent — Forced Serendipity
 *
 * On-demand agent that finds creative, non-obvious connections between
 * two seemingly unrelated entities from opposite sides of the knowledge graph.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, GraphNode } from '../../types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const COLLISION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'find_collision',
    description: 'Find a creative, non-obvious connection between two seemingly unrelated concepts. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        connection: {
          type: 'string',
          description: 'A creative, thought-provoking connection between the two concepts. 2-4 sentences. Focus on surprising structural similarities, shared principles, or unexpected implications.',
        },
        provocative_question: {
          type: 'string',
          description: 'A single thought-provoking question that explores this connection further.',
        },
        strength: {
          type: 'number',
          description: 'How compelling is this connection? 1-10. Be honest — forced connections get low scores.',
        },
      },
      required: ['connection', 'provocative_question', 'strength'],
    },
  },
]

const COLLISION_SYSTEM = `You are a creative collision engine — you find unexpected connections between seemingly unrelated ideas.
Find a genuine, non-obvious connection between two concepts from the user's knowledge base.
Call find_collision exactly once.

Rules:
- Look for structural similarities, shared principles, analogies, or unexpected implications.
- The connection should be SURPRISING but also DEFENSIBLE — not random word association.
- The provocative question should make the user want to explore the connection further.
- Be intellectually rigorous, not whimsical.`

export interface CollisionResult {
  connection: string
  provocative_question: string
  strength: number
}

export async function generateCollision(
  nodeA: GraphNode,
  nodeB: GraphNode,
  notesA: Note[],
  notesB: Note[]
): Promise<CollisionResult> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
    throw new Error('API key not configured')
  }

  const contextA = notesA.slice(0, 5)
    .map(n => `[${n.createdAt.slice(0, 10)}] ${n.title}: ${n.plainText.slice(0, 200)}`)
    .join('\n')

  const contextB = notesB.slice(0, 5)
    .map(n => `[${n.createdAt.slice(0, 10)}] ${n.title}: ${n.plainText.slice(0, 200)}`)
    .join('\n')

  const userMessage = `Find a creative connection between these two concepts:

CONCEPT A: ${nodeA.label} (${nodeA.entityType ?? 'entity'})
${nodeA.metadata?.wiki?.slice(0, 300) ?? nodeA.metadata?.summary ?? ''}
Notes:
${contextA}

CONCEPT B: ${nodeB.label} (${nodeB.entityType ?? 'entity'})
${nodeB.metadata?.wiki?.slice(0, 300) ?? nodeB.metadata?.summary ?? ''}
Notes:
${contextB}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: COLLISION_SYSTEM,
    tools: COLLISION_TOOLS,
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: userMessage }],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Collision agent did not return a tool call')
  }

  return toolBlock.input as CollisionResult
}
