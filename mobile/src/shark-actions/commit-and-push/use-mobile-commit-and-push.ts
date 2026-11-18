import { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '../../i18n/mobile-i18n'
import { triggerError, triggerSelection, triggerSuccess } from '../../platform/haptics/haptics'
import type { UnvalidatedRpcRequestPort } from '../../transport/rpc/unvalidated-rpc-request-port'
import { commitAndPushOutcomeText, commitAndPushStepText } from './mobile-commit-and-push-copy'
import { createMobileCommitAndPushPorts } from './mobile-commit-and-push-ports'
import { runMobileCommitAndPush } from './mobile-commit-and-push-run'

// One run per workspace, even when the header remounts mid-run.
const runningWorktrees = new Set<string>()

const STEP_TOAST_MS = 60_000
const RESULT_TOAST_MS = 3_500

/** The header's one-tap commit and push: progress and the result go to the session toast, with a haptic. */
export function useMobileCommitAndPush({
  client,
  worktreeId,
  displayName,
  showToast
}: {
  client: UnvalidatedRpcRequestPort | null
  worktreeId: string
  displayName: string | undefined
  showToast: (message: string, durationMs?: number) => void
}): { running: boolean; run: () => void } {
  const [running, setRunning] = useState(() => runningWorktrees.has(worktreeId))
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(() => {
    if (runningWorktrees.has(worktreeId)) {
      return
    }
    if (!client) {
      triggerError()
      showToast(
        translate('sourceControl.useMobileGitRequests.waitingForDesktop', 'Waiting for desktop...'),
        RESULT_TOAST_MS
      )
      return
    }
    runningWorktrees.add(worktreeId)
    setRunning(true)
    void runMobileCommitAndPush(
      createMobileCommitAndPushPorts(client, worktreeId),
      { displayName },
      (step) => showToast(commitAndPushStepText(step), STEP_TOAST_MS)
    )
      .then((outcome) => {
        showToast(commitAndPushOutcomeText(outcome), RESULT_TOAST_MS)
        if (outcome.kind === 'pushed') {
          triggerSuccess()
        } else if (outcome.kind === 'nothing') {
          triggerSelection()
        } else {
          triggerError()
        }
      })
      .finally(() => {
        runningWorktrees.delete(worktreeId)
        if (mountedRef.current) {
          setRunning(false)
        }
      })
  }, [client, displayName, showToast, worktreeId])

  return { running, run }
}
