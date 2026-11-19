import { useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAgentListRowActions } from '../agents/use-agent-list-row-actions'
import type { HostCatalogEntry } from '../host-catalog/host-profile'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { useShellSessionHandoff } from '../navigation/route-handoff'
import { firstParam } from '../navigation/route-param-reader'
import { colors, spacing } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { MobileHomeQuickStart } from './quick-start/MobileHomeQuickStart'
import { BrowserHomeSettingsTab } from './tabs/BrowserHomeSettingsTab'
import { HOME_TABS, type HomeTabId } from './tabs/home-tabs'
import { MobileHomeAgentsTab } from './tabs/MobileHomeAgentsTab'
import { MobileHomeAutomationsTab } from './tabs/MobileHomeAutomationsTab'
import { MobileHomeFab } from './tabs/MobileHomeFab'
import { MobileHomeFeedTab } from './tabs/MobileHomeFeedTab'
import { MobileHomeTabBar } from './tabs/MobileHomeTabBar'
import { MobileHomeUsageTab } from './tabs/MobileHomeUsageTab'
import { useMobileHomeData } from './use-mobile-home-data'

// Same clearances as the app's Home.
const FAB_CLEARANCE = 56 + spacing.lg
const QUICK_START_CLEARANCE = 2 * 36 + spacing.sm + spacing.md

const hostPath = (hostId: string, rest = '') => `/h/${encodeURIComponent(hostId)}${rest}`

/**
 * Home for a browser tab: the app's tabs over the one desktop this tab is paired with. Pairing,
 * removing a desktop and connection diagnostics belong to the phone app, so they are left out;
 * each host screen opens as its own document through the shell.
 */
export function BrowserHomeScreen() {
  const t = useMobileTranslation()
  useMobileColorScheme()
  const hostId = firstParam(useLocalSearchParams<{ hostId?: string | string[] }>().hostId)
  const data = useMobileHomeData()
  const insets = useSafeAreaInsets()
  const shell = useShellSessionHandoff()
  // Each host screen is its own document in a tab; the shell loads it.
  const open = useCallback((href: string) => shell?.open(href), [shell])
  const [tab, setTab] = useState<HomeTabId>('feed')
  // A tab mounts on first visit and then stays mounted, keeping its scroll and data.
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<HomeTabId>>(() => new Set(['feed']))
  const [automationsHostId, setAutomationsHostId] = useState<string | null>(null)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  const agentActions = useAgentListRowActions(
    tabBarHeight,
    data.sortedHosts,
    data.applyAgentActivity
  )

  const selectTab = useCallback((next: HomeTabId) => {
    setTab(next)
    setVisitedTabs((visited) => (visited.has(next) ? visited : new Set([...visited, next])))
  }, [])
  const seeAllAgents = useCallback(() => selectTab('agents'), [selectTab])
  const openHost = useCallback((host: HostCatalogEntry) => open(hostPath(host.id)), [open])
  const openTasks = useCallback((id: string) => open(hostPath(id, '/tasks')), [open])
  const openAutomations = useCallback((id: string) => open(hostPath(id, '/automations')), [open])
  const openAccounts = useCallback((id: string) => open(hostPath(id, '/accounts')), [open])

  const paired = data.hostCatalogLoaded && data.hostCatalog.length > 0
  const { connectedHosts } = data
  const quickStartHostId = connectedHosts[0]?.id ?? null
  const openNewWorkspaceForm = useCallback(() => {
    if (quickStartHostId !== null) {
      open(hostPath(quickStartHostId, '/new-workspace'))
    }
  }, [quickStartHostId, open])
  const showQuickStart = tab === 'feed' && paired && quickStartHostId !== null
  const automationsHostConnected =
    automationsHostId != null && data.hostStates[automationsHostId] === 'connected'
  const fab =
    tab === 'feed' && paired
      ? {
          label: t('home.bottomBar.newWorkspace', 'New workspace'),
          disabled: connectedHosts.length === 0,
          hint: data.hostsConnecting
            ? undefined
            : t('home.bottomBar.connectFirst', 'Connect a desktop to start new work.'),
          onPress: openNewWorkspaceForm
        }
      : tab === 'automations' && automationsHostId && automationsHostConnected
        ? {
            label: t('home.automationsTab.newAutomation', 'New automation'),
            disabled: false,
            hint: undefined,
            onPress: () => openAutomations(automationsHostId)
          }
        : null
  const contentBottom =
    spacing.xl + (fab ? FAB_CLEARANCE : 0) + (showQuickStart ? QUICK_START_CLEARANCE : 0)

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.fill}>
          {HOME_TABS.map((id) =>
            visitedTabs.has(id) ? (
              <View key={id} style={id === tab ? styles.fill : styles.hidden}>
                {id === 'feed' ? (
                  <MobileHomeFeedTab
                    data={data}
                    bottomInset={contentBottom}
                    agentHandlers={agentActions.handlers}
                    onSeeAllAgents={seeAllAgents}
                    onOpenHost={openHost}
                    onOpenHostActions={openHost}
                    onOpenTasks={openTasks}
                  />
                ) : id === 'agents' ? (
                  <MobileHomeAgentsTab
                    data={data}
                    bottomInset={contentBottom}
                    handlers={agentActions.handlers}
                  />
                ) : id === 'usage' ? (
                  <MobileHomeUsageTab
                    hosts={data.sortedHosts}
                    connectedHosts={data.connectedHosts}
                    hostStates={data.hostStates}
                    accountsByHost={data.accountsByHost}
                    stats={data.stats}
                    bottomInset={contentBottom}
                    onOpenAccounts={openAccounts}
                  />
                ) : id === 'automations' ? (
                  <MobileHomeAutomationsTab
                    hosts={data.sortedHosts}
                    connectedHosts={data.connectedHosts}
                    hostStates={data.hostStates}
                    bottomInset={contentBottom}
                    onOpenAutomations={openAutomations}
                    onHostChange={setAutomationsHostId}
                  />
                ) : (
                  <BrowserHomeSettingsTab hostId={hostId} bottomInset={contentBottom} />
                )}
              </View>
            ) : null
          )}
        </View>
        <MobileHomeFab
          visible={fab != null}
          disabled={fab?.disabled ?? false}
          accessibilityLabel={fab?.label ?? ''}
          disabledHint={fab?.hint}
          bottom={tabBarHeight + spacing.lg}
          onPress={() => fab?.onPress()}
        />
        <MobileHomeQuickStart
          hostId={quickStartHostId}
          showActions={showQuickStart}
          bottom={tabBarHeight + spacing.lg + FAB_CLEARANCE}
          onOpenForm={openNewWorkspaceForm}
          askOnLaunch={false}
        />
        <View onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}>
          <MobileHomeTabBar
            tabs={HOME_TABS}
            active={tab}
            bottomInset={insets.bottom}
            agentsBadge={data.agentsNeedingYou.length}
            onSelect={selectTab}
          />
        </View>
        {agentActions.sheet}
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

const styles = themedStyleSheet(() => ({
  container: { flex: 1, backgroundColor: colors.bgBase },
  fill: { flex: 1 },
  hidden: { display: 'none' }
}))
