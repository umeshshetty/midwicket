/**
 * Schema migration system for Zustand persisted stores.
 *
 * Each store can register a `migrate` function with Zustand's persist middleware.
 * This module provides helpers for common migration patterns and data integrity checks.
 *
 * Usage in a store:
 * ```
 * persist(storeImpl, {
 *   name: 'midwicket-notes',
 *   version: 2,
 *   migrate: createMigrator({
 *     2: (state) => ({ ...state, newField: 'default' }),
 *   }),
 * })
 * ```
 */

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>

/**
 * Creates a Zustand-compatible `migrate` function from a version→fn map.
 * Runs migrations sequentially from persisted version → current version.
 */
export function createMigrator(
  migrations: Record<number, MigrationFn>
): (persisted: unknown, version: number) => unknown {
  return (persisted: unknown, fromVersion: number) => {
    let state = persisted as Record<string, unknown>

    const versions = Object.keys(migrations)
      .map(Number)
      .filter(v => v > fromVersion)
      .sort((a, b) => a - b)

    for (const v of versions) {
      try {
        state = migrations[v](state)
        console.info(`[Migration] ${fromVersion} → ${v} applied`)
      } catch (err) {
        console.error(`[Migration] Failed at version ${v}:`, err)
        // Return state as-is rather than crashing the app
        break
      }
    }

    return state
  }
}

/**
 * Run a one-time integrity check on persisted localStorage data.
 * Called on app startup to detect and repair corrupted state.
 */
export function checkStorageIntegrity(): void {
  const storeKeys = [
    'midwicket-notes',
    'midwicket-graph',
    'midwicket-reminders',
    'midwicket-threads',
    'midwicket-tensions',
    'midwicket-sieve',
  ]

  for (const key of storeKeys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
        console.warn(`[Integrity] ${key}: invalid shape, clearing`)
        localStorage.removeItem(key)
      }
    } catch (err) {
      console.error(`[Integrity] ${key}: corrupt JSON, clearing`, err)
      localStorage.removeItem(key)
    }
  }
}

/**
 * Estimate total localStorage usage in bytes.
 * Useful for warning users approaching the ~5-10MB browser limit.
 */
export function estimateStorageUsage(): { totalBytes: number; byKey: Record<string, number> } {
  const byKey: Record<string, number> = {}
  let totalBytes = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('midwicket-')) continue
    const val = localStorage.getItem(key) ?? ''
    const bytes = (key.length + val.length) * 2 // UTF-16
    byKey[key] = bytes
    totalBytes += bytes
  }

  return { totalBytes, byKey }
}
