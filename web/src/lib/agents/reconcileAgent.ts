/**
 * Reconciliation Agent — Cross-system state resolver
 *
 * When a new note is saved, this agent checks if the note's content
 * implicitly resolves or mutates open state elsewhere in the system:
 *
 * 1. REMINDERS: "Met with Roger about AIOPs" → auto-completes "Discuss AIOPs tasks with Roger"
 * 2. TENSIONS: "After reconsidering, X is actually Y" → reconciles the tension
 * 3. PROFILE QUESTIONS: "Roger's fallback plan is Z" → answers the profile gap
 * 4. PROJECT STATUS: "Kicked off Project Alpha today" → mutates status planning → active
 * 5. PEOPLE METADATA: "David left Acme and joined StartupCo" → updates org, role
 *
 * Uses Haiku with a single tool call to assess all matches at once.
 * Fires in the background after graph + reminder agents complete.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, Reminder, Tension, ProfileQuestion, GraphNode, EntityMetadata } from '../../types'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// ─── Types ──────────────────────────────────────────────────────────────────

interface CandidateReminder {
  id: string
  action: string
  person?: string
  dateText: string
}

interface CandidateTension {
  id: string
  entityLabel: string
  conflictDescription: string
  existingFact: string
  newFact: string
}

interface CandidateQuestion {
  id: string
  entityId: string
  entityLabel: string
  question: string
}

interface CandidateEntity {
  id: string
  label: string
  entityType: string
  currentStatus?: string
  currentRole?: string
  currentOrganization?: string
  currentDescription?: string
}

interface ReconcileResult {
  completed_reminders: Array<{ id: string; reason: string }>
  reconciled_tensions: Array<{ id: string; reason: string }>
  answered_questions: Array<{ id: string; reason: string }>
  entity_mutations: Array<{
    id: string
    reason: string
    status?: string
    role?: string
    organization?: string
    relationship_type?: string
    description?: string
    key_fact?: string
  }>
}

// ─── Tool Definition ────────────────────────────────────────────────────────

const RECONCILE_TOOL: Anthropic.Tool[] = [
  {
    name: 'reconcile_state',
    description:
      'Determine which open items are resolved by this note AND which entities have state changes. ' +
      'Be conservative — only include items you are confident about.',
    input_schema: {
      type: 'object' as const,
      properties: {
        completed_reminders: {
          type: 'array',
          description: 'Reminders that this note describes as done/completed/addressed.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The reminder ID' },
              reason: { type: 'string', description: 'Why this is completed, ≤15 words' },
            },
            required: ['id', 'reason'],
          },
        },
        reconciled_tensions: {
          type: 'array',
          description: 'Tensions where this note provides a clear resolution or updated position.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The tension ID' },
              reason: { type: 'string', description: 'How it resolves the contradiction, ≤15 words' },
            },
            required: ['id', 'reason'],
          },
        },
        answered_questions: {
          type: 'array',
          description: 'Profile questions that this note clearly answers.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The question ID' },
              reason: { type: 'string', description: 'What the answer is, ≤15 words' },
            },
            required: ['id', 'reason'],
          },
        },
        entity_mutations: {
          type: 'array',
          description: 'Entities (projects, people, orgs) whose metadata should change based on this note. Only include clear, explicit changes.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The entity ID' },
              reason: { type: 'string', description: 'What changed and why, ≤15 words' },
              status: {
                type: 'string',
                enum: ['active', 'planning', 'completed', 'on-hold'],
                description: 'New project/initiative status, if changed',
              },
              role: { type: 'string', description: 'New role for a person, if changed (e.g. "VP of Engineering")' },
              organization: { type: 'string', description: 'New organization for a person, if changed' },
              relationship_type: {
                type: 'string',
                enum: ['colleague', 'client', 'mentor', 'advisor', 'friend', 'stakeholder'],
                description: 'New relationship type, if changed',
              },
              description: { type: 'string', description: 'Updated description for project/org ≤20 words, if significantly changed' },
              key_fact: { type: 'string', description: 'Updated key fact ≤15 words, if the most important context changed' },
            },
            required: ['id', 'reason'],
          },
        },
      },
      required: ['completed_reminders', 'reconciled_tensions', 'answered_questions', 'entity_mutations'],
    },
  },
]

const SYSTEM_PROMPT = `You are a state reconciliation engine for a personal knowledge system.
A user has written a new note. Your job is to determine:
1. Which existing open items (reminders, tensions, questions) are NOW resolved by this note.
2. Which tracked entities (people, projects, organizations) have state changes described in this note.

Rules:
- A reminder is "completed" if the note describes the task as done, finished, discussed, completed, or addressed. Semantic equivalence counts (e.g., "talked to Roger about alignment" completes "Discuss alignment with Roger").
- A tension is "reconciled" if the note provides a clear updated position that resolves the contradiction.
- A question is "answered" if the note contains information that directly addresses what was asked.
- An entity mutation should be emitted when the note clearly describes a change to a tracked entity:
  • Project status changes: "kicked off", "launched", "put on hold", "completed", "shelved" → update status
  • Person role/org changes: "left Acme", "joined StartupCo", "promoted to VP" → update role/organization
  • Relationship changes: "Roger is now my mentor" → update relationship_type
  • Description updates: only if the note reveals a fundamentally new understanding of what the project/org does
  • Key fact updates: only if the most important context about an entity has clearly changed
- Be CONSERVATIVE. Only include items you are confident about. Empty arrays are fine.
- For entity mutations, only include fields that actually changed — omit unchanged fields.`

// ─── Debounce tracking ──────────────────────────────────────────────────────

const lastReconcileAt = new Map<string, number>()
const DEBOUNCE_MS = 5000

// ─── Main exported function ─────────────────────────────────────────────────

export async function reconcileNote(
  note: Note,
  openReminders: Reminder[],
  openTensions: Tension[],
  openQuestions: Array<ProfileQuestion & { entityId: string }>,
  trackedEntities: GraphNode[],
  callbacks: {
    completeReminder: (id: string) => void
    reconcileTension: (id: string, noteId: string) => void
    answerQuestion: (entityId: string, questionId: string, noteId: string) => void
    patchEntity: (entityId: string, patch: Partial<EntityMetadata>) => void
  }
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  // Debounce: skip if we reconciled this note very recently
  const last = lastReconcileAt.get(note.id)
  if (last && Date.now() - last < DEBOUNCE_MS) return
  lastReconcileAt.set(note.id, Date.now())

  // Build candidate lists — pre-filter by word overlap to save tokens
  const noteText = note.plainText.toLowerCase()
  const noteWords = new Set(noteText.split(/\s+/).filter(w => w.length > 3))

  function hasOverlap(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    return words.some(w => noteWords.has(w) || noteText.includes(w))
  }

  const candidateReminders: CandidateReminder[] = openReminders
    .filter(r => hasOverlap(r.action) || (r.person && noteText.includes(r.person.toLowerCase())))
    .slice(0, 10)
    .map(r => ({ id: r.id, action: r.action, person: r.person, dateText: r.dateText }))

  const candidateTensions: CandidateTension[] = openTensions
    .filter(t => hasOverlap(t.entityLabel) || hasOverlap(t.conflictDescription))
    .slice(0, 5)
    .map(t => ({
      id: t.id, entityLabel: t.entityLabel,
      conflictDescription: t.conflictDescription,
      existingFact: t.existingFact, newFact: t.newFact,
    }))

  const candidateQuestions: CandidateQuestion[] = openQuestions
    .filter(q => hasOverlap(q.entityLabel) || hasOverlap(q.question))
    .slice(0, 5)
    .map(q => ({ id: q.id, entityId: q.entityId, entityLabel: q.entityLabel, question: q.question }))

  // Entities: people, projects, orgs that are mentioned in the note
  const candidateEntities: CandidateEntity[] = trackedEntities
    .filter(n => {
      if (!n.entityType || !['person', 'project', 'organization'].includes(n.entityType)) return false
      return noteText.includes(n.label.toLowerCase())
    })
    .slice(0, 8)
    .map(n => ({
      id: n.id, label: n.label, entityType: n.entityType!,
      currentStatus: n.metadata?.status,
      currentRole: n.metadata?.role,
      currentOrganization: n.metadata?.organization,
      currentDescription: n.metadata?.description,
    }))

  // Nothing to reconcile at all
  const hasAnyCandidates =
    candidateReminders.length > 0 ||
    candidateTensions.length > 0 ||
    candidateQuestions.length > 0 ||
    candidateEntities.length > 0

  if (!hasAnyCandidates) return

  try {
    const userContent = buildPrompt(note, candidateReminders, candidateTensions, candidateQuestions, candidateEntities)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      tools: RECONCILE_TOOL,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userContent }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') return

    const result = toolBlock.input as ReconcileResult

    // ── Apply state changes ──────────────────────────────────────────────

    for (const r of result.completed_reminders ?? []) {
      if (candidateReminders.some(cr => cr.id === r.id)) {
        console.log(`[ReconcileAgent] Auto-completing reminder: ${r.reason}`)
        callbacks.completeReminder(r.id)
      }
    }

    for (const t of result.reconciled_tensions ?? []) {
      if (candidateTensions.some(ct => ct.id === t.id)) {
        console.log(`[ReconcileAgent] Reconciling tension: ${t.reason}`)
        callbacks.reconcileTension(t.id, note.id)
      }
    }

    for (const q of result.answered_questions ?? []) {
      const candidate = candidateQuestions.find(cq => cq.id === q.id)
      if (candidate) {
        console.log(`[ReconcileAgent] Answering profile question: ${q.reason}`)
        callbacks.answerQuestion(candidate.entityId, q.id, note.id)
      }
    }

    for (const m of result.entity_mutations ?? []) {
      if (!candidateEntities.some(ce => ce.id === m.id)) continue

      // Build metadata patch from only the fields that were returned
      const patch: Partial<EntityMetadata> = {}
      if (m.status) patch.status = m.status
      if (m.role) patch.role = m.role
      if (m.organization) patch.organization = m.organization
      if (m.relationship_type) patch.relationshipType = m.relationship_type
      if (m.description) patch.description = m.description
      if (m.key_fact) patch.keyFact = m.key_fact

      if (Object.keys(patch).length > 0) {
        const entity = candidateEntities.find(ce => ce.id === m.id)!
        console.log(`[ReconcileAgent] Mutating entity "${entity.label}": ${m.reason}`, patch)
        callbacks.patchEntity(m.id, patch)
      }
    }
  } catch (err) {
    console.warn('[ReconcileAgent] Reconciliation failed for note', note.id, err)
  }
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(
  note: Note,
  reminders: CandidateReminder[],
  tensions: CandidateTension[],
  questions: CandidateQuestion[],
  entities: CandidateEntity[]
): string {
  let prompt = `NEW NOTE:\nTitle: ${note.title}\nText: ${note.plainText}\n\n`

  if (reminders.length > 0) {
    prompt += `OPEN REMINDERS:\n`
    for (const r of reminders) {
      prompt += `- [ID:${r.id}] "${r.action}"${r.person ? ` (person: ${r.person})` : ''}\n`
    }
    prompt += '\n'
  }

  if (tensions.length > 0) {
    prompt += `OPEN TENSIONS:\n`
    for (const t of tensions) {
      prompt += `- [ID:${t.id}] ${t.entityLabel}: "${t.conflictDescription}" — Was: "${t.existingFact}" → Now: "${t.newFact}"\n`
    }
    prompt += '\n'
  }

  if (questions.length > 0) {
    prompt += `UNANSWERED QUESTIONS:\n`
    for (const q of questions) {
      prompt += `- [ID:${q.id}] About ${q.entityLabel}: "${q.question}"\n`
    }
    prompt += '\n'
  }

  if (entities.length > 0) {
    prompt += `TRACKED ENTITIES (current state):\n`
    for (const e of entities) {
      const parts = [`[ID:${e.id}] ${e.label} (${e.entityType})`]
      if (e.currentStatus) parts.push(`status: ${e.currentStatus}`)
      if (e.currentRole) parts.push(`role: ${e.currentRole}`)
      if (e.currentOrganization) parts.push(`org: ${e.currentOrganization}`)
      if (e.currentDescription) parts.push(`desc: "${e.currentDescription}"`)
      prompt += `- ${parts.join(' | ')}\n`
    }
    prompt += '\n'
  }

  prompt += `Analyze the note against all pending state above. Call reconcile_state with any resolutions or mutations.`
  return prompt
}
