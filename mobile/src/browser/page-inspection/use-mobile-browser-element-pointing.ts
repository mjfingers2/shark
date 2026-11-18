import { useCallback, useState } from 'react'
import { formatBrowserElementFeedbackForAgent } from '../../../../src/shared/browser/annotations/browser-element-feedback'
import type { BrowserAnnotationPayload } from '../../../../src/shared/browser/element-grab/browser-grab-types'
import { translate } from '../../i18n/mobile-i18n'
import { triggerError, triggerSelection, triggerSuccess } from '../../platform/haptics/haptics'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { sendBrowserFindingToAgent } from '../agent-delivery/mobile-browser-agent-send'
import type { BrowserPoint } from '../page-interaction/browser-touch-geometry'
import { browserDescribeElementAtRead } from './mobile-browser-page-inspection-operations'

type PointingArgs = {
  client: RpcClient | null
  worktreeId: string
  browserPageId: string | null
  sessionTabs: readonly MobileSessionTab[]
  onToast: (message: string, durationMs?: number) => void
  /** Pane touch point to page CSS point; null outside the streamed frame. */
  mapScreenPoint: (x: number, y: number) => BrowserPoint | null
}

export type MobileBrowserElementPointing = {
  active: boolean
  describing: boolean
  picked: BrowserAnnotationPayload | null
  sending: boolean
  toggle: () => void
  pickAt: (screenX: number, screenY: number) => void
  sendComment: (comment: string) => void
  cancelComment: () => void
}

/** The desktop's annotate grab, by tap: point at an element, comment, and the session's AI gets both. */
export function useMobileBrowserElementPointing(args: PointingArgs): MobileBrowserElementPointing {
  const { client, worktreeId, browserPageId, sessionTabs, onToast, mapScreenPoint } = args
  const [active, setActive] = useState(false)
  const [describing, setDescribing] = useState(false)
  const [picked, setPicked] = useState<BrowserAnnotationPayload | null>(null)
  const [sending, setSending] = useState(false)

  const toggle = useCallback(() => {
    triggerSelection()
    setActive((current) => !current)
  }, [])

  const pickAt = useCallback(
    (screenX: number, screenY: number) => {
      const point = mapScreenPoint(screenX, screenY)
      if (!client || !browserPageId || !point || describing) {
        return
      }
      setDescribing(true)
      void browserDescribeElementAtRead
        .request(
          client,
          { worktree: `id:${worktreeId}`, page: browserPageId, x: point.x, y: point.y },
          { timeoutMs: 10_000 }
        )
        .then((response) => {
          const reply = browserDescribeElementAtRead.interpret(response)
          if (reply.kind === 'element') {
            triggerSelection()
            setPicked(reply.payload)
            return
          }
          triggerError()
          onToast(
            reply.reason === 'grab-active'
              ? translate(
                  'browser.pointing.desktopBusy',
                  'Finish pointing on the desktop first, then try again.'
                )
              : translate('browser.pointing.nothingThere', 'No element there. Tap another spot.'),
            1800
          )
        })
        .catch((error: unknown) => {
          triggerError()
          onToast(
            error instanceof Error && error.message
              ? error.message
              : translate('browser.pointing.failed', 'Could not read that element.'),
            1800
          )
        })
        .finally(() => setDescribing(false))
    },
    [client, worktreeId, browserPageId, describing, mapScreenPoint, onToast]
  )

  const sendComment = useCallback(
    (comment: string) => {
      const payload = picked
      const trimmed = comment.trim()
      if (!client || !browserPageId || !payload || !trimmed || sending) {
        return
      }
      setSending(true)
      void sendBrowserFindingToAgent({
        client,
        tabs: sessionTabs,
        text: formatBrowserElementFeedbackForAgent({
          browserPageId,
          payload,
          comment: trimmed,
          createdAt: new Date().toISOString()
        })
      })
        .then((outcome) => {
          if (outcome.status === 'sent') {
            triggerSuccess()
            setPicked(null)
            setActive(false)
            onToast(translate('browser.pointing.sent', 'Sent your comment to the AI.'))
            return
          }
          triggerError()
          onToast(
            outcome.status === 'no-agent'
              ? translate(
                  'browser.pointing.noAgent',
                  'Start a chat in this session first, then send your comment.'
                )
              : outcome.message,
            2000
          )
        })
        .finally(() => setSending(false))
    },
    [client, browserPageId, picked, sending, sessionTabs, onToast]
  )

  const cancelComment = useCallback(() => setPicked(null), [])

  return { active, describing, picked, sending, toggle, pickAt, sendComment, cancelComment }
}
