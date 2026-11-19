import {
  hostStatusProbe,
  readProbedHostStatus
} from '../../transport/connection/host-status-probe-operations'
import type { HostStatusReply } from '../../transport/hosts/host-status-reply-schema'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { BrowserCredential } from './browser-credential-store'

export type BrowserShellConnection = {
  client: RpcClient
  /** The status this connection proved, or null while it is not connected or still asking. */
  readHostStatus: () => HostStatusReply | null
  /** Called whenever readHostStatus changes, so the bridge host can re-send init. */
  onHostStatusChange: (listener: () => void) => () => void
  dispose: () => void
}

export type BrowserShellConnectionDeps = {
  connect: (endpoint: string, deviceToken: string, publicKeyB64: string) => RpcClient
  // Subscribes to the tab coming back into view; returns the unsubscribe.
  onForeground: (listener: () => void) => () => void
}

/**
 * One desktop connection for the tab, plus the verdict the native shell's gates would have proved:
 * the status the desktop answered on this connection. A reconnect asks again, and the page holds
 * desktop-bound requests until it has an answer, exactly as it does under the app.
 */
export function createBrowserShellConnection(
  credential: BrowserCredential,
  deps: BrowserShellConnectionDeps
): BrowserShellConnection {
  const client = deps.connect(credential.endpoint, credential.deviceToken, credential.publicKey)
  const listeners = new Set<() => void>()
  let status: HostStatusReply | null = null
  // Each connected episode gets a number so an answer from an earlier socket cannot land late.
  let episode = 0
  let disposed = false

  const setStatus = (next: HostStatusReply | null): void => {
    if (next === status) {
      return
    }
    status = next
    for (const listener of listeners) {
      listener()
    }
  }

  const askForStatus = (): void => {
    const asked = ++episode
    hostStatusProbe.request(client).then(
      (reply) => {
        if (disposed || asked !== episode || client.getState() !== 'connected') {
          return
        }
        // A readable success proves the socket; an unreadable one still answered, so open with no fields.
        const landed = readProbedHostStatus(reply)
        setStatus(landed === null ? null : (landed.status ?? {}))
      },
      (error: unknown) => {
        console.warn('[browser-shell] the desktop did not answer its status', error)
      }
    )
  }

  const unsubscribeState = client.onStateChange((state) => {
    if (state === 'connected') {
      askForStatus()
      return
    }
    episode += 1
    setStatus(null)
  })
  if (client.getState() === 'connected') {
    askForStatus()
  }
  // Safari suspends a background tab's sockets; nudge the client the way the app does on resume.
  const unsubscribeForeground = deps.onForeground(() => {
    client.notifyForeground('app-resume')
  })

  return {
    client,
    readHostStatus: () => (client.getState() === 'connected' ? status : null),
    onHostStatusChange: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose: () => {
      disposed = true
      listeners.clear()
      unsubscribeState()
      unsubscribeForeground()
      client.close()
    }
  }
}
