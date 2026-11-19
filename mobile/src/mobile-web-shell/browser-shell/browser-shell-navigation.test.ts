import { describe, expect, it } from 'vitest'
import {
  browserShellNavigationTarget,
  browserShellStartRoute,
  createBrowserShellNavigator
} from './browser-shell-navigation'
import { isBrowserShellLocation } from './browser-shell-location'

describe('browser shell navigation', () => {
  it('starts on the host home for the pairing page and paths it does not serve', () => {
    expect(browserShellStartRoute('/m', '', 'host-a')).toEqual({
      pathname: '/h/host-a'
    })
    expect(browserShellStartRoute('/', '', 'host-a')).toEqual({
      pathname: '/h/host-a'
    })
    expect(browserShellStartRoute('/h/host-a/edit', '', 'host-a')).toEqual({
      pathname: '/h/host-a'
    })
    // Another host's screen is never opened against this tab's desktop.
    expect(browserShellStartRoute('/h/host-b/tasks', '', 'host-a')).toEqual({
      pathname: '/h/host-a'
    })
  })

  it('reopens a served screen with its query after a reload', () => {
    expect(browserShellStartRoute('/h/host-a/session/wt-1', '?paneKey=p1', 'host-a')).toEqual({
      pathname: '/h/host-a/session/wt-1',
      params: { paneKey: 'p1' }
    })
    expect(browserShellStartRoute('/h/host-a/tasks', '', 'host-a')).toEqual({
      pathname: '/h/host-a/tasks'
    })
  })

  it('opens the web copies of the native home and settings screens', () => {
    expect(browserShellNavigationTarget('/', 'host-a')).toBe('/h/host-a/home')
    expect(browserShellNavigationTarget('/settings', 'host-a')).toBe('/h/host-a/settings')
    expect(browserShellNavigationTarget('/shark-settings', 'host-a')).toBe(
      '/h/host-a/settings/shark'
    )
    expect(browserShellNavigationTarget('/h/host-a/settings/about', 'host-a')).toBe(
      '/h/host-a/settings/about'
    )
    expect(browserShellStartRoute('/h/host-a/home', '', 'host-a')).toEqual({
      pathname: '/h/host-a/home'
    })
    // Another host's copy is still never opened against this tab's desktop.
    expect(browserShellNavigationTarget('/h/host-b/settings', 'host-a')).toBe('/h/host-a')
  })

  it('maps hand-offs the page cannot show to the host home', () => {
    expect(browserShellNavigationTarget('/voice-settings', 'host-a')).toBe('/h/host-a')
    expect(browserShellNavigationTarget('/h/host-a/pr/wt-1', 'host-a')).toBe('/h/host-a')
    expect(browserShellNavigationTarget('/h/host-a/review/wt-1?tab=x', 'host-a')).toBe(
      '/h/host-a/review/wt-1?tab=x'
    )
  })

  it('loads served targets as documents and backs out through history', () => {
    const loads: string[] = []
    let backs = 0
    let historyLength = 1
    const navigator = createBrowserShellNavigator({
      hostId: 'host-a',
      readCurrentPath: () => '/h/host-a',
      assign: (href) => loads.push(`assign ${href}`),
      replace: (href) => loads.push(`replace ${href}`),
      historyLength: () => historyLength,
      back: () => {
        backs += 1
      }
    })
    navigator.onNavigate('/h/host-a/session/wt-1', false)
    navigator.onNavigate('/h/host-a/tasks', true)
    // A native-only screen maps onto the home this document already shows: nothing to load.
    navigator.onNavigate('/voice-settings', false)
    navigator.onNavigate('/settings', false)
    expect(loads).toEqual([
      'assign /h/host-a/session/wt-1',
      'replace /h/host-a/tasks',
      'assign /h/host-a/settings'
    ])
    expect(navigator.onNavigateBack()).toBe('nothing-to-pop')
    historyLength = 3
    expect(navigator.onNavigateBack()).toBe('popped')
    expect(backs).toBe(1)
  })

  it('installs only in a browser tab, never in the app WebView', () => {
    expect(isBrowserShellLocation({ protocol: 'http:', hostname: '192.168.0.10' })).toBe(true)
    expect(isBrowserShellLocation({ protocol: 'orca-mobile-web:', hostname: 's1' })).toBe(false)
    expect(
      isBrowserShellLocation({
        protocol: 'https:',
        hostname: 's1.orca-mobile-web.invalid'
      })
    ).toBe(false)
  })
})
