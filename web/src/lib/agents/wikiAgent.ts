/**
 * Wiki Agent — Auto-Wiki Synthesis Pages + Evolution Tracking
 *
 * Maintains a 500-1000 word wiki synthesis per entity node (any type with 2+ notes).
 * Also provides on-demand evolution summaries showing how understanding changed over time.
 * Fires in the background after graph agent upserts entity nodes.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, EntityType, ProvenancedWiki, ProvenanceSpan } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// Per-entity debounce: 60s (heavier than contextAgent's 30s)
const MAX_DEBOUNCE_ENTRIES = 500
const lastRunMap = new Map<string, number>()
const DEBOUNCE_MS = 60_000

function _pruneDebounceMap(): void {
  if (lastRunMap.size <= MAX_DEBOUNCE_ENTRIES) return
  const entries = [...lastRunMap.entries()].sort((a, b) => a[1] - b[1])
  const toRemove = Math.floor(entries.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    lastRunMap.delete(entries[i][0])
  }
}

// ─── Wiki Synthesis ──────────────────────────────────────────────────────────

const WIKI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_wiki_synthesis',
    description: 'Generate a comprehensive synthesis page for an entity with source attribution. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        wiki_content: {
          type: 'string',
          description: 'Comprehensive synthesis of everything known about this entity. 500-1000 words. Use markdown: ## headers, **bold**, - bullet lists. Structure: ## Overview, ## Key Details, ## Connections & Relationships, ## Open Questions.',
        },
        provenance: {
          type: 'array',
          description: 'Source attribution for each statement in the wiki. Break the wiki into logical sentences/clauses and cite which note indices contributed.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'A sentence or clause from the wiki content' },
              source_note_indices: {
                type: 'array', items: { type: 'number' },
                description: 'Zero-based indices of notes that support this statement',
              },
              confidence: {
                type: 'string', enum: ['direct', 'inferred', 'synthesized'],
                description: 'direct = stated in notes, inferred = logically derived, synthesized = combining multiple sources',
              },
            },
            required: ['text', 'source_note_indices', 'confidence'],
          },
        },
      },
      required: ['wiki_content', 'provenance'],
    },
  },
]

const WIKI_SYSTEM = `You are a personal knowledge wiki synthesizer.
Call generate_wiki_synthesis exactly once with a comprehensive, well-structured synthesis.
- Write 500-1000 words in markdown format.
- Structure: ## Overview, ## Key Details, ## Connections & Relationships, ## Open Questions
- Present-tense, factual. Only include information from the provided notes.
- Synthesize across notes — don't just list summaries of each note.
- Highlight evolving understanding — if earlier notes say one thing and later notes another, note the evolution.
- For people: include role, relationship, key interactions, context.
- For concepts: explain the user's current understanding, how it connects to other ideas.
- For projects: current state, history, stakeholders, decisions made.

IMPORTANT: In the "provenance" array, break the wiki into logical sentences and for each one, cite which note indices (0-based) contributed to that statement. Mark confidence as "direct" if the note explicitly states it, "inferred" if you deduced it, or "synthesized" if you combined multiple sources.`

export async function generateEntityWiki(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  triggeringNoteId: string,
  allNotes: Note[],
  graphStore: GraphStoreState
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  // Per-entity debounce (60s)
  const lastRun = lastRunMap.get(entityId) ?? 0
  if (Date.now() - lastRun < DEBOUNCE_MS) return
  lastRunMap.set(entityId, Date.now())
  _pruneDebounceMap()

  // Only generate wiki if entity has 2+ notes
  const entityNode = graphStore.getNodeById(entityId)
  if (!entityNode || entityNode.noteIds.length < 2) return

  try {
    // Gather up to 15 most recent notes for this entity
    const entityNotes = allNotes
      .filter(n => entityNode.noteIds.includes(n.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 15)

    const currentWiki = entityNode.metadata?.wiki
    const notesSection = entityNotes
      .map(n => `[${n.createdAt.slice(0, 10)}] "${n.title}":\n${n.plainText.slice(0, 500)}`)
      .join('\n\n---\n\n')

    // Get related entities for context
    const edges = graphStore.getEdgesForNode(entityId)
    const relatedEntities = edges
      .filter(e => e.type === 'related_to' || e.type === 'explicitly_links')
      .map(e => {
        const otherId = e.source === entityId ? e.target : e.source
        const other = graphStore.getNodeById(otherId)
        return other ? `${other.label} (${other.entityType}): ${e.label ?? 'related'}` : null
      })
      .filter(Boolean)
      .slice(0, 10)

    const userMessage = [
      `Entity: ${entityLabel} (${entityType})`,
      currentWiki ? `\nCurrent wiki (update incrementally, don't rewrite from scratch):\n${currentWiki.slice(0, 500)}...` : '',
      relatedEntities.length > 0 ? `\nRelated entities: ${relatedEntities.join('; ')}` : '',
      `\n\nNotes (${entityNotes.length} total, newest first):\n${notesSection}`,
    ].join('')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: WIKI_SYSTEM,
      tools: WIKI_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userMessage }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const { wiki_content, provenance } = toolBlock.input as {
      wiki_content: string
      provenance?: Array<{ text: string; source_note_indices: number[]; confidence: string }>
    }

    // Build provenanced wiki if provenance data was returned
    let provenancedWiki: ProvenancedWiki | undefined
    if (provenance && provenance.length > 0) {
      const spans: ProvenanceSpan[] = provenance.map(p => ({
        text: p.text,
        sourceNoteIds: p.source_note_indices
          .filter(i => i >= 0 && i < entityNotes.length)
          .map(i => entityNotes[i].id),
        confidence: (p.confidence as ProvenanceSpan['confidence']) ?? 'synthesized',
      }))
      provenancedWiki = {
        spans,
        generatedAt: new Date().toISOString(),
        wikiVersion: (entityNode.metadata?.wikiVersion ?? 0) + 1,
      }
    }

    const newVersion = (entityNode.metadata?.wikiVersion ?? 0) + 1
    graphStore.upsertEntityNode(entityLabel, entityType, triggeringNoteId, {
      wiki: wiki_content,
      lastWikiAt: new Date().toISOString().slice(0, 10),
      wikiVersion: newVersion,
      provenancedWiki,
    })
  } catch (err) {
    console.warn('[WikiAgent] Failed for entity', entityLabel, err)
  }
}

/** Bypass debounce for manual regeneration */
export async function forceGenerateEntityWiki(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  allNotes: Note[],
  graphStore: GraphStoreState
): Promise<void> {
  lastRunMap.delete(entityId) // Clear debounce
  const entityNode = graphStore.getNodeById(entityId)
  const noteId = entityNode?.noteIds[0] ?? ''
  return generateEntityWiki(entityId, entityLabel, entityType, noteId, allNotes, graphStore)
}

// ─── Evolution Summary ───────────────────────────────────────────────────────

const EVOLUTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'summarize_evolution',
    description: 'Summarize how the user\'s understanding of an entity evolved over time. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        evolution_summary: {
          type: 'string',
          description: 'A 100-200 word narrative of how the user\'s thinking about this entity changed over time. Highlight key shifts, turning points, and evolving perspectives. Use temporal markers: "Initially...", "By March...", "More recently...".',
        },
      },
      required: ['evolution_summary'],
    },
  },
]

const EVOLUTION_SYSTEM = `You are a semantic evolution tracker.
Analyze how the user's understanding of an entity evolved over time based on their chronological notes.
Call summarize_evolution exactly once.
- Identify key shifts in perspective or understanding
- Note contradictions that were resolved
- Highlight turning points
- Use temporal language: "Initially...", "By [date]...", "More recently..."
- 100-200 words, narrative form.`

export async function analyzeEvolution(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  allNotes: Note[],
  graphStore: GraphStoreState
): Promise<string | null> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return null

  const entityNode = graphStore.getNodeById(entityId)
  if (!entityNode || entityNode.noteIds.length < 2) return null

  try {
    // Gather notes chronologically (oldest first for evolution)
    const entityNotes = allNotes
      .filter(n => entityNode.noteIds.includes(n.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 15)

    const notesSection = entityNotes
      .map(n => `[${n.createdAt.slice(0, 10)}] "${n.title}":\n${n.plainText.slice(0, 400)}`)
      .join('\n\n---\n\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: EVOLUTION_SYSTEM,
      tools: EVOLUTION_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: `Entity: ${entityLabel} (${entityType})\n\nNotes in chronological order:\n${notesSection}` }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return null

    const { evolution_summary } = toolBlock.input as { evolution_summary: string }

    graphStore.upsertEntityNode(entityLabel, entityType, entityNode.noteIds[0], {
      evolutionSummary: evolution_summary,
      lastEvolutionAt: new Date().toISOString().slice(0, 10),
    })

    return evolution_summary
  } catch (err) {
    console.warn('[WikiAgent] Evolution analysis failed for', entityLabel, err)
    return null
  }
}
