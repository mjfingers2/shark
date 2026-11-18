import { useCallback } from 'react'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { BrowserScreencastFrameMetadata } from '../screencast/browser-screencast-protocol'
import {
  mapScreenToBrowserPoint,
  type BrowserTouchLayout,
  type BrowserZoomState
} from '../page-interaction/browser-touch-geometry'
import { useMobileBrowserPageErrors } from './use-mobile-browser-page-errors'
import { useMobileBrowserElementPointing } from './use-mobile-browser-element-pointing'

type InspectionArgs = {
  client: RpcClient | null
  worktreeId: string
  browserPageId: string | null
  sessionTabs: readonly MobileSessionTab[]
  onToast: (message: string, durationMs?: number) => void
  layoutRef: { current: BrowserTouchLayout | null }
  frameMetadataRef: { current: BrowserScreencastFrameMetadata | null }
  zoomRef: { current: BrowserZoomState }
}

/** Shark's preview tools for one browser pane: the page's error chip and point-at-an-element. */
export function useMobileBrowserInspection(args: InspectionArgs) {
  const { client, worktreeId, browserPageId, sessionTabs, onToast } = args
  const { layoutRef, frameMetadataRef, zoomRef } = args
  const mapScreenPoint = useCallback(
    (x: number, y: number) =>
      mapScreenToBrowserPoint(x, y, layoutRef.current, frameMetadataRef.current, zoomRef.current),
    [frameMetadataRef, layoutRef, zoomRef]
  )
  const pageErrors = useMobileBrowserPageErrors({
    client,
    worktreeId,
    browserPageId,
    sessionTabs,
    onToast
  })
  const pointing = useMobileBrowserElementPointing({
    client,
    worktreeId,
    browserPageId,
    sessionTabs,
    onToast,
    mapScreenPoint
  })
  return { pageErrors, pointing }
}
