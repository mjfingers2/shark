// Why: in a plain browser tab the native home and settings screens do not exist, so the browser
// shell serves web copies of them inside the paired host's own route tree. This is the one table
// that says which native screens have such a copy and where it lives.

export const BROWSER_SETTINGS_SECTIONS = [
  'appearance',
  'terminal',
  'chat',
  'browser',
  'shark',
  'about'
] as const

/** Settings menu rows a browser tab keeps; Voice, Notifications and Troubleshooting need the phone. */
export const BROWSER_SETTINGS_MENU_ITEMS = [
  'appearance',
  'terminal',
  'nativeChat',
  'browser',
  'shark',
  'about'
] as const

export type BrowserSettingsSection = (typeof BROWSER_SETTINGS_SECTIONS)[number]

const NATIVE_SETTINGS_PATHS: Readonly<Record<string, BrowserSettingsSection>> = {
  '/appearance-settings': 'appearance',
  '/terminal-settings': 'terminal',
  '/native-chat-settings': 'chat',
  '/browser-settings': 'browser',
  '/shark-settings': 'shark',
  '/about': 'about'
}

export function isBrowserSettingsSection(value: unknown): value is BrowserSettingsSection {
  return BROWSER_SETTINGS_SECTIONS.some((section) => section === value)
}

/** The browser-shell page standing in for a native-only screen, or null when there is none. */
export function browserAliasPath(nativePathname: string, hostId: string): string | null {
  const hostRoot = `/h/${encodeURIComponent(hostId)}`
  if (nativePathname === '/') {
    return `${hostRoot}/home`
  }
  if (nativePathname === '/settings') {
    return `${hostRoot}/settings`
  }
  const section = Object.hasOwn(NATIVE_SETTINGS_PATHS, nativePathname)
    ? NATIVE_SETTINGS_PATHS[nativePathname]
    : undefined
  return section === undefined ? null : `${hostRoot}/settings/${section}`
}
