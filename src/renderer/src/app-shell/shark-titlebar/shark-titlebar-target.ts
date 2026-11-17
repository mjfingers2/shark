import type { BrowserViewportPresetId } from '../../../../shared/browser/workspaces/browser-workspace-types'

type BrowserTabLike = { id: string; activePageId?: string | null }
type BrowserPageLike = {
  id: string
  url: string
  viewportPresetId?: BrowserViewportPresetId | null
}

export type SharkTitlebarState = {
  activeWorktreeId: string | null
  activeBrowserTabIdByWorktree: Record<string, string | null>
  browserTabsByWorktree: Record<string, readonly BrowserTabLike[]>
  browserPagesByWorkspace: Record<string, readonly BrowserPageLike[]>
}

export type SharkBrowserTarget = {
  worktreeId: string
  browserPageId: string
  url: string
  viewportPresetId: BrowserViewportPresetId | null
}

/**
 * The preview the titlebar buttons act on: the session's active browser tab, else its first one,
 * and in that tab the active page, else its first. Null when the session has no browser open.
 */
export function resolveSharkBrowserTarget(state: SharkTitlebarState): SharkBrowserTarget | null {
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const tabs = state.browserTabsByWorktree[worktreeId] ?? []
  const activeTabId = state.activeBrowserTabIdByWorktree[worktreeId]
  const tab = tabs.find((candidate) => candidate.id === activeTabId) ?? tabs[0]
  if (!tab) {
    return null
  }
  const pages = state.browserPagesByWorkspace[tab.id] ?? []
  const page = pages.find((candidate) => candidate.id === tab.activePageId) ?? pages[0]
  if (!page) {
    return null
  }
  return {
    worktreeId,
    browserPageId: page.id,
    url: page.url,
    viewportPresetId: page.viewportPresetId ?? null
  }
}
