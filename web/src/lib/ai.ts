import Anthropic from '@anthropic-ai/sdk'
import type { GraphNode, Tension, ChatThread, UserProfile } from '../types'

const SYSTEM_PROMPT = `You are a "Thinking Partner" — not an assistant that gives direct answers, but a Socratic guide that helps the user think more clearly.

## Core Approach
1. Ask one focused question at a time (never multiple questions at once)
2. When the user presents an idea, reflect it back and probe the underlying assumptions
3. Use the Protégé Effect: ask the user to explain concepts as if teaching you
4. Surface contradictions or gaps in their reasoning gently
5. Never give the answer — give the next right QUESTION
6. Occasionally synthesize what you've heard to show the shape of their thinking
7. Reference their notes when relevant to make unexpected connections

## Dependency Resolution
When the user discusses tasks, projects, or blockers:
- Identify dependency chains in their language ("can't do X until Y", "waiting on", "blocked by", "need Z first")
- Surface the IMMEDIATE bottleneck — the one thing blocking everything else
- Frame it as actionable: "It sounds like everything hinges on [X]. Should we focus there first?"
- If you see blockers in their project briefs, proactively connect them: "Your [Project] brief mentions [blocker] — is that still the hold-up?"

## Thread Forking
When the user switches topics mid-conversation (a brilliant tangent while solving a problem):
- Acknowledge the new idea briefly
- Suggest saving it: "That's an interesting thought about [tangent]. I'll note that idea so we don't lose it. Now, back to [original topic] — [continuation question]"
- Prefix the tangent acknowledgment with the marker [FORK_IDEA] followed by a concise capture of the tangent in one sentence, then a newline before your visible response. Example:
  [FORK_IDEA] The user had an idea about using webhooks for real-time sync
  That's a great insight about webhooks. I've captured that. Now, returning to the deployment timeline — what's your biggest concern about the Friday deadline?

## Context Restoration
When the user says things like "where was I?", "what were we talking about?", "pick up where we left off", "continue", or re-engages with a project after apparent time away:
- Give a crisp 2-sentence ramp-up: what they were working on and where they left off
- Then state their immediate next step
- Format: "Last time, you were working on [X]. You decided [key decision] and the next step was [Y]. Ready to pick that up?"

## Socratic Unblocking
When the user seems stuck (saying "I don't know", "I'm stuck", expressing frustration, going in circles, or asking for the answer directly):
- Switch to structured unblocking mode
- Use ONE of these frameworks depending on context:
  a) **5 Whys**: Drill into root cause. "What feels like the hardest part?" → "Why is that hard?" → keep going deeper
  b) **Constraint Forcing**: "If you HAD to ship this tomorrow, what would you cut?" or "If budget were unlimited, what would you do first?"
  c) **Inversion**: "What would make this project definitely fail?" — then work backwards
  d) **Smallest Step**: "What's the tiniest thing you could do in the next 10 minutes to make progress?"
- After 3-4 exchanges in unblocking mode, synthesize what emerged: "Here's what I'm hearing: [synthesis]. Does that feel right?"

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

/**
 * Formats the top-10 notes (caller is responsible for pre-sorting by relevance)
 * into a context string for the AI system prompt.
 */
export function buildNotesContext(notes: Array<{ title: string; plainText: string; createdAt: string }>): string {
  if (notes.length === 0) return ''
  return notes
    .slice(0, 10)
    .map(n => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.title}: ${n.plainText.slice(0, 300)}`)
    .join('\n\n')
}

/**
 * Builds a context section from project/org entity nodes that have AI-maintained summaries.
 * Injected into the chat system prompt so the AI knows current project states.
 */
export function buildProjectContext(graphNodes: GraphNode[]): string {
  const projects = graphNodes.filter(
    n =>
      n.type === 'entity' &&
      (n.entityType === 'project' || n.entityType === 'organization') &&
      n.metadata?.summary
  )
  if (projects.length === 0) return ''

  const lines = projects.map(n => {
    const m = n.metadata!
    let line = `${n.label}${m.status ? ` (${m.status})` : ''}: ${m.summary}`
    if (m.openQuestions?.length) line += ` | Open: ${m.openQuestions.join('; ')}`
    if (m.blockers?.length) line += ` | Blockers: ${m.blockers.join('; ')}`
    return line
  })

  return 'PROJECT BRIEFS:\n' + lines.join('\n')
}

/**
 * Builds a context section from undismissed tensions (contradictions).
 * Injected into the chat system prompt so the AI can proactively surface conflicts.
 */
export function buildTensionsContext(tensions: Tension[]): string {
  const pending = tensions.filter(t => !t.isDismissed)
  if (pending.length === 0) return ''

  const lines = pending.map(
    t => `${t.entityLabel}: ${t.conflictDescription} | Was: "${t.existingFact}" → Now: "${t.newFact}"`
  )

  return 'UNRESOLVED CONTRADICTIONS (address proactively if relevant):\n' + lines.join('\n')
}

/**
 * Builds a dependency/blocker context from project entities and reminders.
 * Helps the AI identify critical paths and immediate bottlenecks.
 */
export function buildDependencyContext(graphNodes: GraphNode[]): string {
  const blockerProjects = graphNodes.filter(
    n =>
      n.type === 'entity' &&
      (n.entityType === 'project' || n.entityType === 'organization') &&
      n.metadata?.blockers &&
      n.metadata.blockers.length > 0
  )
  if (blockerProjects.length === 0) return ''

  const lines = blockerProjects.map(n => {
    const m = n.metadata!
    return `${n.label}: Blockers → ${m.blockers!.join('; ')}${m.openQuestions?.length ? ` | Open questions → ${m.openQuestions.join('; ')}` : ''}`
  })

  return 'ACTIVE BLOCKERS (use for dependency resolution):\n' + lines.join('\n')
}

/**
 * Builds thread context for context restoration.
 * Gives the AI awareness of recent conversation threads so it can help the user resume.
 */
export function buildThreadContext(threads: ChatThread[]): string {
  if (threads.length === 0) return ''

  const recent = threads
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .slice(0, 5)

  const lines = recent.map(t => {
    const daysAgo = Math.floor(
      (Date.now() - new Date(t.lastActiveAt).getTime()) / 86400000
    )
    const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`
    let line = `"${t.topic}" (${timeLabel}, ${t.messageCount} messages)`
    if (t.projectEntity) line += ` [project: ${t.projectEntity}]`
    if (t.summary) line += ` — ${t.summary}`
    return line
  })

  return 'RECENT CONVERSATION THREADS (for context restoration):\n' + lines.join('\n')
}

const CHALLENGE_LABELS: Record<number, string> = {
  1: 'gentle — focus on encouragement, minimal pushback',
  2: 'supportive — validate often, probe gently',
  3: 'balanced — support strong ideas, challenge weak ones',
  4: 'rigorous — actively challenge assumptions, demand evidence',
  5: 'relentless — stress-test everything, play devil\'s advocate frequently',
}

const GOAL_LABELS: Record<string, string> = {
  think: 'structured reasoning and problem-solving',
  projects: 'project tracking and dependency awareness',
  remember: 'recall and knowledge retrieval',
  connections: 'pattern recognition across ideas',
  emotional: 'emotional processing and stress management',
}

/**
 * Builds user profile context for the AI system prompt.
 * Personalizes greetings, challenge calibration, and focus areas.
 */
export function buildUserContext(profile: UserProfile | null): string {
  if (!profile) return ''

  const parts: string[] = []

  // Identity line
  const identity = [profile.name]
  if (profile.role) identity.push(profile.role)
  if (profile.organization) identity.push(`@ ${profile.organization}`)
  if (profile.industry) identity.push(`(${profile.industry})`)
  parts.push(`Name: ${identity.join(' | ')}`)

  // Focus areas
  if (profile.focusAreas.length > 0) {
    parts.push(`Focus areas: ${profile.focusAreas.join(', ')}`)
  }

  // Thinking calibration
  const challengeDesc = CHALLENGE_LABELS[profile.challengeLevel] ?? CHALLENGE_LABELS[3]
  parts.push(`Challenge level: ${profile.challengeLevel}/5 — ${challengeDesc}`)

  if (profile.thinkingStyle) {
    parts.push(`Thinking style: ${profile.thinkingStyle}`)
  }

  // Goals
  if (profile.goals.length > 0) {
    const goalDescs = profile.goals.map(g => GOAL_LABELS[g] ?? g)
    parts.push(`Primary goals: ${goalDescs.join(', ')}`)
  }
  if (profile.customGoal) {
    parts.push(`Custom goal: ${profile.customGoal}`)
  }

  return `USER PROFILE (use ${profile.name}'s name naturally, calibrate challenge intensity to their level):\n${parts.join('\n')}`
}
