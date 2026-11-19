import { describe, expect, it, vi } from 'vitest'
import { createFakeRpcClient, rpcSuccess } from '../test-support/bridge-host-test-fakes'
import { ZERO_SAFE_AREA_INSETS } from '../bridge/page-geometry/bridge-safe-area-insets'
import type { HostStatusReply } from '../../transport/hosts/host-status-reply-schema'
import { createBrowserPageStorage } from './browser-page-storage'
import { createBrowserShellBridge, type BrowserShellBridgeArgs } from './browser-shell-session'
import { createMemoryStore } from './browser-shell-test-store'

const CREDENTIAL = {
  endpoint: 'ws://192.0.2.10:6768',
  deviceToken: 'device-token-a',
  publicKey: 'key',
  hostId: 'host-a',
  name: 'Studio Mac'
}

// Drain both microtask lanes and the promise chains behind them.
async function settle(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function bridgeArgs(overrides: Partial<BrowserShellBridgeArgs> = {}) {
  const rpc = createFakeRpcClient()
  const store = createMemoryStore()
  let status: HostStatusReply | null = { protocolVersion: 1 }
  const args: BrowserShellBridgeArgs = {
    rpc,
    credential: CREDENTIAL,
    route: { pathname: '/h/host-a' },
    sessionId: 'session-a',
    storage: ({ ownsHostArea }) =>
      createBrowserPageStorage({
        store,
        hostId: 'host-a',
        routePathname: '/h/host-a',
        ownsHostArea
      }),
    readHostStatus: () => status,
    geometry: {
      safeAreaInsets: ZERO_SAFE_AREA_INSETS,
      keyboardInset: 0,
      colorScheme: 'dark'
    },
    serveNativeVerb: vi.fn(() => Promise.resolve({ written: true })),
    onNavigate: vi.fn(),
    onNavigateBack: vi.fn(() => 'popped' as const),
    onExternalLink: vi.fn(),
    ...overrides
  }
  return {
    args,
    rpc,
    store,
    setStatus: (next: HostStatusReply | null) => {
      status = next
    }
  }
}

describe('browser shell bridge', () => {
  it('completes the ready/init handshake with the host, route and grants of a host-area page', async () => {
    const { args, store } = bridgeArgs()
    store.setItem('shark-browser-shell:page:orca:pins:host-a', '["wt-1"]')
    const { client, host } = createBrowserShellBridge(args)
    const ready = vi.fn()
    client.onReady(ready)
    await settle()
    const session = client.getShellSession()
    expect(ready).toHaveBeenCalled()
    expect(session).toMatchObject({
      sessionId: 'session-a',
      route: { pathname: '/h/host-a' },
      ownsHostArea: true,
      host: {
        id: 'host-a',
        name: 'Studio Mac',
        endpoint: 'ws://192.0.2.10:6768'
      },
      storage: { 'orca:pins:host-a': '["wt-1"]' },
      colorScheme: 'dark'
    })
    expect(session?.grants.native).toEqual(
      expect.arrayContaining([
        'navigate',
        'storage',
        'native.clipboard.write',
        'native.storage.read'
      ])
    )
    expect(session?.grants.native).not.toContain('terminalKeyRail')
    client.close()
    host.dispose()
  })

  it('opens the page in the language the tab chose, and in the device language otherwise', async () => {
    const chosen = bridgeArgs({ uiLocale: 'ko' })
    const withChoice = createBrowserShellBridge(chosen.args)
    const plain = createBrowserShellBridge(bridgeArgs().args)
    await settle()
    expect(withChoice.client.getShellSession()?.uiLocale).toBe('ko')
    expect(plain.client.getShellSession()?.uiLocale ?? null).toBeNull()
    for (const bridge of [withChoice, plain]) {
      bridge.client.close()
      bridge.host.dispose()
    }
  })

  it('forwards desktop requests with the tab’s identity and saves page storage writes', async () => {
    const { args, rpc, store } = bridgeArgs()
    const { client, host } = createBrowserShellBridge(args)
    await settle()
    expect(client.notifyStorageWrite('orca:hostSidebarWidth', '300')).toBe(true)
    const reply = client.sendRequest('worktree.list')
    await settle()
    const forwarded = rpc.requests.find((request) => request.method === 'worktree.list')
    expect(forwarded).toBeDefined()
    forwarded!.resolve(rpcSuccess('x', { worktrees: [] }))
    await expect(reply).resolves.toMatchObject({
      ok: true,
      result: { worktrees: [] }
    })
    expect(store.getItem('shark-browser-shell:page:orca:hostSidebarWidth')).toBe('300')
    client.close()
    host.dispose()
  })

  it('serves native verbs on the tab and hands navigation to the shell', async () => {
    const { args } = bridgeArgs()
    const { client, host } = createBrowserShellBridge(args)
    await settle()
    await expect(
      client.callNativeVerb('native.clipboard.write', {
        mime: 'text',
        value: 'x'
      })
    ).resolves.toMatchObject({ ok: true, result: { written: true } })
    expect(args.serveNativeVerb).toHaveBeenCalledWith('native.clipboard.write', {
      mime: 'text',
      value: 'x'
    })
    expect(client.notifyNavigate('/settings')).toBe(true)
    await settle()
    expect(args.onNavigate).toHaveBeenCalledWith('/settings', false)
    client.close()
    host.dispose()
  })

  it('holds desktop requests until the connection proves a status', async () => {
    const { args, rpc, setStatus } = bridgeArgs()
    setStatus(null)
    const { client, host } = createBrowserShellBridge(args)
    await settle()
    const reply = client.sendRequest('worktree.list')
    await settle()
    expect(rpc.requests.some((request) => request.method === 'worktree.list')).toBe(false)
    setStatus({ protocolVersion: 1 })
    host.publishHostStatus()
    await settle()
    const forwarded = rpc.requests.find((request) => request.method === 'worktree.list')
    expect(forwarded).toBeDefined()
    forwarded!.resolve(rpcSuccess('x', {}))
    await expect(reply).resolves.toMatchObject({ ok: true })
    client.close()
    host.dispose()
  })
})
