import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { TextInputModal } from '../../components/sheets/TextInputModal'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { pickedElementLabel } from './picked-element-label'
import type { MobileBrowserElementPointing } from './use-mobile-browser-element-pointing'

/** Over the streamed page while pointing: a tap picks the element under it, then a sheet takes the comment. */
export function MobileBrowserPointOverlay({
  pointing
}: {
  pointing: MobileBrowserElementPointing
}) {
  const t = useMobileTranslation()
  useMobileColorScheme()
  return (
    <>
      {pointing.active ? (
        <Pressable
          style={styles.catcher}
          accessibilityRole="button"
          accessibilityLabel={t('browser.pointing.tapHint', 'Tap the element to comment on')}
          onPress={(event) =>
            pointing.pickAt(event.nativeEvent.locationX, event.nativeEvent.locationY)
          }
        >
          <View pointerEvents="none" style={styles.hint}>
            {pointing.describing ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : null}
            <Text style={styles.hintText}>
              {t('browser.pointing.tapHint', 'Tap the element to comment on')}
            </Text>
          </View>
        </Pressable>
      ) : null}
      <TextInputModal
        visible={pointing.picked !== null}
        title={t('browser.pointing.commentTitle', 'Comment on this element')}
        message={pointing.picked ? pickedElementLabel(pointing.picked) : undefined}
        placeholder={t('browser.pointing.commentPlaceholder', 'What should change here?')}
        submitLabel={t('browser.pointing.sendToAi', 'Send to AI')}
        onSubmit={pointing.sendComment}
        onCancel={pointing.cancelComment}
      />
    </>
  )
}

const styles = themedStyleSheet(() => ({
  catcher: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: colors.accentBlue
  },
  hint: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accentBlue
  },
  hintText: {
    color: colors.onAccent,
    fontSize: typography.metaSize,
    fontWeight: '600'
  }
}))
