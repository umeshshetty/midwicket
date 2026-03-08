/**
 * Cognitive Debt — Combined score from pending tensions, overdue reminders,
 * and unprocessed sieve items. Adapts PulseView behavior when high.
 */

import { useMemo } from 'react'
import { useTensionsStore } from '../stores/tensionsStore'
import { useRemindersStore } from '../stores/remindersStore'
import { useSieveStore } from '../stores/sieveStore'
import type { CognitiveDebt } from '../types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function computeCognitiveDebt(
  tensionCount: number,
  overdueCount: number,
  unprocessedSieveCount: number
): CognitiveDebt {
  // Weights: overdue reminders are most urgent, then tensions, then sieve backlog
  const score = Math.min(100, overdueCount * 12 + tensionCount * 8 + unprocessedSieveCount * 3)
  const level: CognitiveDebt['level'] =
    score <= 25 ? 'low' :
    score <= 50 ? 'moderate' :
    score <= 75 ? 'high' : 'overloaded'

  return {
    score,
    level,
    tensions: tensionCount,
    overdueReminders: overdueCount,
    unprocessedSieve: unprocessedSieveCount,
  }
}

export function useCognitiveDebt(): CognitiveDebt {
  const tensions = useTensionsStore(s => s.tensions)
  const reminders = useRemindersStore(s => s.reminders)
  const dumps = useSieveStore(s => s.dumps)

  return useMemo(() => {
    const t = today()
    const tensionCount = tensions.filter(x => !x.isDismissed && !x.isReconciled).length
    const overdueCount = reminders.filter(r => !r.isDone && r.parsedDate && r.parsedDate < t).length

    let unprocessedCount = 0
    for (const dump of dumps) {
      for (const bucket of [dump.actionable, dump.incubating, dump.questions]) {
        unprocessedCount += bucket.filter(i => !i.noteId).length
      }
    }

    return computeCognitiveDebt(tensionCount, overdueCount, unprocessedCount)
  }, [tensions, reminders, dumps])
}
