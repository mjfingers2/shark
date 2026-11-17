import { create } from 'zustand'

export type BrowserPageError = {
  message: string
  source: string
  line: number
}

type BrowserPageErrorState = {
  errorsByPageId: Record<string, BrowserPageError[]>
}

const MAX_ERRORS_PER_PAGE = 20

/** Errors each browser page reported since its last full load; kept apart from the app store to avoid render churn. */
export const useBrowserPageErrors = create<BrowserPageErrorState>(() => ({ errorsByPageId: {} }))

/** Electron's webview reports error level as 3 (older) or 'error' (newer). */
export function isConsoleErrorLevel(level: unknown): boolean {
  return level === 3 || level === 'error'
}

export function recordBrowserPageError(pageId: string, error: BrowserPageError): void {
  const message = error.message.trim()
  if (!message) {
    return
  }
  useBrowserPageErrors.setState((state) => {
    const current = state.errorsByPageId[pageId] ?? []
    // A render loop repeats the same error; one copy tells the agent as much.
    if (
      current.some(
        (e) => e.message === message && e.source === error.source && e.line === error.line
      )
    ) {
      return state
    }
    const next = [...current, { ...error, message }].slice(-MAX_ERRORS_PER_PAGE)
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

/** The message an agent gets: where the page is, and each error with its source line. */
export function formatBrowserPageErrorsForAgent(
  url: string,
  errors: readonly BrowserPageError[]
): string {
  const lines = errors.map((error) => {
    const where = error.source ? ` (${error.source}${error.line > 0 ? `:${error.line}` : ''})` : ''
    return `- ${error.message}${where}`
  })
  return [
    `The page at ${url} shows these errors in the browser console. Find the cause and fix it:`,
    '',
    ...lines
  ].join('\n')
}
