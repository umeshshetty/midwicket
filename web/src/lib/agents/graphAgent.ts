/**
 * Graph Agent — Two-pass architecture:
 *
 * Pass 1: Extract entities from the new note (Haiku API call)
 * Pass 1b: Look up extracted entity names in the existing graph (local, FREE)
 *           → returns the most relevant related notes (graph-guided retrieval)
 * Pass 2: If related notes found, ask Haiku to identify cross-note relationships,
 *           shared concepts, AND contradictions with established facts (second Haiku API call)
 *
 * After Pass 1: contextAgent fires in background for project/org entities (no await)
 * After Pass 2: any detected contradictions are stored in tensionsStore
 *
 * As the graph grows, link quality IMPROVES because the graph acts as an index.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note, EntityType, EntityMetadata } from '../../types'
import type { useGraphStore } from '../../stores/graphStore'

type GraphStoreState = ReturnType<typeof useGraphStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// ─── Pass 1 Tool ─────────────────────────────────────────────────────────────

const ENTITY_EXTRACTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'extract_entities',
    description: 'Extract named entities from a note. Call exactly once.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Canonical name, title-cased. "Anthropic" not "anthropic".',
              },
              type: {
                type: 'string',
                enum: ['person', 'place', 'project', 'concept', 'technology', 'organization', 'event', 'idea'],
              },
              aliases: {
                type: 'array',
                items: { type: 'string' },
                description: 'Alternative names found in this note, if any.',
              },
              context: {
                type: 'object',
                description: 'Rich context. Fill only fields clearly stated or strongly implied. Omit uncertain fields.',
                properties: {
                  role: { type: 'string', description: 'For persons: job title/role e.g. "Product Manager", "CTO"' },
                  organization: { type: 'string', description: 'For persons: employer or affiliated org' },
                  relationship_type: {
                    type: 'string',
                    enum: ['colleague', 'client', 'mentor', 'advisor', 'friend', 'stakeholder'],
                    description: 'For persons: nature of relationship to the note author',
                  },
                  key_fact: { type: 'string', description: 'Most important context ≤15 words, e.g. "Leading Q2 product launch"' },
                  status: {
                    type: 'string',
                    enum: ['active', 'planning', 'completed', 'on-hold'],
                    description: 'For projects/initiatives: current status',
                  },
                  description: { type: 'string', description: 'For projects/orgs: brief what/why ≤20 words' },
                  stakeholders: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'For projects: person entity names involved',
                  },
                  industry: { type: 'string', description: 'For organizations: industry/sector' },
                },
              },
            },
            required: ['name', 'type'],
          },
        },
      },
      required: ['entities'],
    },
  },
]

const ENTITY_SYSTEM = `You are a knowledge graph extraction engine.
Your ONLY job is to call extract_entities with precise data.
Be conservative: 3 accurate entities beat 10 guesses.
Extract only entities clearly named in the text.
Use canonical, title-cased names.
Fill context fields only when clearly stated or strongly implied — omit uncertain fields entirely.`

// ─── Pass 2 Tool ─────────────────────────────────────────────────────────────

const RELATIONSHIP_TOOLS: Anthropic.Tool[] = [
  {
    name: 'extract_relationships',
    description: 'Identify relationships between entities and conceptual bridges to related notes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from_entity: { type: 'string', description: 'Canonical entity name' },
              to_entity: { type: 'string', description: 'Canonical entity name' },
              label: { type: 'string', description: 'Short verb phrase: "founded", "works at", "uses"' },
              weight: { type: 'number', description: 'Confidence 1-10' },
            },
            required: ['from_entity', 'to_entity', 'label', 'weight'],
          },
        },
        shared_concepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              note_id: { type: 'string' },
              concept: { type: 'string', description: 'Shared theme in 3-6 words' },
            },
            required: ['note_id', 'concept'],
          },
        },
        contradictions: {
          type: 'array',
          description: 'Facts in this note that contradict what the related notes established. Only include clear, specific conflicts.',
          items: {
            type: 'object',
            properties: {
              entity: { type: 'string', description: 'The entity name involved in the contradiction' },
              conflict_description: { type: 'string', description: 'Plain description of the conflict in ≤20 words' },
              existing_fact: { type: 'string', description: 'What the related notes established (≤15 words)' },
              new_fact: { type: 'string', description: 'What this new note says instead (≤15 words)' },
            },
            required: ['entity', 'conflict_description', 'existing_fact', 'new_fact'],
          },
        },
      },
      required: ['relationships', 'shared_concepts', 'contradictions'],
    },
  },
]

const RELATIONSHIP_SYSTEM = `You are a knowledge graph relationship engine.
Call extract_relationships exactly once.
Focus on relationships explicitly stated or strongly implied in the note text.
For shared_concepts, only include notes with genuine thematic overlap — not superficial keyword matches.
For contradictions, only flag specific, concrete conflicts where this note clearly contradicts an established fact in the related notes (e.g., role change, org change, status flip). Omit vague or uncertain conflicts.`

// ─── Pass 1b: Semantic + Graph Index Lookup ─────────────────────────────────

async function findRelatedNotesViaGraph(
  entityNames: string[],
  graphStore: GraphStoreState,
  currentNoteId: string,
  noteText: string
): Promise<{ noteIds: string[]; entityNodeMap: Map<string, string> }> {
  // Build entity label → graph node id map from lexical graph match
  const matched = graphStore.findNodesByLabels(entityNames)
  const entityNodeMap = new Map<string, string>()
  matched.forEach(n => {
    entityNodeMap.set(n.label.toLowerCase(), n.id)
  })

  // Lexical graph lookup — existing behavior (free, instant)
  const graphNoteIds = new Set(
    matched
      .flatMap(n => n.noteIds)
      .filter(id => id !== currentNoteId)
  )

  // Semantic search — hybrid BM25 + vector via backend (if available)
  let semanticNoteIds: string[] = []
  try {
    const { semanticSearch } = await import('../backend')
    const query = entityNames.join(' ') + ' ' + noteText.slice(0, 200)
    const results = await semanticSearch(query, 10, [currentNoteId])
    semanticNoteIds = results.map(r => r.note_id)
  } catch {
    // Backend unavailable — continue with graph-only results
  }

  // Merge: semantic results first (higher quality), then graph results
  const allNoteIds = [...new Set([...semanticNoteIds, ...graphNoteIds])].slice(0, 10)

  return { noteIds: allNoteIds, entityNodeMap }
}

// ─── Main exported function ───────────────────────────────────────────────────

interface ExtractedEntityContext {
  role?: string
  organization?: string
  relationship_type?: string
  key_fact?: string
  status?: string
  description?: string
  stakeholders?: string[]
  industry?: string
}

interface ExtractedEntities {
  entities: Array<{ name: string; type: string; aliases?: string[]; context?: ExtractedEntityContext }>
}

interface ExtractedRelationships {
  relationships: Array<{ from_entity: string; to_entity: string; label: string; weight: number }>
  shared_concepts: Array<{ note_id: string; concept: string }>
  contradictions: Array<{
    entity: string
    conflict_description: string
    existing_fact: string
    new_fact: string
  }>
}

export async function analyzeNoteForGraph(
  note: Note,
  graphStore: GraphStoreState,
  allNotes: Note[]
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return

  graphStore.setProcessing(note.id, true)

  try {
    // ── Pass 1: Extract entities ──────────────────────────────────────────
    const pass1Response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: ENTITY_SYSTEM,
      tools: ENTITY_EXTRACTION_TOOLS,
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Extract named entities from this note.\n\nNote date: ${note.createdAt.slice(0, 10)}\nTitle: ${note.title}\nText: ${note.plainText}`,
        },
      ],
    })

    const pass1Tool = pass1Response.content.find(b => b.type === 'tool_use')
    if (!pass1Tool || pass1Tool.type !== 'tool_use') return

    const { entities } = pass1Tool.input as ExtractedEntities
    if (!entities || entities.length === 0) return

    // ── Pass 1b: Semantic + graph index lookup ────────────────────────────
    const entityNames = entities.map(e => e.name)
    const { noteIds: relatedNoteIds, entityNodeMap: existingEntityMap } =
      await findRelatedNotesViaGraph(entityNames, graphStore, note.id, note.plainText)

    // ── Upsert graph nodes ────────────────────────────────────────────────
    graphStore.upsertNoteNode(note.id, note.title)

    const newEntityNodeMap = new Map<string, string>()
    for (const entity of entities) {
      // Map extracted context fields to EntityMetadata shape
      const metadata: EntityMetadata | undefined = entity.context
        ? {
            role: entity.context.role,
            organization: entity.context.organization,
            relationshipType: entity.context.relationship_type,
            keyFact: entity.context.key_fact,
            status: entity.context.status,
            description: entity.context.description,
            stakeholders: entity.context.stakeholders,
            industry: entity.context.industry,
            lastMentionedAt: note.createdAt.slice(0, 10),
          }
        : { lastMentionedAt: note.createdAt.slice(0, 10) }

      const entityNode = graphStore.upsertEntityNode(
        entity.name,
        entity.type as EntityType,
        note.id,
        metadata
      )
      newEntityNodeMap.set(entity.name.toLowerCase(), entityNode.id)
      // Map aliases too
      entity.aliases?.forEach(alias => {
        newEntityNodeMap.set(alias.toLowerCase(), entityNode.id)
      })
      // note → entity (contains)
      graphStore.upsertEdge(note.id, entityNode.id, 'contains', undefined, 5, note.id)
    }

    // Merge with existing entity map (for Pass 2 relationship resolution)
    const fullEntityMap = new Map([...existingEntityMap, ...newEntityNodeMap])

    // ── Context Agent: update living briefs for project/org entities (background) ──
    const projectOrgEntities = entities.filter(
      e => e.type === 'project' || e.type === 'organization'
    )
    if (projectOrgEntities.length > 0) {
      // Fire-and-forget — don't await, runs in parallel with Pass 2
      import('./contextAgent').then(({ analyzeEntityContext }) => {
        for (const entity of projectOrgEntities) {
          const nodeId = newEntityNodeMap.get(entity.name.toLowerCase())
          if (nodeId) {
            analyzeEntityContext(
              nodeId,
              entity.name,
              entity.type as EntityType,
              note.id,
              note,
              allNotes,
              graphStore
            )
          }
        }
      }).catch(err => console.warn('[GraphAgent] contextAgent import failed', err))
    }

    // ── Wiki Agent: update synthesis pages for entities with 2+ notes (background) ──
    if (entities.length > 0) {
      import('./wikiAgent').then(({ generateEntityWiki }) => {
        for (const entity of entities) {
          const nodeId = newEntityNodeMap.get(entity.name.toLowerCase())
          if (nodeId) {
            generateEntityWiki(
              nodeId,
              entity.name,
              entity.type as EntityType,
              note.id,
              allNotes,
              graphStore
            )
          }
        }
      }).catch(err => console.warn('[GraphAgent] wikiAgent import failed', err))
    }

    // ── Pass 2: Relationship analysis (only if we have related notes) ─────
    if (relatedNoteIds.length > 0) {
      const relatedNotes = allNotes.filter(n => relatedNoteIds.includes(n.id))
      const relatedContext = relatedNotes
        .map(n => `[ID:${n.id}] "${n.title}": ${n.plainText.slice(0, 200)}`)
        .join('\n\n')

      const pass2Response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: RELATIONSHIP_SYSTEM,
        tools: RELATIONSHIP_TOOLS,
        tool_choice: { type: 'any' },
        messages: [
          {
            role: 'user',
            content: `Current note (ID: ${note.id}):
Title: ${note.title}
Text: ${note.plainText}
Entities found: ${entityNames.join(', ')}

Related notes from knowledge graph:
${relatedContext}

Identify entity relationships and shared concepts between the current note and these related notes.`,
          },
        ],
      })

      const pass2Tool = pass2Response.content.find(b => b.type === 'tool_use')
      if (pass2Tool && pass2Tool.type === 'tool_use') {
        const { relationships, shared_concepts, contradictions } =
          pass2Tool.input as ExtractedRelationships

        // Upsert entity↔entity relationships
        for (const rel of relationships) {
          const fromId = fullEntityMap.get(rel.from_entity.toLowerCase())
          const toId = fullEntityMap.get(rel.to_entity.toLowerCase())
          if (fromId && toId && fromId !== toId) {
            graphStore.upsertEdge(fromId, toId, 'related_to', rel.label, rel.weight, note.id)
          }
        }

        // Upsert note↔note shared_concept edges
        for (const sc of shared_concepts) {
          if (relatedNoteIds.includes(sc.note_id)) {
            graphStore.upsertEdge(
              note.id,
              sc.note_id,
              'shares_concept',
              sc.concept,
              7,
              note.id
            )
          }
        }

        // Store detected contradictions in tensionsStore
        if (contradictions && contradictions.length > 0) {
          import('../../stores/tensionsStore')
            .then(({ useTensionsStore }) => {
              const { addTension } = useTensionsStore.getState()
              for (const c of contradictions) {
                addTension({
                  noteId: note.id,
                  entityLabel: c.entity,
                  conflictDescription: c.conflict_description,
                  existingFact: c.existing_fact,
                  newFact: c.new_fact,
                })
              }
            })
            .catch(err => console.warn('[GraphAgent] tensionsStore import failed', err))
        }
      }
    }
  } catch (err) {
    console.warn('[GraphAgent] Analysis failed for note', note.id, err)
  } finally {
    graphStore.setProcessing(note.id, false)
  }
}
