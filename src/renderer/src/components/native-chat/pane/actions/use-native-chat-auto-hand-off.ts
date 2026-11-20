import { useEffect, useRef } from 'react'
import { shouldAutoHandOffAfterTurn } from '../../../../../../shared/native-chat/auto-hand-off/native-chat-auto-hand-off'
import type { NativeChatHandOff } from './use-native-chat-hand-off'

// One split per conversation, kept across remounts so reopening the tab cannot split it again.
const handedOffSessionIds = new Set<string>()

/**
 * Shark: when a turn ends with the context past the threshold, continue in a new session of the
 * same agent in this tab group. A hidden pane waits until it is shown, so the view never jumps
 * away from a workspace the user is not looking at.
 */
export function useNativeChatAutoHandOff({
  sessionId,
  isWorking,
  percentage,
  hasPendingPrompt,
  handOff
}: {
  sessionId: string
  isWorking: boolean
  percentage: number | null | undefined
  hasPendingPrompt: boolean
  handOff: Pick<NativeChatHandOff, 'available' | 'preparing' | 'startAutomatically'>
}): void {
  const previousWorking = useRef(isWorking)
  // A turn's usage can land just after the turn ends, so the end stays open until the next turn.
  const turnEnded = useRef(false)
  const pending = useRef(false)

  useEffect(() => {
    if (previousWorking.current && !isWorking) {
      turnEnded.current = true
    }
    if (isWorking) {
      turnEnded.current = false
    }
    previousWorking.current = isWorking
    const split = shouldAutoHandOffAfterTurn({
      wasWorking: turnEnded.current,
      isWorking,
      hasPendingPrompt,
      percentage
    })
    if (split) {
      turnEnded.current = false
      if (!handedOffSessionIds.has(sessionId)) {
        pending.current = true
      }
    }
  }, [isWorking, hasPendingPrompt, percentage, sessionId])

  useEffect(() => {
    if (!pending.current || !handOff.available || handOff.preparing) {
      return
    }
    pending.current = false
    handedOffSessionIds.add(sessionId)
    handOff.startAutomatically()
  })
}
