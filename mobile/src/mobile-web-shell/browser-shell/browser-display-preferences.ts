import * as z from 'zod'
import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '../../../../src/shared/ui-locale'
import { UI_LANGUAGE_SYSTEM } from '../../../../src/shared/ui-language'
import type { BrowserKeyValueStore } from './browser-credential-store'

// Why: a browser tab has no app-wide store for Appearance and Language (the page may only write the
// keys the native shell allows), so the tab keeps them itself. The shell reads them to pick the
// colors and language it hands the page; the settings screen writes them and fires the event.
const DISPLAY_KEY = 'shark-browser-shell:display'

export const BROWSER_DISPLAY_PREFERENCES_EVENT = 'shark-browser-shell:display-change'

type Appearance = 'system' | 'light' | 'dark'
type UiLanguage = typeof UI_LANGUAGE_SYSTEM | SupportedUiLocale

export type BrowserDisplayPreferences = {
  appearance: Appearance
  uiLanguage: UiLanguage
}

const DEFAULTS: BrowserDisplayPreferences = {
  appearance: 'system',
  uiLanguage: UI_LANGUAGE_SYSTEM
}

// Each field falls back on its own, so one damaged choice never resets the other.
const storedDisplaySchema = z
  .object({
    appearance: z.enum(['system', 'light', 'dark']).catch(DEFAULTS.appearance),
    uiLanguage: z.enum([UI_LANGUAGE_SYSTEM, ...SUPPORTED_UI_LOCALES]).catch(DEFAULTS.uiLanguage)
  })
  .catch(DEFAULTS)

export function readBrowserDisplayPreferences(
  store: BrowserKeyValueStore | null
): BrowserDisplayPreferences {
  try {
    const raw = store?.getItem(DISPLAY_KEY) ?? null
    return raw === null ? DEFAULTS : storedDisplaySchema.parse(JSON.parse(raw))
  } catch {
    return DEFAULTS
  }
}

/** Saves one or both choices and tells the shell in this tab; false when the browser refused. */
export function saveBrowserDisplayPreference(
  win: {
    localStorage: BrowserKeyValueStore
    dispatchEvent: (event: Event) => boolean
  },
  patch: Partial<BrowserDisplayPreferences>
): boolean {
  try {
    const store = win.localStorage
    const next = { ...readBrowserDisplayPreferences(store), ...patch }
    store.setItem(DISPLAY_KEY, JSON.stringify(next))
  } catch {
    return false
  }
  win.dispatchEvent(new Event(BROWSER_DISPLAY_PREFERENCES_EVENT))
  return true
}

export function browserColorScheme(
  appearance: Appearance,
  systemPrefersLight: boolean
): 'light' | 'dark' {
  if (appearance !== 'system') {
    return appearance
  }
  return systemPrefersLight ? 'light' : 'dark'
}
