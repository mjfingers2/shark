import { ActivityIndicator, Pressable, Text } from 'react-native'
import { CircleAlert, Crosshair } from 'lucide-react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { buttonColor } from '../screencast/mobile-browser-frame-state'
import { MobileBrowserToolbarIconButton } from '../pane-view/MobileBrowserToolbarIconButton'
import type { MobileBrowserPageErrors } from './use-mobile-browser-page-errors'
import type { MobileBrowserElementPointing } from './use-mobile-browser-element-pointing'

type Props = {
  disabled: boolean
  pageErrors: MobileBrowserPageErrors
  pointing: MobileBrowserElementPointing
}

/** Shark's two browser-preview tools in the toolbar: the error chip and the point-at-an-element mode. */
export function MobileBrowserInspectionToolbar({ disabled, pageErrors, pointing }: Props) {
  const t = useMobileTranslation()
  useMobileColorScheme()
  return (
    <>
      {pageErrors.count > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'browser.pageErrors.chipLabel',
            'Send page errors to the AI ({{errorCount}})',
            { errorCount: pageErrors.count }
          )}
          disabled={pageErrors.sending}
          onPress={pageErrors.send}
          style={({ pressed }) => [styles.errorChip, pressed && styles.pressed]}
        >
          {pageErrors.sending ? (
            <ActivityIndicator size="small" color={colors.statusRed} />
          ) : (
            <CircleAlert size={13} color={colors.statusRed} />
          )}
          <Text style={styles.errorCount}>{pageErrors.count}</Text>
        </Pressable>
      ) : null}
      <MobileBrowserToolbarIconButton
        disabled={disabled}
        label={
          pointing.active
            ? t('browser.pointing.stop', 'Stop pointing')
            : t('browser.pointing.start', 'Point at an element')
        }
        onPress={pointing.toggle}
        style={pointing.active ? styles.pointActive : undefined}
      >
        <Crosshair size={15} color={pointing.active ? colors.onAccent : buttonColor(!disabled)} />
      </MobileBrowserToolbarIconButton>
    </>
  )
}

const styles = themedStyleSheet(() => ({
  errorChip: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.statusRed
  },
  errorCount: {
    color: colors.statusRed,
    fontSize: typography.metaSize,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.7
  },
  pointActive: {
    backgroundColor: colors.accentBlue
  }
}))
