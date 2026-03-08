/**
 * Assembly Agent — generates structured outlines from selected entities.
 *
 * Given a set of entities the user has picked, gathers their associated notes,
 * and asks Haiku to produce a structured outline (title + sections with bullets)
 * grounded in verified facts from the knowledge graph.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { AssemblyItem, AssemblySection, Note, GraphNode, GraphEdge } from '../../types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// ─── Tool Definition ────────────────────────────────────────────────────────

const OUTLINE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_outline',
    description: 'Generate a structured outline from the provided notes and entity connections. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'A concise, descriptive title for the outline (≤10 words)',
        },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: {
                type: 'string',
                description: 'Section heading (≤8 words)',
              },
              bullets: {
                type: 'array',
                items: { type: 'string' },
                description: 'Key points for this section. Each bullet is 1-2 sentences of verified fact or connection.',
              },
              source_note_indices: {
                type: 'array',
                items: { type: 'number' },
                description: 'Zero-based indices into the provided notes array that support this section.',
              },
            },
            required: ['heading', 'bullets', 'source_note_indices'],
          },
        },
      },
      required: ['title', 'sections'],
    },
  },
]

const SYSTEM_PROMPT = `You are a structured outline generator for a personal knowledge management system.
Your job is to create scaffolding — NOT full prose — from the user's own notes and entity connections.

Rules:
- Only include facts and connections that are explicitly stated in the provided notes.
- Do NOT hallucinate or add information not present in the notes.
- Create 3-6 sections that logically organize the material.
- Each section should have 2-5 concise bullets.
- Reference source notes via their indices so we can trace provenance.
- The outline should synthesize across entities, highlighting connections and themes.
- If entities are weakly connected, note that honestly rather than fabricating links.

Call generate_outline exactly once.`

// ─── Types for tool response ────────────────────────────────────────────────

interface OutlineToolInput {
  title: string
  sections: Array<{
    heading: string
    bullets: string[]
    source_note_indices: number[]
  }>
}

// ─── Main function ──────────────────────────────────────────────────────────

export async function generateAssemblyOutline(
  selectedEntities: AssemblyItem[],
  allNotes: Note[],
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
): Promise<{ title: string; sections: AssemblySection[] } | null> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return null
  if (selectedEntities.length === 0) return null

  // Gather notes from selected entities (deduped by noteId)
  const selectedEntityIds = new Set(selectedEntities.map(e => e.entityId))
  const noteIdSet = new Set<string>()

  for (const node of graphNodes) {
    if (selectedEntityIds.has(node.id)) {
      for (const noteId of node.noteIds) {
        noteIdSet.add(noteId)
      }
    }
  }

  // Resolve note objects, sorted by recency, capped at 20
  const gatheredNotes = allNotes
    .filter(n => noteIdSet.has(n.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20)

  if (gatheredNotes.length === 0) return null

  // Build note context with indices
  const noteContext = gatheredNotes
    .map((n, i) => `[${i}] "${n.title}" (${n.updatedAt.slice(0, 10)}): ${n.plainText.slice(0, 300)}`)
    .join('\n\n')

  // Find edges between selected entities
  const relevantEdges = graphEdges.filter(
    e => selectedEntityIds.has(e.source) && selectedEntityIds.has(e.target)
  )
  const edgeContext = relevantEdges.length > 0
    ? relevantEdges
        .map(e => {
          const sourceNode = graphNodes.find(n => n.id === e.source)
          const targetNode = graphNodes.find(n => n.id === e.target)
          return `${sourceNode?.label ?? e.source} —[${e.label ?? e.type}]→ ${targetNode?.label ?? e.target}`
        })
        .join('\n')
    : 'No direct edges between selected entities.'

  const entityList = selectedEntities
    .map(e => `${e.entityLabel} (${e.entityType})`)
    .join(', ')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: OUTLINE_TOOLS,
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Generate a structured outline synthesizing these entities: ${entityList}

Known connections between entities:
${edgeContext}

Source notes (${gatheredNotes.length} total):
${noteContext}`,
        },
      ],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return null

    const { title, sections } = toolBlock.input as OutlineToolInput

    // Map source_note_indices back to real noteIds
    const mappedSections: AssemblySection[] = sections.map(s => ({
      heading: s.heading,
      bullets: s.bullets,
      sourceNoteIds: (s.source_note_indices ?? [])
        .filter(i => i >= 0 && i < gatheredNotes.length)
        .map(i => gatheredNotes[i].id),
    }))

    return { title, sections: mappedSections }
  } catch (err) {
    console.warn('[AssemblyAgent] Outline generation failed', err)
    return null
  }
}
