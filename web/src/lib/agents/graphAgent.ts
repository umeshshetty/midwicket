/**
 * Graph Agent — Two-pass architecture:
 *
 * Pass 1: Extract entities from the new note (Haiku API call)
 * Pass 1b: Look up extracted entity names in the existing graph (local, FREE)
 *           → returns the most relevant related notes (graph-guided retrieval)
 * Pass 2: If related notes found, ask Haiku to identify cross-note relationships
 *           and shared concepts (second Haiku API call)
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
      },
      required: ['relationships', 'shared_concepts'],
    },
  },
]

const RELATIONSHIP_SYSTEM = `You are a knowledge graph relationship engine.
Call extract_relationships exactly once.
Focus on relationships explicitly stated or strongly implied in the note text.
For shared_concepts, only include notes with genuine thematic overlap — not superficial keyword matches.`

// ─── Pass 1b: Local Graph Index Lookup ───────────────────────────────────────

function findRelatedNotesViaGraph(
  entityNames: string[],
  graphStore: GraphStoreState,
  currentNoteId: string
): { noteIds: string[]; entityNodeMap: Map<string, string> } {
  const matched = graphStore.findNodesByLabels(entityNames)
  const noteIds = [
    ...new Set(
      matched
        .flatMap(n => n.noteIds)
        .filter(id => id !== currentNoteId)
    ),
  ].slice(0, 10)

  // Build entity label → graph node id map for edge creation
  const entityNodeMap = new Map<string, string>()
  matched.forEach(n => {
    entityNodeMap.set(n.label.toLowerCase(), n.id)
  })

  return { noteIds, entityNodeMap }
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

    // ── Pass 1b: Graph index lookup (no API cost) ─────────────────────────
    const entityNames = entities.map(e => e.name)
    const { noteIds: relatedNoteIds, entityNodeMap: existingEntityMap } =
      findRelatedNotesViaGraph(entityNames, graphStore, note.id)

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
        const { relationships, shared_concepts } = pass2Tool.input as ExtractedRelationships

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
      }
    }
  } catch (err) {
    console.warn('[GraphAgent] Analysis failed for note', note.id, err)
  } finally {
    graphStore.setProcessing(note.id, false)
  }
}
