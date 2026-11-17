import { useEffect } from 'react'
import { useAppStore } from '@/store/index'
import type { RuntimeClientTarget } from '../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import type { WorkspacePort } from '../../../../shared/workspace-ports'
import { scanWorkspacePortsForTarget } from '@/lib/workspace-ports/workspace-port-actions'
import { probeWorkspacePortPageForTarget } from '@/lib/workspace-ports/workspace-port-scan-client'
import { browserUrlForPort } from '@/lib/workspace-ports/workspace-port-urls'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { resolveHttpLinkBrowserPlacement } from '@/lib/browser/navigation/http-link-browser-placement'
import {
  createAutoPreviewTracker,
  hasBrowserTabForOrigin,
  markAutoPreviewHandled,
  newAutoPreviewPorts,
  noteAutoPreviewMiss
} from '@/lib/workspace-ports/workspace-port-auto-preview'

const LOCAL_TARGET: RuntimeClientTarget = { kind: 'local' }
// A dev server an agent just started should show up within seconds, not at the 30s background scan.
const AUTO_PREVIEW_SCAN_INTERVAL_MS = 4_000

/**
 * Shark's live preview: when something started inside a session begins serving a web page
 * on this machine, that page opens in a browser beside the session's chat. Servers that were
 * already running when the app opened, and pages already open in a tab, are left alone.
 */
export function WorkspacePortAutoPreview({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled) {
      return
    }
    const tracker = createAutoPreviewTracker()
    let disposed = false
    let scanning = false

    const handleScan = async (ports: readonly WorkspacePort[]): Promise<void> => {
      for (const port of newAutoPreviewPorts(tracker, ports)) {
        const probe = await probeWorkspacePortPageForTarget(LOCAL_TARGET, {
          host: port.connectHost,
          port: port.port,
          protocol: port.protocol === 'https' ? 'https' : 'http'
        }).catch(() => null)
        if (disposed) {
          return
        }
        if (probe?.kind !== 'page') {
          noteAutoPreviewMiss(tracker, port)
          continue
        }
        markAutoPreviewHandled(tracker, port)
        openPreview(port)
      }
    }

    const scan = (): void => {
      if (scanning) {
        return
      }
      scanning = true
      // A private scan: the shared port list keeps its own slower cadence and render churn.
      void scanWorkspacePortsForTarget(LOCAL_TARGET)
        .then((result) =>
          !result.unavailableReason && !disposed ? handleScan(result.ports) : undefined
        )
        .catch((error: unknown) => console.warn('[auto-preview] scan failed', error))
        .finally(() => {
          scanning = false
        })
    }

    scan()
    const stop = installWindowVisibilityInterval({
      run: scan,
      intervalMs: AUTO_PREVIEW_SCAN_INTERVAL_MS,
      slowWhileUnfocused: true
    })
    return () => {
      disposed = true
      stop()
    }
  }, [enabled])
  return null
}

function openPreview(port: WorkspacePort & { kind: 'workspace' }): void {
  const state = useAppStore.getState()
  const worktreeId = port.owner.worktreeId
  const url = browserUrlForPort(port)
  const tabUrls = (state.browserTabsByWorktree[worktreeId] ?? []).map((tab) => tab.url)
  if (hasBrowserTabForOrigin(tabUrls, url)) {
    return
  }
  const placement = resolveHttpLinkBrowserPlacement(state, worktreeId)
  // Beside the chat in the session the user is looking at; quietly added to any other session.
  state.createBrowserTab(worktreeId, url, {
    activate: state.activeWorktreeId === worktreeId,
    ...placement
  })
}
