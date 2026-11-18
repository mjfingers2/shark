import {
  appendBrowserPageError,
  isConsoleErrorLevel,
  type BrowserPageError
} from '../../../../shared/browser/page-errors/browser-page-error-rules'

/** The slice of a guest webContents the log listens to; a fake in tests. */
export type BrowserPageErrorGuest = Pick<Electron.WebContents, 'on' | 'off' | 'isDestroyed'>

type ConsoleMessageDetails = Pick<
  Electron.WebContentsConsoleMessageEventParams,
  'level' | 'message' | 'lineNumber' | 'sourceId'
>

// The renderer keeps its own list for the desktop chip; this one serves clients that read over RPC (the phone).
const errorsByPageId = new Map<string, readonly BrowserPageError[]>()

const NO_ERRORS: readonly BrowserPageError[] = []

/** Collects a guest's console errors under its current page id until its next full navigation. */
export function installBrowserPageErrorCollection(
  guest: BrowserPageErrorGuest,
  resolvePageId: () => string | undefined
): () => void {
  let lastPageId: string | undefined
  const onConsoleMessage = (details: ConsoleMessageDetails): void => {
    const pageId = resolvePageId()
    if (!pageId || !isConsoleErrorLevel(details.level)) {
      return
    }
    lastPageId = pageId
    const current = errorsByPageId.get(pageId) ?? NO_ERRORS
    const next = appendBrowserPageError(current, {
      message: String(details.message ?? ''),
      source: typeof details.sourceId === 'string' ? details.sourceId : '',
      line: Number.isFinite(details.lineNumber) ? details.lineNumber : 0
    })
    if (next !== current) {
      errorsByPageId.set(pageId, next)
    }
  }
  // Same rule as the desktop chip: a full load starts a fresh list; SPA route changes keep it.
  const onNavigate = (): void => {
    const pageId = resolvePageId() ?? lastPageId
    if (pageId) {
      errorsByPageId.delete(pageId)
    }
  }
  guest.on('console-message', onConsoleMessage)
  guest.on('did-navigate', onNavigate)
  return () => {
    const pageId = resolvePageId() ?? lastPageId
    if (pageId) {
      errorsByPageId.delete(pageId)
    }
    if (!guest.isDestroyed()) {
      guest.off('console-message', onConsoleMessage)
      guest.off('did-navigate', onNavigate)
    }
  }
}

export function readBrowserPageErrors(pageId: string): readonly BrowserPageError[] {
  return errorsByPageId.get(pageId) ?? NO_ERRORS
}
