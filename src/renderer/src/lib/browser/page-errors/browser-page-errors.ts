import { create } from 'zustand'
import {
  appendBrowserPageError,
  type BrowserPageError
} from '../../../../../shared/browser/page-errors/browser-page-error-rules'

export type { BrowserPageError }
export {
  formatBrowserPageErrorsForAgent,
  isConsoleErrorLevel
} from '../../../../../shared/browser/page-errors/browser-page-error-rules'

type BrowserPageErrorState = {
  errorsByPageId: Record<string, readonly BrowserPageError[]>
}

/** Errors each browser page reported since its last full load; kept apart from the app store to avoid render churn. */
export const useBrowserPageErrors = create<BrowserPageErrorState>(() => ({ errorsByPageId: {} }))

export function recordBrowserPageError(pageId: string, error: BrowserPageError): void {
  useBrowserPageErrors.setState((state) => {
    const current = state.errorsByPageId[pageId] ?? []
    const next = appendBrowserPageError(current, error)
    if (next === current) {
      return state
    }
    return { errorsByPageId: { ...state.errorsByPageId, [pageId]: next } }
  })
}

export function clearBrowserPageErrors(pageId: string): void {
  useBrowserPageErrors.setState((state) => {
    if (!state.errorsByPageId[pageId]) {
      return state
    }
    const { [pageId]: _removed, ...rest } = state.errorsByPageId
    return { errorsByPageId: rest }
  })
}
