import { describe, expect, it, vi } from 'vitest'
import type { ConnectionState } from '../../transport/connection/connection-state'
import { createFakeRpcClient, rpcSuccess } from '../test-support/bridge-host-test-fakes'
import { createBrowserShellConnection } from './browser-shell-connection'

const CREDENTIAL = {
  endpoint: 'ws://192.0.2.10:6768',
  deviceToken: 'token-a',
  publicKey: 'key',
  hostId: 'host-1',
  name: 'Mac'
}

describe('browser shell connection', () => {
  it('proves a status per connected episode and drops it when the socket goes', async () => {
    let state: ConnectionState = 'connecting'
    const client = createFakeRpcClient({ getState: () => state })
    let foreground: (() => void) | null = null
    const connection = createBrowserShellConnection(CREDENTIAL, {
      connect: () => client,
      onForeground: (listener) => {
        foreground = listener
        return () => {}
      }
    })
    const changes = vi.fn()
    connection.onHostStatusChange(changes)
    expect(connection.readHostStatus()).toBeNull()

    state = 'connected'
    client.pushState('connected')
    expect(client.requests.map((request) => request.method)).toEqual(['status.get'])
    client.requests[0]!.resolve(rpcSuccess('1', { protocolVersion: 3 }))
    await vi.waitFor(() => expect(connection.readHostStatus()).toEqual({ protocolVersion: 3 }))
    expect(changes).toHaveBeenCalledTimes(1)

    state = 'reconnecting'
    client.pushState('reconnecting')
    expect(connection.readHostStatus()).toBeNull()
    expect(changes).toHaveBeenCalledTimes(2)

    foreground!()
    expect(client.foregroundCalls).toEqual([['app-resume']])
  })

  it('ignores a status that answers after its socket dropped', async () => {
    let state: ConnectionState = 'connected'
    const client = createFakeRpcClient({ getState: () => state })
    const connection = createBrowserShellConnection(CREDENTIAL, {
      connect: () => client,
      onForeground: () => () => {}
    })
    expect(client.requests).toHaveLength(1)
    state = 'reconnecting'
    client.pushState('reconnecting')
    client.requests[0]!.resolve(rpcSuccess('1', { protocolVersion: 3 }))
    await Promise.resolve()
    await Promise.resolve()
    state = 'connected'
    expect(connection.readHostStatus()).toBeNull()
  })
})
