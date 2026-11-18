import { describe, expect, it } from 'vitest'
import { appendBrowserPageError, type BrowserPageError } from './browser-page-error-rules'

describe('appendBrowserPageError', () => {
  it('adds a new error with its message trimmed', () => {
    const next = appendBrowserPageError([], { message: '  boom \n', source: 'a.js', line: 3 })
    expect(next).toEqual([{ message: 'boom', source: 'a.js', line: 3 }])
  })

  it('returns the same list for a blank or repeated error', () => {
    const current: BrowserPageError[] = [{ message: 'boom', source: 'a.js', line: 3 }]
    expect(appendBrowserPageError(current, { message: ' ', source: '', line: 0 })).toBe(current)
    expect(appendBrowserPageError(current, { message: 'boom', source: 'a.js', line: 3 })).toBe(
      current
    )
  })

  it('keeps the same message from another line as a separate error', () => {
    const current: BrowserPageError[] = [{ message: 'boom', source: 'a.js', line: 3 }]
    expect(appendBrowserPageError(current, { message: 'boom', source: 'a.js', line: 9 })).toEqual([
      { message: 'boom', source: 'a.js', line: 3 },
      { message: 'boom', source: 'a.js', line: 9 }
    ])
  })
})
