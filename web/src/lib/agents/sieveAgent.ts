/**
 * Sieve Agent — Brain Dump Parser
 *
 * Takes unstructured stream-of-consciousness text and categorizes it into:
 * 1. Actionable next steps — concrete things to do
 * 2. Incubating ideas — interesting but not yet actionable
 * 3. Open questions / blockers — unknowns needing answers
 * 4. Emotional offload — venting, frustration, feelings (acknowledged, then archived)
 *
 * Single Haiku call with tool_use.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SieveItem } from '../../types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const SIEVE_TOOL: Anthropic.Tool[] = [
  {
    name: 'parse_brain_dump',
    description: 'Categorize a brain dump into four cognitive buckets. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        actionable: {
          type: 'array',
          description: 'Concrete next steps the user can act on. Rewrite as clean imperatives.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Clean imperative action, e.g. "Schedule call with Sarah about Q3 numbers"' },
            },
            required: ['text'],
          },
        },
        incubating: {
          type: 'array',
          description: 'Ideas worth saving but not yet actionable. Preserve the user\'s voice.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The idea, lightly cleaned up but preserving original intent' },
            },
            required: ['text'],
          },
        },
        questions: {
          type: 'array',
          description: 'Open questions, unknowns, or blockers that need answers before progress.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The question or blocker, phrased clearly' },
            },
            required: ['text'],
          },
        },
        emotional: {
          type: 'array',
          description: 'Venting, frustration, emotional processing. Acknowledged but not actionable.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The emotional expression, summarized respectfully' },
            },
            required: ['text'],
          },
        },
      },
      required: ['actionable', 'incubating', 'questions', 'emotional'],
    },
  },
]

const SIEVE_SYSTEM = `You are a cognitive sieve — a thinking tool that sorts chaos into clarity.
The user has dumped a stream of consciousness. Your job is to categorize EVERY piece of content into exactly one of four buckets.

Rules:
- ACTIONABLE: Only concrete, specific next steps. Rewrite as clean imperatives ("Do X", "Call Y about Z").
- INCUBATING: Ideas, half-formed thoughts, creative sparks worth preserving. Keep the user's voice.
- QUESTIONS: Unknowns, blockers, things needing answers. Phrase as clear questions.
- EMOTIONAL: Venting, frustration, self-talk, emotional processing. Summarize respectfully. This is valid and important — don't dismiss it.

Important:
- Don't lose any content. Every thought should end up in exactly one bucket.
- Don't add things the user didn't say.
- Err on the side of "incubating" for ambiguous items — it's the safe bucket.
- Keep items atomic — one thought per item.`

interface SieveResult {
  actionable: SieveItem[]
  incubating: SieveItem[]
  questions: SieveItem[]
  emotional: SieveItem[]
}

export async function processBrainDump(rawText: string): Promise<SieveResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SIEVE_SYSTEM,
    tools: SIEVE_TOOL,
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Process this brain dump:\n\n${rawText}`,
      },
    ],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Sieve agent did not return a tool call')
  }

  const result = toolBlock.input as {
    actionable: Array<{ text: string }>
    incubating: Array<{ text: string }>
    questions: Array<{ text: string }>
    emotional: Array<{ text: string }>
  }

  return {
    actionable: result.actionable.map(i => ({ text: i.text })),
    incubating: result.incubating.map(i => ({ text: i.text })),
    questions: result.questions.map(i => ({ text: i.text })),
    emotional: result.emotional.map(i => ({ text: i.text })),
  }
}
