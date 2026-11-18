import { Folder, FolderOpen } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { LaunchFolderChoice } from '../../../../src/shared/launch-folder/launch-folder-choices'
import { BottomDrawer } from '../../components/bottom-drawer/BottomDrawer'
import { LIST_LEADING_INSET, ListRow } from '../../components/list/ListGroup'
import { SheetHeader } from '../../components/nav-bar/SheetHeader'
import { SheetPrimaryButton } from '../../components/sheets/SheetPrimaryButton'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

/** Asked once per launch, like the desktop: which recent folder to pick up in, or another one. */
export function HomeLaunchFolderSheet(props: {
  visible: boolean
  choices: readonly LaunchFolderChoice[]
  onPick: (choice: LaunchFolderChoice) => void
  onOpenAnother: () => void
  onClose: () => void
  /** Runs once the sheet has fully gone, so the next sheet or screen can present. */
  onAfterClose: () => void
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { choices } = props
  return (
    <BottomDrawer
      visible={props.visible}
      onClose={props.onClose}
      onAfterClose={props.onAfterClose}
      dragContentToDismiss={false}
      contentScrollable={false}
    >
      <SheetHeader
        title={t('home.quickStart.launchTitle', 'Which folder do you want to work in?')}
        onClose={props.onClose}
      />
      <Text style={styles.description}>
        {choices.length > 0
          ? t('home.quickStart.launchDescription', 'Pick a recent folder or open another one.')
          : t('home.quickStart.launchDescriptionEmpty', 'Open a folder to start.')}
      </Text>
      {choices.length > 0 ? (
        <ScrollView style={styles.group} nestedScrollEnabled>
          {choices.map((choice, index) => (
            <View key={choice.repoId}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <ListRow
                title={choice.name}
                subtitle={choice.path}
                leading={<Folder size={20} color={colors.textSecondary} />}
                accessibilityRole="button"
                onPress={() => props.onPick(choice)}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.footer}>
        <SheetPrimaryButton
          label={t('home.quickStart.openAnother', 'Open another folder')}
          icon={FolderOpen}
          onPress={props.onOpenAnother}
        />
      </View>
    </BottomDrawer>
  )
}

const styles = themedStyleSheet(() => ({
  description: {
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  group: {
    backgroundColor: colors.sheetGroup,
    borderRadius: radii.surface,
    maxHeight: 420,
    flexGrow: 0
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginLeft: LIST_LEADING_INSET
  },
  footer: { marginTop: spacing.md }
}))
