import type { BrowserPageError } from '../../../../shared/browser/page-errors/browser-page-error-rules'
import { readBrowserPageErrors } from '../../../browser/guest-lifecycle/page-activity/browser-page-error-log'
import {
  buildElementAtPointScript,
  readElementAtPointResult,
  type BrowserElementAtPoint
} from '../../../browser/element-grab/browser-element-at-point'
import { readDocPreviewGuestDocumentUrl } from '../../../browser/document-preview/doc-preview-guest-policy'
import { BrowserError } from '../../../browser/browser-error'
import type { BrowserCommandTargetParams } from './browser-command-contracts'
import type { RuntimeBrowserCommandTargets } from './browser-command-targets'

export type BrowserPageErrorsResult = {
  browserPageId: string
  url: string
  errors: readonly BrowserPageError[]
}

export type BrowserDescribeElementAtResult = { browserPageId: string } & BrowserElementAtPoint

// Electron's executeJavaScript waits for the page to stop loading; a phone tap must not hang on that.
const DESCRIBE_TIMEOUT_MS = 5_000

/** Read-only page facts for clients that cannot see the desktop renderer (the phone). */
export class RuntimeBrowserPageInspection {
  constructor(
    private readonly targets: Pick<
      RuntimeBrowserCommandTargets,
      'resolveBrowserCommandTarget' | 'resolveBrowserPageWebContents'
    >
  ) {}

  async browserPageErrors(params: BrowserCommandTargetParams): Promise<BrowserPageErrorsResult> {
    const target = await this.targets.resolveBrowserCommandTarget(params)
    const { browserPageId, webContents } = this.targets.resolveBrowserPageWebContents(
      target.worktreeId,
      target.browserPageId
    )
    return {
      browserPageId,
      url: webContents.getURL(),
      errors: readBrowserPageErrors(browserPageId)
    }
  }

  async browserDescribeElementAt(
    params: { x: number; y: number } & BrowserCommandTargetParams
  ): Promise<BrowserDescribeElementAtResult> {
    const target = await this.targets.resolveBrowserCommandTarget(params)
    const { browserPageId, webContents } = this.targets.resolveBrowserPageWebContents(
      target.worktreeId,
      target.browserPageId
    )
    const raw = await runWithTimeout(
      webContents.executeJavaScript(buildElementAtPointScript(params.x, params.y)),
      DESCRIBE_TIMEOUT_MS
    )
    return {
      browserPageId,
      ...readElementAtPointResult(raw, readDocPreviewGuestDocumentUrl(webContents))
    }
  }
}

function runWithTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new BrowserError('browser_timeout', 'The page did not answer in time')),
      timeoutMs
    )
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}
