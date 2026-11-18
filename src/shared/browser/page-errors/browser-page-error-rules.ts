// Shared by the desktop toolbar chip (renderer list) and the phone (main-process list read over RPC).

export type BrowserPageError = {
  message: string
  source: string
  line: number
}

const MAX_ERRORS_PER_PAGE = 20

/** Electron reports the error level as 3 (older) or 'error' (newer). */
export function isConsoleErrorLevel(level: unknown): boolean {
  return level === 3 || level === 'error'
}

/** The page's list with this error added; the same list back when it adds nothing. */
export function appendBrowserPageError(
  current: readonly BrowserPageError[],
  error: BrowserPageError
): readonly BrowserPageError[] {
  const message = error.message.trim()
  if (!message) {
    return current
  }
  // A render loop repeats the same error; one copy tells the agent as much.
  if (
    current.some((e) => e.message === message && e.source === error.source && e.line === error.line)
  ) {
    return current
  }
  return [...current, { ...error, message }].slice(-MAX_ERRORS_PER_PAGE)
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
