/**
 * Confidence Agent — Epistemic Confidence Scoring
 *
 * Assesses each entity's confidence level based on evidence density:
 * - fact: multiple corroborating notes, specific details
 * - strong_belief: mentioned multiple times with consistent context
 * - assumption: mentioned once or with vague/uncertain language
 *
 * Fires after contextAgent for entities with 2+ notes.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, EntityType, EpistemicConfidence } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// Per-entity debounce: 120s (lightweight, no rush)
const MAX_DEBOUNCE_ENTRIES = 500
const lastRunMap = new Map<string, number>()
const DEBOUNCE_MS = 120_000

function _pruneDebounceMap(): void {
  if (lastRunMap.size <= MAX_DEBOUNCE_ENTRIES) return
  const entries = [...lastRunMap.entries()].sort((a, b) => a[1] - b[1])
  const toRemove = Math.floor(entries.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    lastRunMap.delete(entries[i][0])
  }
}

const CONFIDENCE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'assess_confidence',
    description: 'Assess epistemic confidence for an entity based on evidence. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        level: {
          type: 'string',
          enum: ['fact', 'strong_belief', 'assumption'],
          description: 'fact = multiple corroborating sources with specific details. strong_belief = mentioned consistently but not fully verified. assumption = mentioned once or with uncertain language.',
        },
        score: {
          type: 'number',
          description: 'Confidence score 0-100. fact: 70-100, strong_belief: 40-69, assumption: 0-39.',
        },
        reasoning: {
          type: 'string',
          description: 'Why this level, in ≤30 words.',
        },
      },
      required: ['level', 'score', 'reasoning'],
    },
  },
]

const CONFIDENCE_SYSTEM = `You assess epistemic confidence for entities in a personal knowledge graph.
Call assess_confidence exactly once.
Evaluate based on:
- Number of independent notes mentioning this entity
- Specificity of details (dates, numbers, names = higher confidence)
- Consistency across notes (same facts repeated = higher)
- Language hedging ("I think", "maybe", "supposedly" = lower)
- Source quality (firsthand experience vs. hearsay)

Guidelines:
- fact (70-100): Verified from multiple notes with concrete details. The user has direct experience.
- strong_belief (40-69): Mentioned multiple times, generally consistent, but some details are inferred.
- assumption (0-39): Single mention, uncertain language, or secondhand info.`

export async function assessEntityConfidence(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  allNotes: Note[],
  graphStore: GraphStoreState
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  const lastRun = lastRunMap.get(entityId) ?? 0
  if (Date.now() - lastRun < DEBOUNCE_MS) return
  lastRunMap.set(entityId, Date.now())
  _pruneDebounceMap()

  const entityNode = graphStore.getNodeById(entityId)
  if (!entityNode || entityNode.noteIds.length < 1) return

  try {
    const entityNotes = allNotes
      .filter(n => entityNode.noteIds.includes(n.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)

    const notesSection = entityNotes
      .map(n => `[${n.createdAt.slice(0, 10)}] "${n.title}": ${n.plainText.slice(0, 300)}`)
      .join('\n\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CONFIDENCE_SYSTEM,
      tools: CONFIDENCE_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{
        role: 'user',
        content: `Entity: ${entityLabel} (${entityType}, mentioned in ${entityNode.noteIds.length} notes)\n\nNotes:\n${notesSection}`,
      }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const { level, score, reasoning } = toolBlock.input as EpistemicConfidence

    graphStore.upsertEntityNode(entityLabel, entityType, entityNode.noteIds[0], {
      confidence: {
        level,
        score,
        reasoning,
        assessedAt: new Date().toISOString().slice(0, 10),
      },
    })
  } catch (err) {
    console.warn('[ConfidenceAgent] Failed for entity', entityLabel, err)
  }
}
