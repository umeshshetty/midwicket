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

export type View = 'inbox' | 'note' | 'search' | 'graph' | 'reminders' | 'people' | 'work'

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
