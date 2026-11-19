import { createBridgeHost } from '../host-bridge/bridge-host'
import type { BridgeHost, BridgeHostOptions } from '../host-bridge/bridge-host-contract'
import { createBridgeRpcClient } from '../bridge/bridge-rpc-client'
import type { BridgeRpcClient } from '../bridge/client-state/bridge-rpc-client-contract'
import { createPageDiagnosticReporter } from '../bridge/page-lifecycle/page-bootstrap'

// One FIFO per direction, drained on microtasks: frames keep their order and never re-enter the
// sender's call stack, as they would not across the WebView. A tap's verb call still reaches the
// shell inside the same task, so a window or picker it opens keeps the tap's user activation.
function createMicrotaskLane(deliver: (json: string) => void): (json: string) => void {
  const queue: string[] = []
  let scheduled = false
  const drain = () => {
    scheduled = false
    const next = queue.shift()
    if (next === undefined) {
      return
    }
    try {
      deliver(next)
    } finally {
      schedule()
    }
  }
  const schedule = () => {
    if (!scheduled && queue.length > 0) {
      scheduled = true
      queueMicrotask(drain)
    }
  }
  return (json) => {
    queue.push(json)
    schedule()
  }
}

/**
 * The native shell's bridge host and the page's bridge client in one document, joined by two
 * in-memory lanes instead of the WebView's message channel. Same frames, same validation, same
 * grants: the page cannot tell it is not inside the app.
 */
export function createInPageBridge(options: Omit<BridgeHostOptions, 'post'>): {
  client: BridgeRpcClient
  host: BridgeHost
} {
  let receiveOnPage: ((json: string) => void) | null = null
  const toPage = createMicrotaskLane((json) => receiveOnPage?.(json))
  const host = createBridgeHost({
    ...options,
    post: (json) => {
      toPage(json)
      return Promise.resolve()
    }
  })
  const toShell = createMicrotaskLane((json) => host.receive(json))
  const client = createBridgeRpcClient({
    send: toShell,
    onMessage: (handler) => {
      receiveOnPage = handler
      return () => {
        receiveOnPage = null
      }
    },
    onDiagnostic: createPageDiagnosticReporter()
  })
  return { client, host }
}
