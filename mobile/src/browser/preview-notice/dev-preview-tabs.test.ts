import { describe, expect, it } from 'vitest'
import {
  advanceDevPreviewTracker,
  INITIAL_DEV_PREVIEW_TRACKER,
  isDevPreviewUrl
} from './dev-preview-tabs'

const tab = (id: string, url: string) => ({ type: 'browser', id, url })
const terminal = { type: 'terminal', id: 't1' }

describe('isDevPreviewUrl', () => {
  it('accepts loopback hosts on any port', () => {
    expect(isDevPreviewUrl('http://localhost:5173/')).toBe(true)
    expect(isDevPreviewUrl('http://127.0.0.1:3000/app')).toBe(true)
    expect(isDevPreviewUrl('https://app.localhost/')).toBe(true)
    expect(isDevPreviewUrl('http://[::1]:8080/')).toBe(true)
  })

  it('accepts a LAN address only with a port', () => {
    expect(isDevPreviewUrl('http://192.168.0.12:5173/')).toBe(true)
    expect(isDevPreviewUrl('http://10.0.0.5:8000/')).toBe(true)
    expect(isDevPreviewUrl('http://192.168.0.1/')).toBe(false)
    expect(isDevPreviewUrl('http://172.32.0.1:3000/')).toBe(false)
  })

  it('rejects public sites, other schemes and junk', () => {
    expect(isDevPreviewUrl('https://example.com/')).toBe(false)
    expect(isDevPreviewUrl('file:///Users/me/index.html')).toBe(false)
    expect(isDevPreviewUrl('about:blank')).toBe(false)
    expect(isDevPreviewUrl('not a url')).toBe(false)
    expect(isDevPreviewUrl(undefined)).toBe(false)
  })
})

describe('advanceDevPreviewTracker', () => {
  it('stays quiet about previews already open when the session is first seen', () => {
    const first = advanceDevPreviewTracker(
      INITIAL_DEV_PREVIEW_TRACKER,
      [terminal, tab('b1', 'http://localhost:5173/')],
      't1'
    )
    expect(first.noticeTabId).toBeNull()
    const again = advanceDevPreviewTracker(
      first.state,
      [terminal, tab('b1', 'http://localhost:5173/')],
      't1'
    )
    expect(again.noticeTabId).toBeNull()
  })

  it('raises a new dev preview tab once', () => {
    const seeded = advanceDevPreviewTracker(INITIAL_DEV_PREVIEW_TRACKER, [terminal], 't1').state
    const opened = advanceDevPreviewTracker(
      seeded,
      [terminal, tab('b2', 'http://localhost:3000/')],
      't1'
    )
    expect(opened.noticeTabId).toBe('b2')
    const later = advanceDevPreviewTracker(
      opened.state,
      [terminal, tab('b2', 'http://localhost:3000/')],
      't1'
    )
    expect(later.noticeTabId).toBeNull()
  })

  it('waits for a blank tab to load, and ignores public sites and the tab already in view', () => {
    const seeded = advanceDevPreviewTracker(INITIAL_DEV_PREVIEW_TRACKER, [terminal], 't1').state
    const blank = advanceDevPreviewTracker(seeded, [terminal, tab('b3', 'about:blank')], 't1')
    expect(blank.noticeTabId).toBeNull()
    const loaded = advanceDevPreviewTracker(
      blank.state,
      [terminal, tab('b3', 'http://127.0.0.1:8000/'), tab('b4', 'https://example.com/')],
      't1'
    )
    expect(loaded.noticeTabId).toBe('b3')
    const active = advanceDevPreviewTracker(
      loaded.state,
      [terminal, tab('b5', 'http://localhost:4000/')],
      'b5'
    )
    expect(active.noticeTabId).toBeNull()
  })
})
