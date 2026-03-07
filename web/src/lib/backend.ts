/**
 * Backend API client for semantic search.
 * All calls are fire-and-forget — backend being down never blocks the frontend.
 * Failed syncs are queued and retried when the backend comes back online.
 */

const BASE_URL = 'http://localhost:8000/api'

export interface BackendSearchResult {
  note_id: string
  title: string
  score: number
  snippet: string
}

interface SearchResponse {
  results: BackendSearchResult[]
  total_indexed: number
}

let _backendAvailable: boolean | null = null
let _retryTimer: ReturnType<typeof setTimeout> | null = null

// Queue of note IDs that failed to sync — will retry when backend is available
const _pendingSyncs = new Map<string, Parameters<typeof syncNote>[0]>()
const _pendingDeletes = new Set<string>()

function _log(level: 'info' | 'warn' | 'error', msg: string, ...args: unknown[]) {
  const prefix = '[Backend]'
  if (level === 'error') console.error(prefix, msg, ...args)
  else if (level === 'warn') console.warn(prefix, msg, ...args)
  else console.info(prefix, msg, ...args)
}

async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) })
    _backendAvailable = res.ok
  } catch {
    _backendAvailable = false
  }
  // Re-check every 30 seconds
  setTimeout(() => { _backendAvailable = null }, 30000)

  // If backend just came back, flush pending syncs
  if (_backendAvailable && (_pendingSyncs.size > 0 || _pendingDeletes.size > 0)) {
    _flushPendingQueue()
  }
  return _backendAvailable
}

async function _flushPendingQueue(): Promise<void> {
  if (_pendingSyncs.size === 0 && _pendingDeletes.size === 0) return
  _log('info', `Flushing ${_pendingSyncs.size} pending syncs, ${_pendingDeletes.size} pending deletes`)

  for (const [id, note] of _pendingSyncs) {
    try {
      await fetch(`${BASE_URL}/notes/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id, title: note.title, plain_text: note.plainText,
          tags: note.tags, created_at: note.createdAt, updated_at: note.updatedAt,
        }),
      })
      _pendingSyncs.delete(id)
    } catch {
      _log('warn', `Retry failed for note ${id.slice(0, 8)}...`)
    }
  }

  for (const id of _pendingDeletes) {
    try {
      await fetch(`${BASE_URL}/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      _pendingDeletes.delete(id)
    } catch {
      _log('warn', `Retry delete failed for note ${id.slice(0, 8)}...`)
    }
  }
}

function _scheduleRetry(): void {
  if (_retryTimer) return
  _retryTimer = setTimeout(() => {
    _retryTimer = null
    _backendAvailable = null // Force re-check which triggers flush
    isBackendAvailable()
  }, 30000)
}

export async function syncNote(note: {
  id: string
  title: string
  plainText: string
  tags: string[]
  createdAt: string
  updatedAt: string
}): Promise<void> {
  // Remove from delete queue if re-syncing
  _pendingDeletes.delete(note.id)

  if (!(await isBackendAvailable())) {
    _pendingSyncs.set(note.id, note)
    _scheduleRetry()
    return
  }
  try {
    const res = await fetch(`${BASE_URL}/notes/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: note.id,
        title: note.title,
        plain_text: note.plainText,
        tags: note.tags,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      }),
    })
    if (!res.ok) {
      _log('warn', `Sync failed (${res.status}) for note ${note.id.slice(0, 8)}...`)
      _pendingSyncs.set(note.id, note)
      _scheduleRetry()
    } else {
      _pendingSyncs.delete(note.id)
    }
  } catch (err) {
    _log('warn', `Sync error for note ${note.id.slice(0, 8)}...`, err)
    _pendingSyncs.set(note.id, note)
    _scheduleRetry()
  }
}

export async function deleteNoteFromBackend(id: string): Promise<void> {
  // Remove from sync queue — no point syncing a deleted note
  _pendingSyncs.delete(id)

  if (!(await isBackendAvailable())) {
    _pendingDeletes.add(id)
    _scheduleRetry()
    return
  }
  try {
    const res = await fetch(`${BASE_URL}/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) {
      _log('warn', `Delete failed (${res.status}) for note ${id.slice(0, 8)}...`)
      _pendingDeletes.add(id)
      _scheduleRetry()
    } else {
      _pendingDeletes.delete(id)
    }
  } catch (err) {
    _log('warn', `Delete error for note ${id.slice(0, 8)}...`, err)
    _pendingDeletes.add(id)
    _scheduleRetry()
  }
}

export async function bulkSyncNotes(notes: Array<{
  id: string
  title: string
  plainText: string
  tags: string[]
  createdAt: string
  updatedAt: string
}>): Promise<number> {
  if (!(await isBackendAvailable())) return 0
  try {
    const res = await fetch(`${BASE_URL}/notes/bulk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: notes.map(n => ({
          id: n.id,
          title: n.title,
          plain_text: n.plainText,
          tags: n.tags,
          created_at: n.createdAt,
          updated_at: n.updatedAt,
        })),
      }),
    })
    const data = await res.json()
    return data.count ?? 0
  } catch {
    return 0
  }
}

export async function semanticSearch(
  query: string,
  limit = 10,
  excludeIds: string[] = [],
): Promise<BackendSearchResult[]> {
  if (!(await isBackendAvailable())) return []
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, exclude_ids: excludeIds }),
    })
    if (!res.ok) return []
    const data: SearchResponse = await res.json()
    return data.results
  } catch {
    return []
  }
}
