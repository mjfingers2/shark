import type { SettingsSearchEntry } from '../search/settings-search'
import { getBrowserPaneSearchEntries } from './browser-search'
import { getBrowserUsePaneSearchEntries } from './use/browser-use-search'
import { getBrowserPasswordsSearchEntry } from './passwords/browser-passwords-copy'
import { getBrowserExtensionsSearchEntry } from './extensions/browser-extensions-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { getBrowserAutoPreviewSearchEntry } from './BrowserAutoPreviewSetting'

export const getBrowserPaneCombinedSearchEntries = createLocalizedCatalog(
  (): SettingsSearchEntry[] => [
    getBrowserAutoPreviewSearchEntry(),
    ...getBrowserUsePaneSearchEntries(),
    ...getBrowserPaneSearchEntries(),
    getBrowserPasswordsSearchEntry(),
    getBrowserExtensionsSearchEntry()
  ]
)
