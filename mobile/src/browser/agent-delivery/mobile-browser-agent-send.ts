import type { AgentSessionHistoryResult } from '../../../../src/shared/agent-session/agent-session-wire'
import { translate } from '../../i18n/mobile-i18n'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import { callAgentSession } from '../../session/native-chat/agent-session/mobile-structured-agent-session-rpc'
import { sendMobileStructuredAgentSessionMessage } from '../../session/native-chat/agent-session/mobile-structured-agent-session-send'
import { structuredSessionOperationId } from '../../session/native-chat/agent-session/structured-session-operation-id'
import { healMobileNativeChatStaleInput } from '../../session/native-chat/composer/delivery/mobile-native-chat-stale-input'
import { reviewTerminalSendRun } from '../../source-control/review/terminal-delivery/mobile-review-terminal-operations'
import { pickBrowserAgentTarget } from './browser-agent-target'

export type BrowserAgentSendOutcome =
  | { status: 'sent' }
  | { status: 'no-agent' }
  | { status: 'failed'; message: string }

const sendFailedText = (): string =>
  translate('browser.agentDelivery.sendFailed', 'Could not send to the agent.')

/** Sends a browser finding to the session's AI the way the desktop does: its chat, else its terminal agent. */
export async function sendBrowserFindingToAgent(input: {
  client: RpcClient
  tabs: readonly MobileSessionTab[]
  text: string
}): Promise<BrowserAgentSendOutcome> {
  const target = pickBrowserAgentTarget(input.tabs)
  if (!target) {
    return { status: 'no-agent' }
  }
  try {
    return target.kind === 'chat'
      ? await sendToChat(input.client, target.sessionId, input.text)
      : await sendToTerminal(input.client, target.terminal, input.text)
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error && error.message ? error.message : sendFailedText()
    }
  }
}

async function sendToChat(
  client: RpcClient,
  sessionId: string,
  text: string
): Promise<BrowserAgentSendOutcome> {
  // A write must name the chat's current owner fence; the browser pane holds no chat subscription to read it from.
  const history = await callAgentSession<AgentSessionHistoryResult>(
    client,
    'agentSession.history',
    { sessionId, direction: 'tail', limit: 1 }
  )
  const fence = history.ok ? history.page.fence : (history.fence ?? history.page.fence)
  if (typeof fence !== 'number') {
    return { status: 'failed', message: sendFailedText() }
  }
  let refusal: string | null = null
  const outcome = await sendMobileStructuredAgentSessionMessage({
    client,
    sessionId,
    expectedRuntimeFence: fence,
    text,
    attachments: [],
    clientMessageId: structuredSessionOperationId(),
    onError: (message) => {
      refusal = message
    }
  })
  return outcome === 'accepted' || outcome === 'queued'
    ? { status: 'sent' }
    : { status: 'failed', message: refusal ?? sendFailedText() }
}

async function sendToTerminal(
  client: RpcClient,
  terminal: string,
  text: string
): Promise<BrowserAgentSendOutcome> {
  // Same path as review notes: clear a leftover image paste so it cannot join this message.
  if (!(await healMobileNativeChatStaleInput({ client, terminal, deviceToken: null }))) {
    return { status: 'failed', message: sendFailedText() }
  }
  const accepted = reviewTerminalSendRun.interpret(
    await reviewTerminalSendRun.request(client, { terminal, text, enter: true })
  )
  return accepted
    ? { status: 'sent' }
    : {
        status: 'failed',
        message: translate('browser.agentDelivery.inputLocked', 'Terminal input is locked')
      }
}
