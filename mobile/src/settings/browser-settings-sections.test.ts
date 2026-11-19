import { describe, expect, it } from 'vitest'
import {
  BROWSER_SETTINGS_MENU_ITEMS,
  BROWSER_SETTINGS_SECTIONS,
  browserAliasPath,
  isBrowserSettingsSection
} from './browser-settings-sections'

describe('browser settings sections', () => {
  it('maps the native home, settings menu and each served settings screen into the host', () => {
    expect(browserAliasPath('/', 'host-a')).toBe('/h/host-a/home')
    expect(browserAliasPath('/settings', 'host-a')).toBe('/h/host-a/settings')
    expect(browserAliasPath('/appearance-settings', 'host-a')).toBe('/h/host-a/settings/appearance')
    expect(browserAliasPath('/terminal-settings', 'host-a')).toBe('/h/host-a/settings/terminal')
    expect(browserAliasPath('/native-chat-settings', 'host-a')).toBe('/h/host-a/settings/chat')
    expect(browserAliasPath('/browser-settings', 'host-a')).toBe('/h/host-a/settings/browser')
    expect(browserAliasPath('/shark-settings', 'host-a')).toBe('/h/host-a/settings/shark')
    expect(browserAliasPath('/about', 'host-a')).toBe('/h/host-a/settings/about')
  })

  it('escapes the host id so it stays one path segment', () => {
    expect(browserAliasPath('/settings', 'a/b c')).toBe('/h/a%2Fb%20c/settings')
  })

  it('has no web screen for native-only settings or unknown paths', () => {
    for (const path of [
      '/voice-settings',
      '/notifications',
      '/troubleshoot',
      '/pair-scan',
      '/x',
      ''
    ]) {
      expect(browserAliasPath(path, 'host-a'), path).toBeNull()
    }
  })

  it('recognizes exactly the served sections', () => {
    expect(BROWSER_SETTINGS_SECTIONS).toEqual([
      'appearance',
      'terminal',
      'chat',
      'browser',
      'shark',
      'about'
    ])
    expect(BROWSER_SETTINGS_SECTIONS.every(isBrowserSettingsSection)).toBe(true)
    expect(isBrowserSettingsSection('voice')).toBe(false)
    expect(isBrowserSettingsSection(undefined)).toBe(false)
    expect(isBrowserSettingsSection(['about'])).toBe(false)
  })

  it('keeps one menu row for each served section and none for phone-only screens', () => {
    expect(BROWSER_SETTINGS_MENU_ITEMS).toHaveLength(BROWSER_SETTINGS_SECTIONS.length)
    for (const phoneOnly of ['voice', 'notifications', 'troubleshoot']) {
      expect(BROWSER_SETTINGS_MENU_ITEMS).not.toContain(phoneOnly)
    }
  })
})
