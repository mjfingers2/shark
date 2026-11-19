import { describe, expect, it } from 'vitest'
import { createBrowserPageStorage } from './browser-page-storage'
import { createMemoryStore } from './browser-shell-test-store'

describe('browser page storage', () => {
  it('hands init the allowlisted keys this tab saved, and saves page writes', () => {
    const store = createMemoryStore()
    const storage = createBrowserPageStorage({
      store,
      hostId: 'host-a',
      routePathname: '/h/host-a',
      ownsHostArea: true
    })
    storage.writeStorage('orca:pins:host-a', '["wt-1"]')
    storage.writeStorage('orca:hostSidebarWidth', '320')
    expect(storage.readStorage()).toEqual({
      storage: {
        'orca:hostSidebarWidth': '320',
        'orca:pins:host-a': '["wt-1"]'
      },
      storageOversize: []
    })
    storage.writeStorage('orca:hostSidebarWidth', null)
    expect(storage.readStorage().storage).toEqual({
      'orca:pins:host-a': '["wt-1"]'
    })
  })

  it('never stores keys outside the allowlist or another host', () => {
    const store = createMemoryStore()
    const storage = createBrowserPageStorage({
      store,
      hostId: 'host-a',
      routePathname: '/h/host-a',
      ownsHostArea: false
    })
    storage.writeStorage('orca:hosts', 'stolen')
    storage.writeStorage('orca:pins:host-b', '[]')
    expect([...store.values.keys()]).toEqual([])
  })

  it('reads workspace keys only for a host-area page', async () => {
    const store = createMemoryStore()
    const key = 'orca:terminalDrafts:host-a:wt-1'
    store.setItem(`shark-browser-shell:page:${key}`, 'draft')
    const owner = createBrowserPageStorage({
      store,
      hostId: 'host-a',
      routePathname: '/h/host-a',
      ownsHostArea: true
    })
    await expect(owner.readWorkspaceKey(key)).resolves.toBe('draft')
    const detail = createBrowserPageStorage({
      store,
      hostId: 'host-a',
      routePathname: '/h/host-a/tasks',
      ownsHostArea: false
    })
    await expect(detail.readWorkspaceKey(key)).rejects.toThrow('may not read')
  })
})
