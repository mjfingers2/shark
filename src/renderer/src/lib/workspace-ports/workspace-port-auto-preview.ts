import type { WorkspacePort } from '../../../../shared/workspace-ports'

type OwnedPort = WorkspacePort & { kind: 'workspace' }

/** Probes of a listener that is not serving a page yet before it is let go. */
export const AUTO_PREVIEW_MAX_PROBES = 6

export type AutoPreviewTracker = {
  primed: boolean
  /** Listeners already handled: opened, already showing, or never a page. */
  handled: Set<string>
  probes: Map<string, number>
}

export function createAutoPreviewTracker(): AutoPreviewTracker {
  return { primed: false, handled: new Set(), probes: new Map() }
}

export function autoPreviewKey(port: OwnedPort): string {
  return `${port.owner.worktreeId}|${port.port}`
}

function isOwnedPort(port: WorkspacePort): port is OwnedPort {
  // The app's own Electron listeners belong to no project.
  return port.kind === 'workspace' && port.processName !== 'Electron'
}

/**
 * Listeners that appeared since the tracker last looked. The first scan only records what is
 * already running, so opening the app never floods it with previews of old servers; a listener
 * that goes away is forgotten, so starting it again previews it again.
 */
export function newAutoPreviewPorts(
  tracker: AutoPreviewTracker,
  ports: readonly WorkspacePort[]
): OwnedPort[] {
  const owned = ports.filter(isOwnedPort)
  const live = new Set(owned.map(autoPreviewKey))
  for (const key of [...tracker.handled, ...tracker.probes.keys()]) {
    if (!live.has(key)) {
      tracker.handled.delete(key)
      tracker.probes.delete(key)
    }
  }
  if (!tracker.primed) {
    tracker.primed = true
    for (const key of live) {
      tracker.handled.add(key)
    }
    return []
  }
  return owned.filter((port) => !tracker.handled.has(autoPreviewKey(port)))
}

/** Records a probe that found no page yet; true once the listener should be given up on. */
export function noteAutoPreviewMiss(tracker: AutoPreviewTracker, port: OwnedPort): boolean {
  const key = autoPreviewKey(port)
  const misses = (tracker.probes.get(key) ?? 0) + 1
  tracker.probes.set(key, misses)
  if (misses < AUTO_PREVIEW_MAX_PROBES) {
    return false
  }
  tracker.probes.delete(key)
  tracker.handled.add(key)
  return true
}

export function markAutoPreviewHandled(tracker: AutoPreviewTracker, port: OwnedPort): void {
  tracker.probes.delete(autoPreviewKey(port))
  tracker.handled.add(autoPreviewKey(port))
}

/** Whether a browser tab already shows this origin, so the preview is not opened twice. */
export function hasBrowserTabForOrigin(tabUrls: readonly string[], url: string): boolean {
  const origin = originOf(url)
  return origin !== null && tabUrls.some((tabUrl) => originOf(tabUrl) === origin)
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url)
    // localhost, 127.0.0.1 and 0.0.0.0 are the same dev server.
    const host = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)
      ? 'localhost'
      : parsed.hostname
    return `${parsed.protocol}//${host}:${parsed.port}`
  } catch {
    return null
  }
}
