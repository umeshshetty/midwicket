/**
 * Blindspot Agent — Bias & Gap Detection
 *
 * On-demand agent that scans a cluster of notes and identifies
 * what the user is NOT thinking about — missing perspectives,
 * assumption gaps, unconsidered risks.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, Blindspot } from '../../types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const BLINDSPOT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'detect_blindspots',
    description: 'Analyze notes for gaps, biases, and missing perspectives. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blindspots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: [
                  'Missing Perspective',
                  'Assumption Gap',
                  'Unconsidered Risk',
                  'Information Gap',
                  'Confirmation Bias',
                  'Temporal Blindspot',
                  'Stakeholder Gap',
                  'Alternative Approach',
                ],
              },
              gap: {
                type: 'string',
                description: 'What is missing or overlooked (1-2 sentences)',
              },
              suggestion: {
                type: 'string',
                description: 'Concrete suggestion: a question to ask, person to consult, or angle to explore',
              },
              relevant_entities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Entity names related to this blindspot',
              },
            },
            required: ['category', 'gap', 'suggestion', 'relevant_entities'],
          },
        },
      },
      required: ['blindspots'],
    },
  },
]

const BLINDSPOT_SYSTEM = `You are a cognitive blindspot detector — a thinking tool that reveals what the user ISN'T seeing.
Analyze the provided notes for gaps, biases, and missing perspectives.
Call detect_blindspots exactly once.

Rules:
- Look for missing stakeholder perspectives (who hasn't been consulted?)
- Identify assumptions that aren't backed by evidence
- Find risks that aren't discussed
- Detect confirmation bias (only seeing one side)
- Note temporal blindspots (short-term thinking only)
- Identify alternative approaches never considered
- Don't invent problems — only flag genuine gaps visible in the text
- Provide 3-7 blindspots. Quality over quantity.
- Each suggestion must be actionable: a specific question, person, or exploration.`

export async function analyzeBlindspots(
  notes: Note[],
  entityLabel?: string,
  entityContext?: string
): Promise<Blindspot[]> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
    throw new Error('API key not configured')
  }

  const notesSection = notes
    .map(n => `[${n.createdAt.slice(0, 10)}] "${n.title}":\n${n.plainText.slice(0, 400)}`)
    .join('\n\n---\n\n')

  const userMessage = [
    entityLabel ? `Analyzing notes about: ${entityLabel}` : 'Analyzing the following collection of notes',
    entityContext ? `\nEntity context: ${entityContext}` : '',
    `\n\n${notes.length} notes:\n${notesSection}`,
  ].join('')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: BLINDSPOT_SYSTEM,
    tools: BLINDSPOT_TOOLS,
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: userMessage }],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Blindspot agent did not return a tool call')
  }

  const { blindspots } = toolBlock.input as {
    blindspots: Array<{
      category: string
      gap: string
      suggestion: string
      relevant_entities: string[]
    }>
  }

  return blindspots.map(b => ({
    id: crypto.randomUUID(),
    category: b.category,
    gap: b.gap,
    suggestion: b.suggestion,
    relevantEntities: b.relevant_entities,
  }))
}
