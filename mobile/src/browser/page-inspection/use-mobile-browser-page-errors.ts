import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { formatBrowserPageErrorsForAgent } from '../../../../src/shared/browser/page-errors/browser-page-error-rules'
import type { BrowserPageError } from '../../../../src/shared/browser/page-errors/browser-page-error-rules'
import { translate } from '../../i18n/mobile-i18n'
import { triggerError, triggerSuccess } from '../../platform/haptics/haptics'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { sendBrowserFindingToAgent } from '../agent-delivery/mobile-browser-agent-send'
import { nextSentBrowserPageErrorKeys, unsentBrowserPageErrors } from './browser-page-error-list'
import { browserPageErrorsRead } from './mobile-browser-page-inspection-operations'

// The desktop chip updates live; a few seconds' lag is fine for a chip the user glances at.
const POLL_INTERVAL_MS = 4_000
// An older desktop refuses the method every time; stop asking after a few refusals.
const MAX_REFUSALS = 3

type PageErrorsArgs = {
  client: RpcClient | null
  worktreeId: string
  browserPageId: string | null
  sessionTabs: readonly MobileSessionTab[]
  onToast: (message: string, durationMs?: number) => void
}

export type MobileBrowserPageErrors = {
  count: number
  sending: boolean
  send: () => void
}

/** Polls the page's console errors while the pane is open and sends the unsent ones to the session's AI. */
export function useMobileBrowserPageErrors(args: PageErrorsArgs): MobileBrowserPageErrors {
  const { client, worktreeId, browserPageId, sessionTabs, onToast } = args
  const [listed, setListed] = useState<{ url: string; errors: readonly BrowserPageError[] }>({
    url: '',
    errors: []
  })
  const [sentKeys, setSentKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!client || !browserPageId) {
      return
    }
    let cancelled = false
    let refusals = 0
    let inFlight = false
    const poll = async (): Promise<void> => {
      if (
        inFlight ||
        refusals >= MAX_REFUSALS ||
        AppState.currentState !== 'active' ||
        client.getState() !== 'connected'
      ) {
        return
      }
      inFlight = true
      try {
        const response = await browserPageErrorsRead.request(
          client,
          { worktree: `id:${worktreeId}`, page: browserPageId },
          { timeoutMs: 8_000, failWhenDisconnected: true }
        )
        refusals = response.ok ? 0 : refusals + 1
        const reply = browserPageErrorsRead.interpret(response)
        if (!cancelled) {
          setListed(reply)
          setSentKeys((previous) => nextSentBrowserPageErrorKeys(previous, reply.errors))
        }
      } catch {
        // Offline or an older desktop: the chip stays hidden.
      } finally {
        inFlight = false
      }
    }
    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [client, worktreeId, browserPageId])

  const unsent = unsentBrowserPageErrors(listed.errors, sentKeys)

  const send = useCallback(() => {
    if (!client || sending || unsent.length === 0) {
      return
    }
    setSending(true)
    const errors = unsent
    void sendBrowserFindingToAgent({
      client,
      tabs: sessionTabs,
      text: formatBrowserPageErrorsForAgent(listed.url, errors)
    })
      .then((outcome) => {
        if (outcome.status === 'sent') {
          triggerSuccess()
          setSentKeys((previous) => nextSentBrowserPageErrorKeys(previous, listed.errors, errors))
          onToast(translate('browser.pageErrors.sent', 'Sent the errors to the AI.'))
          return
        }
        triggerError()
        onToast(
          outcome.status === 'no-agent'
            ? translate(
                'browser.pageErrors.noAgent',
                'Start a chat in this session first, then send the errors.'
              )
            : outcome.message,
          2000
        )
      })
      .finally(() => setSending(false))
  }, [client, sending, unsent, sessionTabs, listed, onToast])

  return { count: unsent.length, sending, send }
}
