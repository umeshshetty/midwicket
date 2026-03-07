/**
 * Agent Queue — debounces per-note analysis requests.
 * When a note is saved/updated rapidly, only one analysis fires
 * (2s after the last change).
 *
 * Tracks cancelled note IDs so in-flight async callbacks can bail out
 * if the note was deleted while the agent was running.
 */

const DEBOUNCE_MS = 2000
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

// IDs of notes that have been explicitly cancelled (deleted).
// In-flight callbacks should check this before writing results.
const cancelledIds = new Set<string>()

export function enqueueNoteAnalysis(
  noteId: string,
  callback: (id: string) => void
): void {
  // Clear any prior cancellation — note is being re-analyzed
  cancelledIds.delete(noteId)

  // Cancel any pending timer for this note
  if (pendingTimers.has(noteId)) {
    clearTimeout(pendingTimers.get(noteId)!)
  }
  const timer = setTimeout(() => {
    pendingTimers.delete(noteId)
    // Double-check note wasn't deleted during debounce window
    if (cancelledIds.has(noteId)) {
      cancelledIds.delete(noteId)
      return
    }
    callback(noteId)
  }, DEBOUNCE_MS)
  pendingTimers.set(noteId, timer)
}

export function cancelAnalysis(noteId: string): void {
  if (pendingTimers.has(noteId)) {
    clearTimeout(pendingTimers.get(noteId)!)
    pendingTimers.delete(noteId)
  }
  // Mark as cancelled so in-flight async work can bail out
  cancelledIds.add(noteId)
  // Clean up after 30s to prevent unbounded growth
  setTimeout(() => cancelledIds.delete(noteId), 30000)
}

/**
 * Check if a note's analysis was cancelled (e.g., note deleted while agent was running).
 * Agent callbacks should call this before writing results.
 */
export function isAnalysisCancelled(noteId: string): boolean {
  return cancelledIds.has(noteId)
}
