import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Note } from '../types'
import { enqueueNoteAnalysis, cancelAnalysis, isAnalysisCancelled } from '../lib/agents/agentQueue'

interface NotesStore {
  notes: Note[]
  addNote: (partial: Partial<Note> & { plainText: string; content: string }) => Note
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  togglePin: (id: string) => void
  getNoteById: (id: string) => Note | undefined
  searchNotes: (query: string) => Note[]
}

function extractTitle(plainText: string): string {
  const firstLine = plainText.split('\n')[0]?.trim() ?? ''
  if (firstLine.length > 0) {
    return firstLine.length > 60 ? firstLine.slice(0, 60) + '…' : firstLine
  }
  return 'Untitled note'
}

function extractTags(plainText: string): string[] {
  const matches = plainText.match(/#([a-zA-Z0-9_-]+)/g) ?? []
  return [...new Set(matches.map(t => t.slice(1)))]
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (partial) => {
        const now = new Date().toISOString()
        const note: Note = {
          id: uuidv4(),
          content: partial.content,
          plainText: partial.plainText,
          title: partial.title ?? extractTitle(partial.plainText),
          tags: partial.tags ?? extractTags(partial.plainText),
          createdAt: now,
          updatedAt: now,
          isPinned: partial.isPinned ?? false,
          isVoiceCapture: partial.isVoiceCapture ?? false,
          sourceType: partial.sourceType ?? 'text',
          wordCount: partial.plainText.split(/\s+/).filter(Boolean).length,
        }
        set(state => ({ notes: [note, ...state.notes] }))
        scheduleAgentAnalysis(note.id)
        // Sync to backend for semantic search (fire-and-forget, retries internally)
        import('../lib/backend').then(m => m.syncNote(note)).catch(err => {
          console.warn('[NotesStore] Backend sync import failed:', err)
        })
        return note
      },

      updateNote: (id, updates) => {
        set(state => ({
          notes: state.notes.map(n => {
            if (n.id !== id) return n
            const updated = { ...n, ...updates, updatedAt: new Date().toISOString() }
            if (updates.plainText !== undefined) {
              updated.title = updates.title ?? extractTitle(updates.plainText)
              updated.tags = updates.tags ?? extractTags(updates.plainText)
              updated.wordCount = updates.plainText.split(/\s+/).filter(Boolean).length
            }
            return updated
          }),
        }))
        // Only re-analyze when content actually changed
        if (updates.plainText !== undefined || updates.content !== undefined) {
          scheduleAgentAnalysis(id)
          // Sync updated note to backend (fire-and-forget, retries internally)
          const updated = get().notes.find(n => n.id === id)
          if (updated) {
            import('../lib/backend').then(m => m.syncNote(updated)).catch(err => {
              console.warn('[NotesStore] Backend sync import failed:', err)
            })
          }
        }
      },

      deleteNote: (id) => {
        cancelAnalysis(id)
        set(state => ({ notes: state.notes.filter(n => n.id !== id) }))
        // Clean up graph + reminders + backend index asynchronously
        Promise.allSettled([
          import('./graphStore').then(m => m.useGraphStore.getState().removeNoteFromGraph(id)),
          import('./remindersStore').then(m => m.useRemindersStore.getState().deleteRemindersForNote(id)),
          import('../lib/backend').then(m => m.deleteNoteFromBackend(id)),
        ]).then(results => {
          const labels = ['graphStore', 'remindersStore', 'backend']
          results.forEach((r, i) => {
            if (r.status === 'rejected') {
              console.warn(`[NotesStore] Cleanup failed (${labels[i]}):`, r.reason)
            }
          })
        })
      },

      togglePin: (id) => {
        set(state => ({
          notes: state.notes.map(n =>
            n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
          ),
        }))
      },

      getNoteById: (id) => get().notes.find(n => n.id === id),

      searchNotes: (query) => {
        if (!query.trim()) return get().notes
        const q = query.toLowerCase()
        return get().notes.filter(n =>
          n.plainText.toLowerCase().includes(q) ||
          n.title.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        )
      },
    }),
    {
      name: 'midwicket-notes',
      version: 1,
    }
  )
)

/**
 * Schedules both agents (graph + reminder) for a note.
 * Uses dynamic imports to prevent circular dependencies.
 * Fire-and-forget — errors are caught and logged only.
 */
function scheduleAgentAnalysis(noteId: string): void {
  enqueueNoteAnalysis(noteId, async (id) => {
    try {
      // Bail out early if note was deleted during debounce
      if (isAnalysisCancelled(id)) return

      const [{ analyzeNoteForGraph }, { analyzeNoteForReminders }] = await Promise.all([
        import('../lib/agents/graphAgent'),
        import('../lib/agents/reminderAgent'),
      ])
      const [{ useGraphStore }, { useRemindersStore }] = await Promise.all([
        import('./graphStore'),
        import('./remindersStore'),
      ])

      // Re-check after async imports — note may have been deleted
      if (isAnalysisCancelled(id)) return

      const { notes } = useNotesStore.getState()
      const note = notes.find(n => n.id === id)
      if (!note || note.plainText.trim().length < 10) return

      await Promise.all([
        analyzeNoteForGraph(note, useGraphStore.getState(), notes),
        analyzeNoteForReminders(note, useRemindersStore.getState()),
      ])

      // ── Reconciliation Agent: cross-system state resolution ──
      // Fires after graph + reminder agents, checks if this note resolves open items
      scheduleReconciliation(note)
    } catch (err) {
      console.warn('[AgentQueue] Analysis failed for note', noteId, err)
    }
  })
}

/**
 * Fires the reconciliation agent after a delay (lets graph/reminder agents settle).
 * Gathers all open state and asks Haiku if the note resolves any of it.
 */
function scheduleReconciliation(note: Note): void {
  setTimeout(async () => {
    try {
      const [{ reconcileNote }, { useRemindersStore }, { useTensionsStore }, { useGraphStore }] =
        await Promise.all([
          import('../lib/agents/reconcileAgent'),
          import('./remindersStore'),
          import('./tensionsStore'),
          import('./graphStore'),
        ])

      const openReminders = useRemindersStore.getState().reminders.filter(r => !r.isDone)
      const openTensions = useTensionsStore.getState().tensions.filter(t => !t.isDismissed && !t.isReconciled)
      const graphState = useGraphStore.getState()
      const graphNodes = graphState.nodes

      // Gather open profile questions across all entities
      const openQuestions = graphNodes
        .filter(n => n.type === 'entity' && n.metadata?.profileQuestions?.length)
        .flatMap(n =>
          n.metadata!.profileQuestions!
            .filter(q => !q.isDismissed && !q.answeredNoteId)
            .map(q => ({ ...q, entityId: n.id }))
        )

      // Tracked entities: people, projects, orgs that the system knows about
      const trackedEntities = graphNodes.filter(n =>
        n.type === 'entity' &&
        n.entityType &&
        ['person', 'project', 'organization'].includes(n.entityType)
      )

      await reconcileNote(note, openReminders, openTensions, openQuestions, trackedEntities, {
        completeReminder: (id) => useRemindersStore.getState().toggleDone(id),
        reconcileTension: (id, noteId) => useTensionsStore.getState().reconcileTension(id, noteId),
        answerQuestion: (entityId, questionId, noteId) =>
          useGraphStore.getState().answerProfileQuestion(entityId, questionId, noteId),
        patchEntity: (entityId, patch) =>
          useGraphStore.getState().patchEntityMetadata(entityId, patch),
      })
    } catch (err) {
      console.warn('[ReconcileAgent] Schedule failed:', err)
    }
  }, 3000) // 3s delay — lets graph + reminder agents finish first
}
