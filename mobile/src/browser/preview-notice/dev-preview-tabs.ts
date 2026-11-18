import { isBlankBrowserUrl } from '../pane-view/browser-url'

/** Which browser tabs the notice has already judged, and whether it has seen the session's first list. */
export type DevPreviewTrackerState = {
  seeded: boolean
  judgedTabIds: ReadonlySet<string>
}

type TabRow = { type: string; id: string; url?: string }

export const INITIAL_DEV_PREVIEW_TRACKER: DevPreviewTrackerState = {
  seeded: false,
  judgedTabIds: new Set()
}

function isPrivateLanIpv4(host: string): boolean {
  const parts = host.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }
  const [a, b] = parts
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}

/** A page a dev server on this machine or its LAN serves: what the desktop opens on its own. */
export function isDevPreviewUrl(url: string | undefined): boolean {
  let parsed: URL
  try {
    parsed = new URL(url ?? '')
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.startsWith('127.') ||
    host === '0.0.0.0' ||
    host === '[::1]'
  ) {
    return true
  }
  // A LAN address alone may be a router page; a dev server answers on its own port.
  return parsed.port !== '' && isPrivateLanIpv4(host)
}

/**
 * Judges the session's browser tabs once each. Tabs present at the first list were there before
 * the user looked, so they never raise the notice; a later tab raises it once if it shows a dev
 * preview, and a blank one waits for its first URL.
 */
export function advanceDevPreviewTracker(
  state: DevPreviewTrackerState,
  tabs: readonly TabRow[],
  activeTabId: string | null
): { state: DevPreviewTrackerState; noticeTabId: string | null } {
  const browserTabs = tabs.filter((tab) => tab.type === 'browser')
  if (!state.seeded) {
    return {
      state: { seeded: true, judgedTabIds: new Set(browserTabs.map((tab) => tab.id)) },
      noticeTabId: null
    }
  }
  const judged = new Set<string>()
  let noticeTabId: string | null = null
  for (const tab of browserTabs) {
    if (state.judgedTabIds.has(tab.id) || tab.id === activeTabId) {
      judged.add(tab.id)
      continue
    }
    if (isDevPreviewUrl(tab.url)) {
      judged.add(tab.id)
      noticeTabId = tab.id
    } else if (!isBlankBrowserUrl(tab.url)) {
      judged.add(tab.id)
    }
  }
  // Ids of closed tabs drop out so the set stays the size of the tab strip.
  return { state: { seeded: true, judgedTabIds: judged }, noticeTabId }
}
