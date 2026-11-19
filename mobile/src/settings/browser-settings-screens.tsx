import { useLocalSearchParams } from 'expo-router'
import { PageRouteUnavailableScreen } from '../mobile-web-shell/presentation/PageRouteUnavailableScreen'
import { firstParam } from '../navigation/route-param-reader'
import { useRouteHandoff } from '../navigation/route-handoff'
import { openExternalLink } from '../platform/external-links/external-link'
import { SharkSettingsScreen } from '../shark-actions/settings/SharkSettingsScreen'
import AboutScreen from './about-screen'
import AppearanceSettingsScreen from './appearance-settings-screen'
import BrowserSettingsScreen from './browser-settings-screen'
import {
  BROWSER_SETTINGS_MENU_ITEMS,
  browserAliasPath,
  isBrowserSettingsSection
} from './browser-settings-sections'
import NativeChatSettingsScreen from './native-chat-settings-screen'
import SettingsMenuScreen from './settings-menu-screen'
import TerminalSettingsScreen from './terminal-settings-screen'

function openExternal(url: string): Promise<void> {
  openExternalLink(url)
  return Promise.resolve()
}

function useBrowserSettingsRoute() {
  const params = useLocalSearchParams<{
    hostId?: string | string[]
    section?: string | string[]
  }>()
  const router = useRouteHandoff()
  const hostId = firstParam(params.hostId)
  return {
    hostId,
    section: firstParam(params.section),
    back: () => router.back(),
    // Native paths become this host's copies, so the hop stays inside this document.
    push: (route: string) => router.push(browserAliasPath(route, hostId) ?? route)
  }
}

export function BrowserSettingsMenuScreen() {
  const { back, push } = useBrowserSettingsRoute()
  return (
    <SettingsMenuScreen
      push={push}
      onBack={back}
      openExternal={openExternal}
      onlyItems={BROWSER_SETTINGS_MENU_ITEMS}
    />
  )
}

export function BrowserSettingsSectionScreen() {
  const { hostId, section, back } = useBrowserSettingsRoute()
  if (!isBrowserSettingsSection(section)) {
    return <PageRouteUnavailableScreen hostId={hostId} />
  }
  switch (section) {
    case 'appearance':
      return <AppearanceSettingsScreen onBack={back} />
    case 'terminal':
      return <TerminalSettingsScreen onBack={back} />
    case 'chat':
      return <NativeChatSettingsScreen onBack={back} />
    case 'browser':
      return <BrowserSettingsScreen onBack={back} />
    case 'shark':
      return <SharkSettingsScreen onBack={back} />
    case 'about':
      return <AboutScreen onBack={back} openExternal={openExternal} versionLabel="Web app" />
  }
}
