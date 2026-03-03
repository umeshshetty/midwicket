/**
 * Agent Queue — debounces per-note analysis requests.
 * When a note is saved/updated rapidly, only one analysis fires
 * (2s after the last change).
 */

const DEBOUNCE_MS = 2000
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function enqueueNoteAnalysis(
  noteId: string,
  callback: (id: string) => void
): void {
  // Cancel any pending analysis for this note
  if (pendingTimers.has(noteId)) {
    clearTimeout(pendingTimers.get(noteId)!)
  }
  const timer = setTimeout(() => {
    pendingTimers.delete(noteId)
    callback(noteId)
  }, DEBOUNCE_MS)
  pendingTimers.set(noteId, timer)
}

export function cancelAnalysis(noteId: string): void {
  if (pendingTimers.has(noteId)) {
    clearTimeout(pendingTimers.get(noteId)!)
    pendingTimers.delete(noteId)
  }
}
