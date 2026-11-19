import { describe, expect, it } from 'vitest'
import {
  BROWSER_DISPLAY_PREFERENCES_EVENT,
  browserColorScheme,
  readBrowserDisplayPreferences,
  saveBrowserDisplayPreference
} from './browser-display-preferences'

function fakeWindow(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial))
  const events: string[] = []
  const store = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key)
  }
  return {
    win: {
      localStorage: store,
      dispatchEvent: (event: Event) => events.push(event.type) > 0
    },
    store,
    events
  }
}

describe('browser display preferences', () => {
  it('starts on System for both when nothing is saved', () => {
    expect(readBrowserDisplayPreferences(fakeWindow().store)).toEqual({
      appearance: 'system',
      uiLanguage: 'system'
    })
    expect(readBrowserDisplayPreferences(null)).toEqual({
      appearance: 'system',
      uiLanguage: 'system'
    })
  })

  it('keeps each choice beside the other and tells the tab it changed', () => {
    const { win, store, events } = fakeWindow()
    expect(saveBrowserDisplayPreference(win, { appearance: 'light' })).toBe(true)
    expect(saveBrowserDisplayPreference(win, { uiLanguage: 'ko' })).toBe(true)
    expect(readBrowserDisplayPreferences(store)).toEqual({
      appearance: 'light',
      uiLanguage: 'ko'
    })
    expect(events).toEqual([BROWSER_DISPLAY_PREFERENCES_EVENT, BROWSER_DISPLAY_PREFERENCES_EVENT])
  })

  it('falls back field by field on damaged or foreign values', () => {
    const key = 'shark-browser-shell:display'
    const read = (raw: string) => readBrowserDisplayPreferences(fakeWindow({ [key]: raw }).store)
    expect(read('not json')).toEqual({
      appearance: 'system',
      uiLanguage: 'system'
    })
    expect(read('{"appearance":"dark","uiLanguage":"xx"}')).toEqual({
      appearance: 'dark',
      uiLanguage: 'system'
    })
    expect(read('{"appearance":"purple","uiLanguage":"ko"}')).toEqual({
      appearance: 'system',
      uiLanguage: 'ko'
    })
    expect(read('null')).toEqual({
      appearance: 'system',
      uiLanguage: 'system'
    })
  })

  it('reports a refused save without throwing', () => {
    const throwing = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {}
      },
      dispatchEvent: () => true
    }
    expect(saveBrowserDisplayPreference(throwing, { appearance: 'dark' })).toBe(false)
  })

  it('lets a fixed choice override the system light/dark setting', () => {
    expect(browserColorScheme('system', true)).toBe('light')
    expect(browserColorScheme('system', false)).toBe('dark')
    expect(browserColorScheme('dark', true)).toBe('dark')
    expect(browserColorScheme('light', false)).toBe('light')
  })
})
