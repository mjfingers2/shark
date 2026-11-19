import { describe, expect, it, vi } from 'vitest'
import {
  createFakeRpcClient,
  rpcSuccess,
  type FakeRpcClient
} from '../test-support/bridge-host-test-fakes'
import { pairBrowserShell, type BrowserPairingDeps } from './browser-shell-pairing'

const PUBLIC_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))

function pairingCode(fields: Record<string, unknown> = {}): string {
  const offer = {
    v: 2,
    endpoint: 'ws://198.51.100.4:6768',
    deviceToken: 'ticket-a',
    publicKeyB64: PUBLIC_KEY,
    ...fields
  }
  return btoa(JSON.stringify(offer)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function answerNext(client: FakeRpcClient, method: string, result: unknown): Promise<void> {
  await vi.waitFor(() => {
    expect(client.requests.at(-1)?.method).toBe(method)
  })
  const request = client.requests.at(-1)!
  request.resolve(rpcSuccess(String(client.requests.length), result))
}

function pairingDeps(client: FakeRpcClient): BrowserPairingDeps & { dials: string[][] } {
  const dials: string[][] = []
  return {
    dials,
    connect: (endpoint, token, key) => {
      dials.push([endpoint, token, key])
      return client
    },
    now: () => 1_700_000_000_000,
    randomBytes: (length) => new Uint8Array(length).fill(171),
    timeoutMs: 5_000
  }
}

describe('pairBrowserShell', () => {
  it('dials the tab’s own origin, swaps the ticket and keeps no relay address', async () => {
    const client = createFakeRpcClient()
    const close = vi.spyOn(client, 'close')
    const deps = pairingDeps(client)
    const paired = pairBrowserShell({
      code: pairingCode(),
      endpoint: 'ws://192.168.0.5:6768',
      existing: null,
      deps
    })
    await answerNext(client, 'status.get', {
      machineName: 'Studio Mac',
      capabilities: ['pairing.ticket-exchange.v1']
    })
    await answerNext(client, 'pairing.exchangeTicket', {
      deviceId: 'device-1'
    })
    await expect(paired).resolves.toEqual({
      endpoint: 'ws://192.168.0.5:6768',
      deviceToken: 'ab'.repeat(24),
      publicKey: PUBLIC_KEY,
      hostId: 'host-1700000000000',
      name: 'Studio Mac'
    })
    expect(deps.dials).toEqual([['ws://192.168.0.5:6768', 'ticket-a', PUBLIC_KEY]])
    expect(close).toHaveBeenCalled()
  })

  it('keeps the code’s token on a desktop without ticket exchange, and the saved host id on re-pair', async () => {
    const client = createFakeRpcClient()
    const paired = pairBrowserShell({
      code: pairingCode(),
      endpoint: 'ws://192.168.0.5:6768',
      existing: {
        endpoint: 'ws://192.168.0.5:6768',
        deviceToken: 'old',
        publicKey: PUBLIC_KEY,
        hostId: 'host-1',
        name: 'Saved'
      },
      deps: pairingDeps(client)
    })
    await answerNext(client, 'status.get', {})
    await expect(paired).resolves.toMatchObject({
      deviceToken: 'ticket-a',
      hostId: 'host-1',
      name: 'Saved'
    })
  })

  it('reads the desktop link form, the phone QR string orca://pair?code=…', async () => {
    const client = createFakeRpcClient()
    const deps = pairingDeps(client)
    const paired = pairBrowserShell({
      code: `orca://pair?code=${pairingCode()}`,
      endpoint: 'ws://192.168.0.5:6768',
      existing: null,
      deps
    })
    await answerNext(client, 'status.get', {})
    await expect(paired).resolves.toMatchObject({ deviceToken: 'ticket-a' })
    expect(deps.dials).toEqual([['ws://192.168.0.5:6768', 'ticket-a', PUBLIC_KEY]])
  })

  it('reports a code it cannot read without dialing', async () => {
    const client = createFakeRpcClient()
    const deps = pairingDeps(client)
    await expect(
      pairBrowserShell({
        code: 'not-a-code',
        endpoint: 'ws://h',
        existing: null,
        deps
      })
    ).rejects.toMatchObject({ reason: 'invalid-code' })
    expect(deps.dials).toEqual([])
  })

  it('reports a desktop that refuses the code as a used link', async () => {
    const client = createFakeRpcClient({ getState: () => 'auth-failed' })
    const paired = pairBrowserShell({
      code: pairingCode(),
      endpoint: 'ws://h',
      existing: null,
      deps: pairingDeps(client)
    })
    await vi.waitFor(() => expect(client.requests).toHaveLength(1))
    client.requests[0]!.reject(new Error('Unauthorized — pairing may be revoked'))
    await expect(paired).rejects.toMatchObject({ reason: 'rejected' })
  })
})
