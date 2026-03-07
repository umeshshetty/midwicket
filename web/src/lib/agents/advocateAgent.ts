/**
 * Devil's Advocate Agent — Counter-Thesis Generation
 *
 * Generates counter-arguments for settled wiki pages.
 * Triggers when a wiki page has been stable (version 3+, not updated in 7+ days).
 * Stored as EntityMetadata.counterThesis.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { EntityType } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const ADVOCATE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_counter_thesis',
    description: 'Generate a thoughtful counter-argument to the established understanding. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        thesis: {
          type: 'string',
          description: 'A 100-200 word counter-argument that challenges the current understanding. Be intellectually honest — not contrarian for its own sake. Identify genuine blind spots, unstated assumptions, or alternative interpretations.',
        },
      },
      required: ['thesis'],
    },
  },
]

const ADVOCATE_SYSTEM = `You are a devil's advocate for a personal knowledge system.
Your role is to challenge settled understanding — not to be contrarian, but to surface genuine blind spots.
Call generate_counter_thesis exactly once.
- Challenge assumptions that seem untested
- Identify perspectives that may be missing
- Question conclusions that are based on limited evidence
- Suggest alternative interpretations of the same facts
- Be specific, not vague. Reference actual content from the wiki.
- 100-200 words. Intellectually rigorous.`

/**
 * Check if entity's wiki is "settled" and needs a counter-thesis.
 * Criteria: wiki version ≥ 3, last wiki update 7+ days ago,
 * and either no counter-thesis or counter-thesis is from an older wiki version.
 */
export function shouldGenerateCounterThesis(graphStore: GraphStoreState, entityId: string): boolean {
  const node = graphStore.getNodeById(entityId)
  if (!node?.metadata?.wiki || !node.metadata.wikiVersion || !node.metadata.lastWikiAt) return false

  const wikiVersion = node.metadata.wikiVersion
  if (wikiVersion < 3) return false

  const daysSinceWiki = (Date.now() - new Date(node.metadata.lastWikiAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceWiki < 7) return false

  // Already has a counter-thesis for this wiki version
  if (node.metadata.counterThesis?.wikiVersionAtAssessment === wikiVersion) return false

  return true
}

export async function generateCounterThesis(
  entityId: string,
  entityLabel: string,
  entityType: EntityType,
  graphStore: GraphStoreState
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  const node = graphStore.getNodeById(entityId)
  if (!node?.metadata?.wiki) return

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: ADVOCATE_SYSTEM,
      tools: ADVOCATE_TOOLS,
      tool_choice: { type: 'any' },
      messages: [{
        role: 'user',
        content: `Entity: ${entityLabel} (${entityType})\n\nEstablished wiki synthesis:\n${node.metadata.wiki}`,
      }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const { thesis } = toolBlock.input as { thesis: string }

    graphStore.upsertEntityNode(entityLabel, entityType, node.noteIds[0], {
      counterThesis: {
        thesis,
        assessedAt: new Date().toISOString().slice(0, 10),
        wikiVersionAtAssessment: node.metadata.wikiVersion ?? 0,
      },
    })
  } catch (err) {
    console.warn('[AdvocateAgent] Failed for entity', entityLabel, err)
  }
}
