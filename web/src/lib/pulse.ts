import { useMemo } from 'react'
import { useGraphStore } from '../stores/graphStore'
import { useTensionsStore } from '../stores/tensionsStore'
import { useBlindspotStore } from '../stores/blindspotStore'

export interface PulseCounts {
  tensions: number
  blockers: number
  openQuestions: number
  profileQuestions: number
  blindspots: number
  sparse: number
  total: number
  actionable: number // tensions + blockers + openQuestions + profileQuestions
}

const THIRTY_DAYS = 30 * 86400000

export function usePulseCounts(): PulseCounts {
  const tensions = useTensionsStore(s => s.tensions)
  const nodes = useGraphStore(s => s.nodes)
  const analyses = useBlindspotStore(s => s.analyses)

  return useMemo(() => {
    const tensionCount = tensions.filter(t => !t.isDismissed && !t.isReconciled).length

    let blockerCount = 0
    let questionCount = 0
    let profileQuestionCount = 0
    let sparseCount = 0
    const now = Date.now()

    for (const n of nodes) {
      if (n.type !== 'entity') continue
      if (n.metadata?.blockers?.length) blockerCount += n.metadata.blockers.length
      if (n.metadata?.openQuestions?.length) questionCount += n.metadata.openQuestions.length
      if (n.metadata?.profileQuestions?.length) {
        profileQuestionCount += n.metadata.profileQuestions.filter(
          q => !q.isDismissed && !q.answeredNoteId
        ).length
      }
      const isSparse = n.noteIds.length <= 1
      const isStale = n.metadata?.lastMentionedAt
        ? (now - new Date(n.metadata.lastMentionedAt).getTime()) > THIRTY_DAYS
        : false
      if (isSparse || isStale) sparseCount++
    }

    const blindspotCount = analyses.reduce((sum, a) => sum + a.blindspots.length, 0)
    const actionable = tensionCount + blockerCount + questionCount + profileQuestionCount

    return {
      tensions: tensionCount,
      blockers: blockerCount,
      openQuestions: questionCount,
      profileQuestions: profileQuestionCount,
      blindspots: blindspotCount,
      sparse: sparseCount,
      total: actionable + blindspotCount + sparseCount,
      actionable,
    }
  }, [tensions, nodes, analyses])
}
