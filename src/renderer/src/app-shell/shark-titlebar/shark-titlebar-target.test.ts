import { describe, expect, it } from 'vitest'
import { resolveSharkBrowserTarget, type SharkTitlebarState } from './shark-titlebar-target'

function state(overrides: Partial<SharkTitlebarState> = {}): SharkTitlebarState {
  return {
    activeWorktreeId: 'wt',
    activeBrowserTabIdByWorktree: { wt: 'tab-2' },
    browserTabsByWorktree: { wt: [{ id: 'tab-1' }, { id: 'tab-2', activePageId: 'page-b' }] },
    browserPagesByWorkspace: {
      'tab-1': [{ id: 'page-x', url: 'http://localhost:1' }],
      'tab-2': [
        { id: 'page-a', url: 'http://localhost:2' },
        { id: 'page-b', url: 'http://localhost:3', viewportPresetId: 'mobile-l' }
      ]
    },
    ...overrides
  }
}

describe('resolveSharkBrowserTarget', () => {
  it('picks the active page of the active browser tab', () => {
    expect(resolveSharkBrowserTarget(state())).toEqual({
      worktreeId: 'wt',
      browserPageId: 'page-b',
      url: 'http://localhost:3',
      viewportPresetId: 'mobile-l'
    })
  })

  it('falls back to the first tab and first page when nothing is marked active', () => {
    const target = resolveSharkBrowserTarget(
      state({ activeBrowserTabIdByWorktree: {}, browserTabsByWorktree: { wt: [{ id: 'tab-1' }] } })
    )
    expect(target?.browserPageId).toBe('page-x')
    expect(target?.viewportPresetId).toBeNull()
  })

  it('returns null without a session, a browser tab, or a page', () => {
    expect(resolveSharkBrowserTarget(state({ activeWorktreeId: null }))).toBeNull()
    expect(resolveSharkBrowserTarget(state({ browserTabsByWorktree: { wt: [] } }))).toBeNull()
    expect(resolveSharkBrowserTarget(state({ browserPagesByWorkspace: {} }))).toBeNull()
  })
})
