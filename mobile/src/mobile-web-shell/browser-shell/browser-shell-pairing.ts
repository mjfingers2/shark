import { parsePairingCode } from '../../pairing/pairing-code'
import { exchangePairingTicket } from '../../pairing/pairing-ticket-exchange'
import {
  hostStatusProbe,
  readProbedHostStatus
} from '../../transport/connection/host-status-probe-operations'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { AUTH_REJECTED } from '../../transport/rpc/rpc-client-authentication-retry'
import type { BrowserCredential } from './browser-credential-store'

// rejected: the desktop refused the code, usually because the link was already used.
export type BrowserPairingFailure = 'invalid-code' | 'unreachable' | 'rejected'

export class BrowserPairingError extends Error {
  readonly reason: BrowserPairingFailure

  constructor(reason: BrowserPairingFailure, message: string) {
    super(message)
    this.name = 'BrowserPairingError'
    this.reason = reason
  }
}

export type BrowserPairingDeps = {
  connect: (endpoint: string, deviceToken: string, publicKeyB64: string) => RpcClient
  now: () => number
  randomBytes: (length: number) => Uint8Array
  // How long the first answer may take before the link is reported unreachable.
  timeoutMs: number
}

function withinDeadline<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`the desktop did not answer within ${String(timeoutMs)} ms`))
    }, timeoutMs)
  })
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer))
}

/**
 * Pairs this tab with the desktop that served it, the way the phone pairs from a scanned code:
 * dial with the code's token, read the host status, then swap the code's ticket for a token minted
 * here so the link stops working. The tab always dials its own origin (`endpoint`), never the
 * code's LAN or relay addresses: the desktop it loaded from is the one it can reach.
 */
export async function pairBrowserShell(args: {
  code: string
  endpoint: string
  existing: BrowserCredential | null
  deps: BrowserPairingDeps
}): Promise<BrowserCredential> {
  const { code, endpoint, existing, deps } = args
  const offer = parsePairingCode(code)
  if (offer === null) {
    throw new BrowserPairingError('invalid-code', 'the link does not carry a pairing code')
  }
  const client = deps.connect(endpoint, offer.deviceToken, offer.publicKeyB64)
  try {
    const reply = await withinDeadline(hostStatusProbe.request(client), deps.timeoutMs)
    const status = readProbedHostStatus(reply)?.status ?? null
    const deviceToken = await withinDeadline(
      exchangePairingTicket({
        client,
        status,
        ticket: offer.deviceToken,
        log: () => {},
        randomBytes: deps.randomBytes
      }),
      deps.timeoutMs
    )
    // Re-pairing the same desktop keeps its id, so stored preferences stay with it.
    const sameHost = existing !== null && existing.publicKey === offer.publicKeyB64
    return {
      endpoint,
      deviceToken,
      publicKey: offer.publicKeyB64,
      hostId: sameHost ? existing.hostId : `host-${String(deps.now())}`,
      name: status?.machineName?.trim() || (sameHost ? existing.name : 'Desktop')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'the desktop could not be reached'
    throw new BrowserPairingError(
      message.includes(AUTH_REJECTED) || client.getState() === 'auth-failed'
        ? 'rejected'
        : 'unreachable',
      message
    )
  } finally {
    client.close()
  }
}
