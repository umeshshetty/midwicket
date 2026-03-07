/**
 * Context Agent — Living Entity Briefs + Profile Gap Detection
 *
 * Maintains an auto-updating ≤100-word state brief for every entity type.
 * Fires in the background after the graph agent upserts an entity node.
 * The brief is stored as EntityMetadata.summary and injected into AI chat context.
 * Also detects profile gaps — things the system doesn't know but should.
 */

import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import type { Note, EntityType, ProfileQuestion } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// Per-entity debounce with tiered intervals by entity type
// Bounded to prevent unbounded memory growth — evict oldest entries when over limit
const MAX_DEBOUNCE_ENTRIES = 500
const lastRunMap = new Map<string, number>()

function getDebounceMs(entityType: EntityType): number {
  if (entityType === 'project' || entityType === 'organization') return 30_000
  if (entityType === 'person') return 60_000
  return 120_000
}

function _pruneDebounceMap(): void {
  if (lastRunMap.size <= MAX_DEBOUNCE_ENTRIES) return
  const entries = [...lastRunMap.entries()].sort((a, b) => a[1] - b[1])
  const toRemove = Math.floor(entries.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    lastRunMap.delete(entries[i][0])
  }
}

// ─── Entity-Type-Aware System Prompts ────────────────────────────────────────

function buildContextSystemPrompt(entityType: EntityType): string {
  const base = `You maintain living briefs for entities in a personal knowledge graph.
Your job is to call update_entity_context exactly once with a concise, up-to-date brief.
- Keep summary under 100 words. Present-tense, factual.
- Only include information clearly stated or strongly implied in the notes.
- open_questions: things that seem unresolved or unknown about this entity. Empty array if none.
- blockers: things explicitly blocking progress. Empty array if none (mainly relevant for projects/orgs).
- profile_questions: things YOU (the system) do NOT know but SHOULD know based on how often and how this entity appears. Do NOT ask about things already answered in the notes. Max 3 questions. Empty array if the profile is already comprehensive.`

  const typeSpecific: Partial<Record<EntityType, string>> = {
    person: `
This entity is a PERSON. Focus on:
- Their role/title and organization
- Their relationship to the user (colleague, client, mentor, etc.)
- Key interactions and context
Profile question examples: "What is [name]'s role or title?", "How did you first meet [name]?", "What organization does [name] work for?"
Do NOT ask profile questions if role, org, and relationship are already known.`,

    project: `
This entity is a PROJECT. Focus on:
- Current status and next milestones
- Key stakeholders and their roles
- Blockers and dependencies
Profile question examples: "What's the target deadline for [project]?", "Who is the executive sponsor?", "What's the success metric?"`,

    organization: `
This entity is an ORGANIZATION. Focus on:
- What the org does and the user's relationship to it
- Key people the user interacts with there
- Industry and current engagement status
Profile question examples: "What is your role/engagement with [org]?", "Who is your primary contact at [org]?"`,

    concept: `
This entity is a CONCEPT or IDEA. Focus on:
- The user's current understanding
- How it connects to their work or other concepts
- Open questions about the concept itself
Profile question examples: "How does [concept] relate to your current work?", "What prompted your interest in [concept]?"`,

    technology: `
This entity is a TECHNOLOGY. Focus on:
- How the user uses or plans to use it
- Evaluation status (exploring, adopted, deprecated)
- Relationship to other tools/tech in their stack
Profile question examples: "Are you currently using [tech] or evaluating it?", "What problem does [tech] solve for you?"`,

    event: `
This entity is an EVENT. Focus on:
- When it is/was and what happened
- Key outcomes or takeaways
- Who was involved
Profile question examples: "What was the outcome of [event]?", "When is/was [event] scheduled?"`,

    idea: `
This entity is an IDEA. Focus on:
- The core insight
- Current status (exploring, developing, parked)
- How it connects to the user's goals
Profile question examples: "What's the next step to develop [idea]?", "Who could you discuss [idea] with?"`,

    place: `
This entity is a PLACE. Focus on:
- Why it's relevant to the user
- Key associations and events there
Profile question examples: "What's your connection to [place]?", "When were you last at [place]?"`,
  }

  return base + (typeSpecific[entityType] ?? '')
}

// ─── Tool Schema ─────────────────────────────────────────────────────────────

const CONTEXT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_entity_context',
    description: 'Update the living brief and identify knowledge gaps for an entity. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Current understanding of this entity in ≤100 words. Concise, factual, present-tense.',
        },
        open_questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Outstanding unknowns or decisions relevant to this entity. Max 5. Empty array if none.',
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Current obstacles or blockers. Max 5. Empty array if none. Mainly for projects/orgs.',
        },
        profile_questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'A specific question about what the system does NOT know about this entity. Phrased conversationally.',
              },
              reason: {
                type: 'string',
                description: 'Why this matters, in ≤15 words.',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'high = frequently mentioned but key info missing. medium = moderately useful. low = nice to know.',
              },
            },
            required: ['question', 'reason', 'priority'],
          },
          description: 'Questions about information the system cannot infer from existing notes. Max 3. Only ask what is NOT already in the notes. Empty array if profile is comprehensive.',
        },
      },
      required: ['summary', 'open_questions', 'blockers', 'profile_questions'],
    },
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContextToolOutput {
  summary: string
  open_questions: string[]
  blockers: string[]
  profile_questions: Array<{
    question: string
    reason: string
    priority: 'high' | 'medium' | 'low'
  }>
}

// ─── Main Function ───────────────────────────────────────────────────────────

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

  // Per-entity debounce (tiered by entity type)
  const debounceMs = getDebounceMs(entityType)
  const lastRun = lastRunMap.get(entityId) ?? 0
  if (Date.now() - lastRun < debounceMs) return
  lastRunMap.set(entityId, Date.now())
  _pruneDebounceMap()

  try {
    // Get entity's current state
    const entityNode = graphStore.getNodeById(entityId)
    const entityNoteIds = entityNode?.noteIds ?? []

    // Need at least 2 notes for meaningful synthesis
    if (entityNoteIds.length < 2) return

    const currentSummary = entityNode?.metadata?.summary

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

    // Include existing metadata so the AI knows what's already known
    const metadataSection = entityNode?.metadata
      ? `\nKnown metadata: ${JSON.stringify({
          role: entityNode.metadata.role,
          organization: entityNode.metadata.organization,
          relationshipType: entityNode.metadata.relationshipType,
          keyFact: entityNode.metadata.keyFact,
          status: entityNode.metadata.status,
          description: entityNode.metadata.description,
          industry: entityNode.metadata.industry,
        })}`
      : ''

    const userMessage = [
      `Entity: ${entityLabel} (type: ${entityType}, mentioned in ${entityNoteIds.length} notes)`,
      currentSummary ? `\nCurrent brief: ${currentSummary}` : '',
      metadataSection,
      `\n\nNew note [${triggeringNote.createdAt.slice(0, 10)}]:\n${triggeringNote.title}\n${triggeringNote.plainText.slice(0, 500)}`,
      notesSection,
    ].join('')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 384,
      system: buildContextSystemPrompt(entityType),
      tools: CONTEXT_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userMessage }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const { summary, open_questions, blockers, profile_questions } = toolBlock.input as ContextToolOutput

    // Build ProfileQuestion objects with IDs
    const newProfileQs: ProfileQuestion[] = (profile_questions ?? []).map(pq => ({
      id: uuidv4(),
      entityId,
      entityLabel,
      entityType,
      question: pq.question,
      reason: pq.reason,
      priority: pq.priority,
      createdAt: new Date().toISOString(),
      isDismissed: false,
    }))

    // Merge: keep existing non-dismissed/non-answered questions that aren't duplicates of new ones
    const existingQuestions = entityNode?.metadata?.profileQuestions ?? []
    const existingKept = existingQuestions.filter(eq =>
      !eq.isDismissed &&
      !eq.answeredNoteId &&
      !newProfileQs.some(nq => nq.question.toLowerCase() === eq.question.toLowerCase())
    )
    const mergedQuestions = [...newProfileQs, ...existingKept].slice(0, 5)

    graphStore.upsertEntityNode(entityLabel, entityType, noteId, {
      summary,
      openQuestions: open_questions,
      blockers,
      profileQuestions: mergedQuestions,
      lastSummaryAt: new Date().toISOString().slice(0, 10),
      lastProfileQuestionsAt: new Date().toISOString().slice(0, 10),
    })
  } catch (err) {
    console.warn('[ContextAgent] Failed for entity', entityLabel, err)
  }
}
