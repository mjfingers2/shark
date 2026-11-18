import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { MonitorPlay, X } from 'lucide-react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { triggerSelection } from '../../platform/haptics/haptics'
import type { MobileSessionController } from '../../session/use-mobile-session-controller'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { displayBrowserUrl } from '../pane-view/browser-url'
import { advanceDevPreviewTracker, INITIAL_DEV_PREVIEW_TRACKER } from './dev-preview-tabs'

// Long enough to notice from across the room, short enough not to linger over a terminal.
const NOTICE_VISIBLE_MS = 12_000

type Props = {
  controller: Pick<
    MobileSessionController,
    | 'hostId'
    | 'worktreeId'
    | 'sessionTabs'
    | 'activeSessionTab'
    | 'switchSessionTab'
    | 'showLoadingState'
    | 'showOfflineState'
  >
}

type TrackedTabs = {
  scopeKey: string
  tabs: Props['controller']['sessionTabs'] | null
  activeTabId: string | null
  state: typeof INITIAL_DEV_PREVIEW_TRACKER
  noticeTabId: string | null
}

/** When the desktop opens a dev server's page in this session, offer the phone a one-tap switch to it. */
export function MobileDevPreviewNotice({ controller }: Props) {
  const t = useMobileTranslation()
  useMobileColorScheme()
  const tabs = controller.sessionTabs
  const activeTabId = controller.activeSessionTab?.id ?? null
  // False until the session's first tab list has arrived, so tabs already open are not news.
  const ready = !controller.showLoadingState && !controller.showOfflineState
  const scopeKey = `${controller.hostId}\0${controller.worktreeId}`
  // Judged while rendering (React's "information from previous renders" pattern) so the notice
  // appears in the same frame as the new tab, instead of one stale frame later from an effect.
  const [tracked, setTracked] = useState<TrackedTabs>(() => ({
    scopeKey,
    tabs: null,
    activeTabId: null,
    state: INITIAL_DEV_PREVIEW_TRACKER,
    noticeTabId: null
  }))
  if (
    ready &&
    (tracked.tabs !== tabs || tracked.activeTabId !== activeTabId || tracked.scopeKey !== scopeKey)
  ) {
    // Another workspace's tabs are all new to this one; judge them as a first list.
    const current = tracked.scopeKey === scopeKey ? tracked.state : INITIAL_DEV_PREVIEW_TRACKER
    const next = advanceDevPreviewTracker(current, tabs, activeTabId)
    setTracked({
      scopeKey,
      tabs,
      activeTabId,
      state: next.state,
      noticeTabId:
        current === INITIAL_DEV_PREVIEW_TRACKER ? null : (next.noticeTabId ?? tracked.noticeTabId)
    })
  }
  const noticeTabId = tracked.noticeTabId
  const setNoticeTabId = (value: null) =>
    setTracked((previous) => ({ ...previous, noticeTabId: value }))

  useEffect(() => {
    if (!noticeTabId) {
      return
    }
    const timer = setTimeout(() => setNoticeTabId(null), NOTICE_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [noticeTabId])

  const tab = tabs.find((candidate) => candidate.id === noticeTabId)
  if (!tab || tab.type !== 'browser' || tab.id === activeTabId) {
    return null
  }
  return (
    <View pointerEvents="box-none" style={styles.anchor}>
      <View style={styles.pill}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
          onPress={() => {
            triggerSelection()
            setNoticeTabId(null)
            controller.switchSessionTab(tab)
          }}
        >
          <MonitorPlay size={15} color={colors.onAccent} />
          <Text style={styles.label}>{t('browser.previewNotice.open', 'Open preview')}</Text>
          <Text style={styles.url} numberOfLines={1}>
            {displayBrowserUrl(tab.url)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('browser.previewNotice.dismiss', 'Dismiss')}
          hitSlop={8}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          onPress={() => setNoticeTabId(null)}
        >
          <X size={14} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  anchor: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center'
  },
  pill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.accentBlue,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  openButton: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm
  },
  label: {
    color: colors.onAccent,
    fontSize: typography.bodySize,
    fontWeight: '600'
  },
  url: {
    flexShrink: 1,
    color: colors.onAccent,
    opacity: 0.85,
    fontSize: typography.metaSize
  },
  closeButton: {
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm
  },
  pressed: {
    opacity: 0.7
  }
}))
