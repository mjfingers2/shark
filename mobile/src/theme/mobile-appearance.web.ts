import { useSyncExternalStore } from 'react'
import {
  browserColorScheme,
  readBrowserDisplayPreferences,
  saveBrowserDisplayPreference
} from '../mobile-web-shell/browser-shell/browser-display-preferences'
import { applyMobileColorScheme } from './mobile-theme'

// Why: react-native-web's Appearance has no setColorScheme and a page may not write orca:appearance,
// so in a browser the choice lives with the tab; the shell reads it and hands the page its colors.
export type MobileAppearancePreference = 'system' | 'light' | 'dark'

function tabStorage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null
  } catch {
    return null
  }
}

let preference: MobileAppearancePreference = readBrowserDisplayPreferences(tabStorage()).appearance
const preferenceListeners = new Set<() => void>()

// The shell applies the saved choice before the page's first frame, so there is nothing to wait for.
export function startMobileAppearance(): Promise<void> {
  return Promise.resolve()
}

export function setMobileAppearancePreference(next: MobileAppearancePreference): Promise<void> {
  preference = next
  const win = globalThis.window
  const systemLight = win?.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
  // Applied here too, so the choice shows even when the browser refuses to keep it.
  applyMobileColorScheme(browserColorScheme(next, systemLight))
  if (win !== undefined) {
    saveBrowserDisplayPreference(win, { appearance: next })
  }
  for (const listener of preferenceListeners) {
    listener()
  }
  return Promise.resolve()
}

function subscribePreference(listener: () => void): () => void {
  preferenceListeners.add(listener)
  return () => {
    preferenceListeners.delete(listener)
  }
}

export function useMobileAppearancePreference(): MobileAppearancePreference {
  return useSyncExternalStore(subscribePreference, () => preference)
}
