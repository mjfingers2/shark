import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearBrowserPageErrors,
  formatBrowserPageErrorsForAgent,
  isConsoleErrorLevel,
  recordBrowserPageError,
  useBrowserPageErrors
} from './browser-page-errors'

const errorsOf = (pageId: string) => useBrowserPageErrors.getState().errorsByPageId[pageId] ?? []

describe('browser page errors', () => {
  beforeEach(() => useBrowserPageErrors.setState({ errorsByPageId: {} }))

  it('recognizes both forms of the error level', () => {
    expect(isConsoleErrorLevel(3)).toBe(true)
    expect(isConsoleErrorLevel('error')).toBe(true)
    expect(isConsoleErrorLevel(2)).toBe(false)
    expect(isConsoleErrorLevel('warning')).toBe(false)
  })

  it('keeps one copy of a repeated error and ignores blank ones', () => {
    const error = { message: 'Uncaught TypeError: x is undefined', source: 'main.js', line: 4 }
    recordBrowserPageError('p1', error)
    recordBrowserPageError('p1', error)
    recordBrowserPageError('p1', { message: '  ', source: '', line: 0 })
    expect(errorsOf('p1')).toHaveLength(1)
  })

  it('keeps only the latest twenty errors', () => {
    for (let i = 0; i < 25; i++) {
      recordBrowserPageError('p1', { message: `error ${i}`, source: '', line: 0 })
    }
    expect(errorsOf('p1')).toHaveLength(20)
    expect(errorsOf('p1')[0].message).toBe('error 5')
  })

  it('clears one page without touching another', () => {
    recordBrowserPageError('p1', { message: 'a', source: '', line: 0 })
    recordBrowserPageError('p2', { message: 'b', source: '', line: 0 })
    clearBrowserPageErrors('p1')
    expect(errorsOf('p1')).toHaveLength(0)
    expect(errorsOf('p2')).toHaveLength(1)
  })

  it('writes the agent message with the page and each source line', () => {
    const text = formatBrowserPageErrorsForAgent('http://localhost:5173/', [
      {
        message: 'Uncaught ReferenceError: foo is not defined',
        source: 'http://localhost:5173/src/main.ts',
        line: 12
      },
      { message: 'Failed to load resource', source: '', line: 0 }
    ])
    expect(text).toContain('http://localhost:5173/')
    expect(text).toContain(
      '- Uncaught ReferenceError: foo is not defined (http://localhost:5173/src/main.ts:12)'
    )
    expect(text).toContain('- Failed to load resource')
  })
})
