export interface Note {
  id: string
  content: string       // TipTap JSON string
  plainText: string     // Extracted plain text for search
  title: string         // First line or auto-generated
  tags: string[]
  createdAt: string     // ISO date
  updatedAt: string
  isPinned: boolean
  isVoiceCapture: boolean
  sourceType: 'text' | 'voice' | 'paste'
  wordCount: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

export type View = 'home' | 'inbox' | 'note' | 'search' | 'graph' | 'reminders' | 'people' | 'work' | 'tensions' | 'sieve' | 'wiki' | 'collisions' | 'pulse' | 'assembly'

export interface UIState {
  view: View
  activeNoteId: string | null
  isChatOpen: boolean
  isSidebarCollapsed: boolean
  searchQuery: string
}

// ─── GRAPH TYPES ─────────────────────────────────────────────────────────────

export type EntityType =
  | 'person'
  | 'place'
  | 'project'
  | 'concept'
  | 'technology'
  | 'organization'
  | 'event'
  | 'idea'

export type NodeType = 'note' | 'entity'

export interface EntityMetadata {
  // Person-specific
  role?: string              // "Product Manager", "CTO"
  organization?: string      // Employer/org: "Anthropic", "ACME Corp"
  relationshipType?: string  // "colleague"|"client"|"mentor"|"advisor"|"friend"|"stakeholder"
  keyFact?: string           // Most important context (≤15 words)
  // Project/Work-specific
  status?: string            // "active"|"planning"|"completed"|"on-hold"
  description?: string       // Brief what/why (≤20 words)
  stakeholders?: string[]    // Person entity names involved in project
  // Organization-specific
  industry?: string
  // Shared
  lastMentionedAt?: string   // ISO date of most recent note mentioning this entity
  // Living context (AI-maintained)
  summary?: string           // ≤100 word current state, maintained by contextAgent
  openQuestions?: string[]   // Outstanding unknowns for this project/org
  blockers?: string[]        // Current blockers
  lastSummaryAt?: string     // ISO date of last context update
  // Wiki synthesis (AI-maintained)
  wiki?: string              // 500-1000 word synthesis page, maintained by wikiAgent
  lastWikiAt?: string        // ISO date of last wiki generation
  wikiVersion?: number       // Incremented each regeneration
  // Evolution tracking
  evolutionSummary?: string  // 100-200 word narrative of how understanding evolved
  lastEvolutionAt?: string   // ISO date of last evolution analysis
  // Profile gap detection (AI-maintained)
  profileQuestions?: ProfileQuestion[]  // What the system doesn't know about this entity
  lastProfileQuestionsAt?: string       // ISO date of last question generation
  // Epistemic confidence (AI-maintained)
  confidence?: EpistemicConfidence
  // Devil's Advocate counter-thesis (AI-maintained)
  counterThesis?: CounterThesis
  // Merge suggestion (theme clustering)
  mergeSuggestion?: MergeSuggestion
  // Provenance tracking (AI-maintained)
  provenancedWiki?: ProvenancedWiki  // structured wiki with source attribution
  // Stale node tracking
  staleDismissedAt?: string  // ISO date — user confirmed "still active", prevents re-prompting
}

export interface ProfileQuestion {
  id: string
  entityId: string            // graph node ID
  entityLabel: string
  entityType: EntityType
  question: string            // the actual question text
  reason: string              // why the system is asking (≤15 words)
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  isDismissed: boolean
  answeredNoteId?: string     // if answered, the note ID created
}

export interface GraphNode {
  id: string
  type: NodeType
  label: string
  entityType?: EntityType   // only when type === 'entity'
  noteIds: string[]         // which notes reference this node
  metadata?: EntityMetadata // enriched context extracted by agent
  createdAt: string
  x?: number                // persisted position from user dragging
  y?: number
}

export type EdgeType =
  | 'contains'          // note → entity
  | 'related_to'        // entity ↔ entity
  | 'shares_concept'    // note ↔ note (shared theme)
  | 'explicitly_links'  // explicit extracted relationship

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  label?: string
  weight: number        // 1–10
  noteIds: string[]
  createdAt: string
}

// ─── TENSION TYPES ───────────────────────────────────────────────────────────

export interface Tension {
  id: string
  noteId: string
  entityLabel: string
  conflictDescription: string  // ≤20 words
  existingFact: string         // what older notes established
  newFact: string              // what this note says
  createdAt: string
  isDismissed: boolean
  isReconciled: boolean
  reconcileNoteId?: string   // ID of synthesis note
  reconcileReason?: string   // ≤15 word explanation of how it was resolved
  blastRadius?: number         // count of downstream entities impacted
  impactedEntities?: string[]  // labels of entities that depend on the contradicted fact
}

// ─── BRAIN DUMP / SIEVE TYPES ───────────────────────────────────────────────

export interface SieveItem {
  text: string
  noteId?: string  // if converted to a note
}

export interface BrainDump {
  id: string
  rawText: string
  actionable: SieveItem[]
  incubating: SieveItem[]
  questions: SieveItem[]
  emotional: SieveItem[]
  createdAt: string
}

// ─── CHAT THREAD TYPES ──────────────────────────────────────────────────────

export interface ChatThread {
  id: string
  topic: string           // short label for the thread
  projectEntity?: string  // linked entity label if applicable
  lastActiveAt: string
  summary?: string        // AI-generated 1-2 sentence state summary
  messageCount: number
}

// ─── USER PROFILE TYPES ─────────────────────────────────────────────────────

export type ThinkingStyle = 'visual' | 'verbal' | 'kinesthetic' | 'mixed'

export interface UserProfile {
  name: string
  role?: string
  organization?: string
  industry?: string
  focusAreas: string[]
  thinkingStyle?: ThinkingStyle
  challengeLevel: number          // 1–5, default 3
  goals: string[]
  customGoal?: string
  onboardedAt: string             // ISO date
  updatedAt: string
}

// ─── REMINDER TYPES ──────────────────────────────────────────────────────────

export type ReminderType = 'task' | 'event' | 'deadline' | 'reminder'
export type ReminderPriority = 'high' | 'medium' | 'low'

export interface Reminder {
  id: string
  noteId: string
  text: string          // verbatim sentence from note
  action: string        // clean imperative: "Call Sarah", "Submit report"
  person?: string
  dateText: string      // original: "next Tuesday", "March 15"
  parsedDate?: string   // ISO 8601 date if resolvable
  type: ReminderType
  priority: ReminderPriority
  isDone: boolean
  createdAt: string
  updatedAt: string
}

// ─── BLINDSPOT TYPES ────────────────────────────────────────────────────────

export interface Blindspot {
  id: string
  category: string           // "Missing Perspective", "Assumption Gap", etc.
  gap: string                // What's missing (1-2 sentences)
  suggestion: string         // Actionable exploration suggestion
  relevantEntities: string[]
}

export interface BlindspotAnalysis {
  id: string
  entityLabel?: string       // If scoped to an entity
  noteIds: string[]          // Notes that were analyzed
  blindspots: Blindspot[]
  createdAt: string
}

// ─── EPISTEMIC CONFIDENCE ───────────────────────────────────────────────────

export type ConfidenceLevel = 'fact' | 'strong_belief' | 'assumption'

export interface EpistemicConfidence {
  level: ConfidenceLevel
  score: number               // 0-100
  reasoning: string           // ≤30 words explaining the assessment
  assessedAt: string          // ISO date
}

// ─── DEVIL'S ADVOCATE ──────────────────────────────────────────────────────

export interface CounterThesis {
  thesis: string              // 100-200 word counter-argument
  assessedAt: string          // ISO date
  wikiVersionAtAssessment: number  // wiki version when generated
}

// ─── MERGE SUGGESTION ──────────────────────────────────────────────────────

export interface MergeSuggestion {
  targetEntityId: string      // the other entity to merge with
  targetLabel: string
  overlapScore: number        // 0-100, percentage of shared notes
  reason: string              // ≤20 words
  isDismissed: boolean
  createdAt: string
}

// ─── COLLISION TYPES ────────────────────────────────────────────────────────

export interface Collision {
  id: string
  nodeA: { id: string; label: string; entityType?: EntityType }
  nodeB: { id: string; label: string; entityType?: EntityType }
  connection: string         // AI-generated creative connection (2-4 sentences)
  provocativeQuestion: string
  strength: number           // 1-10
  createdAt: string
  isBookmarked: boolean
}

// ─── COGNITIVE DEBT ─────────────────────────────────────────────────────────

export interface CognitiveDebt {
  score: number                                       // 0-100
  level: 'low' | 'moderate' | 'high' | 'overloaded'
  tensions: number
  overdueReminders: number
  unprocessedSieve: number
}

// ─── PROVENANCE TYPES ───────────────────────────────────────────────────────

export interface ProvenanceSpan {
  text: string                                // the sentence or clause
  sourceNoteIds: string[]                     // which notes contributed
  confidence: 'direct' | 'inferred' | 'synthesized'
}

export interface ProvenancedWiki {
  spans: ProvenanceSpan[]
  generatedAt: string
  wikiVersion: number
}

// ─── ASSEMBLY ENGINE TYPES ──────────────────────────────────────────────────

export interface AssemblyItem {
  entityId: string
  entityLabel: string
  entityType: EntityType
}

export interface AssemblySection {
  heading: string
  bullets: string[]
  sourceNoteIds: string[]
}

export interface AssemblyOutline {
  id: string
  title: string
  selectedEntities: AssemblyItem[]
  sections: AssemblySection[]
  createdAt: string
}

// ─── AUDIT TRAIL TYPES ──────────────────────────────────────────────────────

export type AuditActionType =
  | 'complete_reminder'
  | 'reopen_reminder'
  | 'reconcile_tension'
  | 'answer_question'
  | 'mutate_entity'
  | 'reopen_project'
  | 'cascade_suggestion'

export interface AuditEntry {
  id: string
  actionType: AuditActionType
  description: string         // human-readable: "Marked 'Call Sarah' as completed"
  reason: string              // agent's reason ≤15 words
  targetId: string            // ID of the affected item (reminder, tension, entity, etc.)
  noteId: string              // the note that triggered this action
  createdAt: string
  isUndone: boolean           // true if user clicked Undo
}

// ─── CASCADE SUGGESTION TYPES ───────────────────────────────────────────────

export interface CascadeSuggestion {
  id: string
  entityId: string
  entityLabel: string
  newStatus: string           // "completed" | "on-hold"
  linkedReminders: Array<{ id: string; action: string }>
  linkedQuestions: Array<{ id: string; question: string; entityId: string }>
  createdAt: string
  isDismissed: boolean
}

// ─── FOCUS MODE TYPES ───────────────────────────────────────────────────────

export interface FocusContext {
  entityId: string
  entityLabel: string
  entityType: EntityType
  noteIds: string[]            // all notes connected to this entity (1-hop)
  relatedEntityIds: string[]   // entities connected via edges
}
