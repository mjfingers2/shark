// Why (Shark): a long conversation slows the agent and burns the plan; past this share of the
// window the chat continues in a fresh session in the same tab group, carrying a focused summary.
export const AUTO_HAND_OFF_CONTEXT_PERCENTAGE = 40

/**
 * True at the moment a turn ends with the context at or past the threshold. A session that is
 * only opened (never seen working) does not split, nor does one waiting on the user's answer.
 */
export function shouldAutoHandOffAfterTurn(args: {
  wasWorking: boolean
  isWorking: boolean
  hasPendingPrompt: boolean
  percentage: number | null | undefined
}): boolean {
  const { percentage } = args
  if (!args.wasWorking || args.isWorking || args.hasPendingPrompt) {
    return false
  }
  return (
    typeof percentage === 'number' &&
    Number.isFinite(percentage) &&
    percentage >= AUTO_HAND_OFF_CONTEXT_PERCENTAGE
  )
}
