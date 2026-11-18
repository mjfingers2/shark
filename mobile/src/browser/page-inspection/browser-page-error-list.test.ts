import { describe, expect, it } from 'vitest'
import { nextSentBrowserPageErrorKeys, unsentBrowserPageErrors } from './browser-page-error-list'

const typeError = { message: 'TypeError: x is undefined', source: 'main.js', line: 4 }
const refError = { message: 'ReferenceError: y', source: 'app.js', line: 9 }

describe('browser page error list', () => {
  it('counts every listed error before anything is sent', () => {
    expect(unsentBrowserPageErrors([typeError, refError], new Set())).toEqual([typeError, refError])
  })

  it('hides sent errors while the host still lists them, and shows only newer ones', () => {
    const sent = nextSentBrowserPageErrorKeys(new Set(), [typeError], [typeError])
    expect(unsentBrowserPageErrors([typeError], sent)).toEqual([])
    expect(unsentBrowserPageErrors([typeError, refError], sent)).toEqual([refError])
  })

  it('lets a sent error count again after the host dropped it on a reload', () => {
    const sent = nextSentBrowserPageErrorKeys(new Set(), [typeError], [typeError])
    const afterReload = nextSentBrowserPageErrorKeys(sent, [])
    expect(unsentBrowserPageErrors([typeError], afterReload)).toEqual([typeError])
  })
})
