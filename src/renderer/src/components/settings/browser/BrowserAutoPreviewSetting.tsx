import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { useAppStore } from '@/store/index'
import { translate } from '@/i18n/i18n'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { matchesSettingsSearch, type SettingsSearchEntry } from '../search/settings-search'

export function getBrowserAutoPreviewSearchEntry(t: Translate = translate): SettingsSearchEntry {
  return {
    title: t('shark.autoPreview.title', 'Open previews automatically'),
    description: t(
      'shark.autoPreview.description',
      'When a session starts a web server on this computer, open its page in a browser beside the chat.'
    ),
    keywords: ['browser', 'preview', 'live preview', 'dev server', 'localhost', 'port', 'auto']
  }
}

export function BrowserAutoPreviewSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const entry = getBrowserAutoPreviewSearchEntry(t)
  if (!matchesSettingsSearch(searchQuery, [entry])) {
    return null
  }
  const enabled = settings.browserAutoPreviewEnabled !== false
  return (
    <SettingsGroup>
      <SearchableSetting {...entry}>
        <SettingsSwitchRow
          label={entry.title}
          description={entry.description}
          checked={enabled}
          onChange={() => updateSettings({ browserAutoPreviewEnabled: !enabled })}
        />
      </SearchableSetting>
    </SettingsGroup>
  )
}
