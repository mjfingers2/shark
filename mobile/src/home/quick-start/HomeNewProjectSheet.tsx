import { CornerLeftUp, Folder, FolderPlus } from 'lucide-react-native'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BottomDrawer } from '../../components/bottom-drawer/BottomDrawer'
import { LIST_LEADING_INSET, ListRow } from '../../components/list/ListGroup'
import { SheetHeader } from '../../components/nav-bar/SheetHeader'
import { SheetPrimaryButton } from '../../components/sheets/SheetPrimaryButton'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { AddedHostProject } from './host-projects'
import { useHostFolderBrowser } from './use-host-folder-browser'

/** "New project": walk the desktop's folders from its home folder and add one as a project. */
export function HomeNewProjectSheet(props: {
  visible: boolean
  client: RpcClient | null
  onAdded: (project: AddedHostProject) => void
  onClose: () => void
  /** Runs once the sheet has fully gone, so the next sheet or screen can present. */
  onAfterClose: () => void
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const browser = useHostFolderBrowser(props.client, props.visible)
  const { listing } = browser
  const folders = listing?.folders ?? []

  async function add(): Promise<void> {
    const added = await browser.addCurrent()
    if (added) {
      props.onAdded(added)
    }
  }

  return (
    <BottomDrawer
      visible={props.visible}
      onClose={props.onClose}
      onAfterClose={props.onAfterClose}
      dragContentToDismiss={false}
      contentScrollable={false}
    >
      <SheetHeader
        title={t('home.quickStart.newProject', 'New project')}
        subtitle={listing?.path ?? ' '}
        onClose={props.onClose}
      />
      <ScrollView
        style={styles.group}
        contentContainerStyle={styles.groupContent}
        nestedScrollEnabled
      >
        {browser.hasParent ? (
          <ListRow
            title={t('home.quickStart.upOneFolder', 'Up one folder')}
            leading={<CornerLeftUp size={20} color={colors.textSecondary} />}
            accessibilityRole="button"
            disabled={browser.loading}
            onPress={browser.openParent}
          />
        ) : null}
        {browser.loading && !listing ? (
          <ActivityIndicator style={styles.spinner} color={colors.textSecondary} />
        ) : null}
        {listing && folders.length === 0 && !browser.loading ? (
          <Text style={styles.empty}>{t('home.quickStart.noSubfolders', 'No folders here.')}</Text>
        ) : null}
        {folders.map((name, index) => (
          <View key={name}>
            {index > 0 || browser.hasParent ? <View style={styles.separator} /> : null}
            <ListRow
              title={name}
              leading={<Folder size={20} color={colors.textSecondary} />}
              navigates
              accessibilityRole="button"
              disabled={browser.loading}
              onPress={() => browser.openChild(name)}
            />
          </View>
        ))}
      </ScrollView>
      {browser.error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {browser.error}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <SheetPrimaryButton
          label={t('home.quickStart.addThisFolder', 'Add this folder')}
          icon={FolderPlus}
          disabled={!listing || browser.loading}
          busy={browser.adding}
          onPress={() => void add()}
        />
      </View>
    </BottomDrawer>
  )
}

const styles = themedStyleSheet(() => ({
  group: {
    backgroundColor: colors.sheetGroup,
    borderRadius: radii.surface,
    maxHeight: 420,
    flexGrow: 0
  },
  groupContent: { minHeight: spacing.xl * 2 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginLeft: LIST_LEADING_INSET
  },
  spinner: { paddingVertical: spacing.lg },
  empty: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg
  },
  error: {
    fontSize: typography.metaSize,
    color: colors.statusRed,
    marginTop: spacing.sm
  },
  footer: { marginTop: spacing.md }
}))
