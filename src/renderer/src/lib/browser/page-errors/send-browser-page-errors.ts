import { toast } from 'sonner'
import { useAppStore } from '@/store/index'
import { translate } from '@/i18n/i18n'
import { sendMessageToAgent } from '@/lib/agent-session/messaging/agent-message-send'
import {
  deriveRunningAgentSendTargets,
  deriveStatuslessStructuredAgentSendTargets,
  runningAgentMessageTarget,
  type RunningAgentSendTarget
} from '@/lib/agent-session/messaging/running-agent-targets'
import {
  clearBrowserPageErrors,
  formatBrowserPageErrorsForAgent,
  useBrowserPageErrors
} from './browser-page-errors'

/** The session's chat first; a terminal agent only when the session has no chat to take it. */
function pickAgentTarget(worktreeId: string): RunningAgentSendTarget | null {
  const state = useAppStore.getState()
  const targets = [
    ...deriveRunningAgentSendTargets(state, worktreeId),
    ...deriveStatuslessStructuredAgentSendTargets(state, worktreeId)
  ].filter((target) => target.status === 'eligible')
  return targets.find((target) => target.kind === 'structured-session') ?? targets[0] ?? null
}

export async function sendBrowserPageErrorsToAgent(args: {
  browserPageId: string
  worktreeId: string
  url: string
}): Promise<void> {
  const errors = useBrowserPageErrors.getState().errorsByPageId[args.browserPageId] ?? []
  if (errors.length === 0) {
    return
  }
  const target = pickAgentTarget(args.worktreeId)
  if (!target) {
    toast.error(
      translate(
        'shark.pageErrors.noAgent',
        'Start a chat in this session first, then send the errors.'
      )
    )
    return
  }
  const result = await sendMessageToAgent({
    worktreeId: args.worktreeId,
    target: runningAgentMessageTarget(target),
    prompt: formatBrowserPageErrorsForAgent(args.url, errors)
  })
  if (result.status !== 'sent') {
    toast.error(translate('shark.pageErrors.sendFailed', 'Could not send the errors to the agent.'))
    return
  }
  clearBrowserPageErrors(args.browserPageId)
  toast.success(translate('shark.pageErrors.sent', 'Sent the errors to the agent.'))
}
