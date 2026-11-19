import { useSyncExternalStore } from 'react'
import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '../../../src/shared/ui-locale'
import { UI_LANGUAGE_SYSTEM } from '../../../src/shared/ui-language'
import {
  readBrowserDisplayPreferences,
  saveBrowserDisplayPreference
} from '../mobile-web-shell/browser-shell/browser-display-preferences'
import { activateMobileUiLocale } from './mobile-i18n'
import { readDeviceUiLocaleTags, resolveUiLocaleFromTags } from './system-ui-locale'

// Why: a page may not write orca:uiLanguage, so in a browser the choice lives with the tab and the
// shell opens the next page in it. Inside the app's WebView nothing is saved here, so the
// preference stays System there, as the native module's would on a page.
export type MobileUiLanguagePreference = typeof UI_LANGUAGE_SYSTEM | SupportedUiLocale

function tabStorage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null
  } catch {
    return null
  }
}

let preference: MobileUiLanguagePreference = readBrowserDisplayPreferences(tabStorage()).uiLanguage
const preferenceListeners = new Set<() => void>()

export function isMobileUiLanguagePreference(value: unknown): value is MobileUiLanguagePreference {
  return value === UI_LANGUAGE_SYSTEM || SUPPORTED_UI_LOCALES.some((locale) => locale === value)
}

export function resolveMobileUiLocale(
  next: MobileUiLanguagePreference,
  deviceTags: readonly string[] = readDeviceUiLocaleTags()
): SupportedUiLocale {
  return next === UI_LANGUAGE_SYSTEM ? resolveUiLocaleFromTags(deviceTags) : next
}

// The shell already opened the page in the saved language.
export function startMobileUiLanguage(): Promise<void> {
  return Promise.resolve()
}

export function setMobileUiLanguagePreference(next: MobileUiLanguagePreference): Promise<void> {
  preference = next
  const win = globalThis.window
  if (win !== undefined) {
    saveBrowserDisplayPreference(win, { uiLanguage: next })
  }
  for (const listener of preferenceListeners) {
    listener()
  }
  return activateMobileUiLocale(resolveMobileUiLocale(next))
}

export function followDeviceUiLocale(deviceTags: readonly string[]): Promise<void> {
  return preference === UI_LANGUAGE_SYSTEM
    ? activateMobileUiLocale(resolveUiLocaleFromTags(deviceTags))
    : Promise.resolve()
}

function subscribePreference(listener: () => void): () => void {
  preferenceListeners.add(listener)
  return () => {
    preferenceListeners.delete(listener)
  }
}

export function useMobileUiLanguagePreference(): MobileUiLanguagePreference {
  return useSyncExternalStore(subscribePreference, () => preference)
}
