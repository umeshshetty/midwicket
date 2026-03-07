/**
 * Context Agent — Living Project Brief
 *
 * Maintains an auto-updating ≤100-word state brief for every project/organization entity.
 * Fires in the background after the graph agent upserts a project/org entity node.
 * The brief is stored as EntityMetadata.summary and injected into the AI chat context.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, EntityType } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// Per-entity debounce: skip if same entity was updated < 30s ago
// Bounded to prevent unbounded memory growth — evict oldest entries when over limit
const MAX_DEBOUNCE_ENTRIES = 500
const lastRunMap = new Map<string, number>()
const DEBOUNCE_MS = 30_000

function _pruneDebounceMap(): void {
  if (lastRunMap.size <= MAX_DEBOUNCE_ENTRIES) return
  // Evict oldest 20% of entries
  const entries = [...lastRunMap.entries()].sort((a, b) => a[1] - b[1])
  const toRemove = Math.floor(entries.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    lastRunMap.delete(entries[i][0])
  }
}

const CONTEXT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_project_context',
    description: 'Update the living brief for a project or organization. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Current state of this project/org in ≤100 words. Concise, factual, present-tense.',
        },
        open_questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Outstanding unknowns or decisions needed. Max 5.',
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Current obstacles or blockers. Max 5. Empty array if none.',
        },
      },
      required: ['summary', 'open_questions', 'blockers'],
    },
  },
]

const CONTEXT_SYSTEM = `You maintain living briefs for ongoing projects and organizations.
Your job is to call update_project_context exactly once with a concise, up-to-date brief.
- Keep summary under 100 words. Present-tense, factual.
- Only include information clearly stated or strongly implied in the notes.
- open_questions: things that seem unresolved or unknown. Empty array if none.
- blockers: things explicitly blocking progress. Empty array if none.`

interface ContextToolOutput {
  summary: string
  open_questions: string[]
  blockers: string[]
}

export async function analyzeEntityContext(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  noteId: string,
  triggeringNote: Note,
  allNotes: Note[],
  graphStore: GraphStoreState
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  // Per-entity debounce
  const lastRun = lastRunMap.get(entityId) ?? 0
  if (Date.now() - lastRun < DEBOUNCE_MS) return
  lastRunMap.set(entityId, Date.now())
  _pruneDebounceMap()

  try {
    // Get entity's current metadata
    const entityNode = graphStore.getNodeById(entityId)
    const currentSummary = entityNode?.metadata?.summary
    const entityNoteIds = entityNode?.noteIds ?? []

    // Get last 3 notes mentioning this entity (excluding the triggering note)
    const relatedNotes = allNotes
      .filter(n => n.id !== noteId && entityNoteIds.includes(n.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3)

    const notesSection = relatedNotes.length > 0
      ? '\n\nRecent notes:\n' + relatedNotes
          .map(n => `[${n.createdAt.slice(0, 10)}] ${n.title}: ${n.plainText.slice(0, 300)}`)
          .join('\n\n')
      : ''

    const userMessage = [
      currentSummary ? `Current brief: ${currentSummary}` : `New entity: ${entityLabel}`,
      `\nNew note [${triggeringNote.createdAt.slice(0, 10)}]:\n${triggeringNote.title}\n${triggeringNote.plainText.slice(0, 500)}`,
      notesSection,
    ].join('')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CONTEXT_SYSTEM,
      tools: CONTEXT_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userMessage }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const { summary, open_questions, blockers } = toolBlock.input as ContextToolOutput

    graphStore.upsertEntityNode(entityLabel, entityType, noteId, {
      summary,
      openQuestions: open_questions,
      blockers,
      lastSummaryAt: new Date().toISOString().slice(0, 10),
    })
  } catch (err) {
    console.warn('[ContextAgent] Failed for entity', entityLabel, err)
  }
}
