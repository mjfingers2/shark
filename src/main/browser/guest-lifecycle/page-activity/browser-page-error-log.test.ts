import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import {
  installBrowserPageErrorCollection,
  readBrowserPageErrors,
  type BrowserPageErrorGuest
} from './browser-page-error-log'

function fakeGuest() {
  const emitter = new EventEmitter()
  let destroyed = false
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the log calls only on, off and isDestroyed, which the emitter and this object provide.
  const guest = Object.assign(emitter, {
    isDestroyed: () => destroyed
  }) as unknown as BrowserPageErrorGuest
  return {
    guest,
    log: (level: unknown, message: string, sourceId = 'app.js', lineNumber = 1) =>
      emitter.emit('console-message', { level, message, sourceId, lineNumber }),
    navigate: () => emitter.emit('did-navigate'),
    destroy: () => {
      destroyed = true
    }
  }
}

describe('browser page error log', () => {
  it('keeps console errors under the page id and skips other levels', () => {
    const page = fakeGuest()
    const dispose = installBrowserPageErrorCollection(page.guest, () => 'page-a')
    page.log('error', 'Uncaught TypeError: x is undefined', 'main.js', 12)
    page.log('warning', 'deprecated')
    page.log('error', 'Uncaught TypeError: x is undefined', 'main.js', 12)
    expect(readBrowserPageErrors('page-a')).toEqual([
      { message: 'Uncaught TypeError: x is undefined', source: 'main.js', line: 12 }
    ])
    dispose()
  })

  it('starts a fresh list on a full navigation', () => {
    const page = fakeGuest()
    const dispose = installBrowserPageErrorCollection(page.guest, () => 'page-b')
    page.log('error', 'first')
    page.navigate()
    expect(readBrowserPageErrors('page-b')).toEqual([])
    page.log('error', 'second')
    expect(readBrowserPageErrors('page-b').map((error) => error.message)).toEqual(['second'])
    dispose()
  })

  it('ignores a guest with no page yet and forgets the page on dispose', () => {
    const page = fakeGuest()
    let pageId: string | undefined
    const dispose = installBrowserPageErrorCollection(page.guest, () => pageId)
    page.log('error', 'before registration')
    pageId = 'page-c'
    page.log('error', 'after registration')
    expect(readBrowserPageErrors('page-c')).toHaveLength(1)
    page.destroy()
    dispose()
    expect(readBrowserPageErrors('page-c')).toEqual([])
  })
})
