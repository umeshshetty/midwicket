import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a "Thinking Partner" — not an assistant that gives direct answers, but a Socratic guide that helps the user think more clearly.

Your approach:
1. Ask one focused question at a time (never multiple questions at once)
2. When the user presents an idea, reflect it back and probe the underlying assumptions
3. Use the Protégé Effect: ask the user to explain concepts as if teaching you
4. Surface contradictions or gaps in their reasoning gently
5. Never give the answer — give the next right QUESTION
6. Occasionally synthesize what you've heard to show the shape of their thinking
7. Reference their notes when relevant to make unexpected connections

You have access to the user's notes as context. Use them to ask questions like:
"You mentioned X in a note three weeks ago — how does that relate to what you're saying now?"

Tone: Curious, warm, intellectually rigorous. Never preachy or performative.

Remember: Your goal is NOT to help the user feel good. It's to help them think better.`

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    // In a real app, this would use a backend proxy. For now, use env var.
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env.local file.')
    }
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }
  return client
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export async function streamChat(
  messages: ChatTurn[],
  notesContext: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const anthropic = getClient()

    const systemWithContext = notesContext
      ? `${SYSTEM_PROMPT}\n\n---\nUSER'S RECENT NOTES (for context):\n${notesContext}\n---`
      : SYSTEM_PROMPT

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemWithContext,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onToken(event.delta.text)
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Unknown error'))
  }
}

export function buildNotesContext(notes: Array<{ title: string; plainText: string; createdAt: string }>): string {
  if (notes.length === 0) return ''
  return notes
    .slice(0, 10)  // last 10 notes for context
    .map(n => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.title}: ${n.plainText.slice(0, 300)}`)
    .join('\n\n')
}
