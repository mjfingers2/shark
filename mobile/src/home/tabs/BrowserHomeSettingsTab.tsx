import { ScrollView } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useRouteHandoff } from '../../navigation/route-handoff'
import { openExternalLink } from '../../platform/external-links/external-link'
import {
  BROWSER_SETTINGS_MENU_ITEMS,
  browserAliasPath
} from '../../settings/browser-settings-sections'
import { SettingsMenuSections } from '../../settings/settings-menu-screen'
import { spacing } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { MobileHomeTabHeader } from './MobileHomeTabHeader'

/** Home's Settings tab in a browser tab: the same menu, opening this host's web copies. */
export function BrowserHomeSettingsTab(props: { hostId: string; bottomInset: number }) {
  const t = useMobileTranslation()
  const router = useRouteHandoff()
  return (
    <>
      <MobileHomeTabHeader title={t('common.settings', 'Settings')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: props.bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsMenuSections
          push={(route) => router.push(browserAliasPath(route, props.hostId) ?? route)}
          openExternal={(url) => {
            openExternalLink(url)
            return Promise.resolve()
          }}
          onlyItems={BROWSER_SETTINGS_MENU_ITEMS}
        />
      </ScrollView>
    </>
  )
}

const styles = themedStyleSheet(() => ({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }
}))
