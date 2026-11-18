import { FolderPlus, Zap, type LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { colors, feedback, radii, spacing, typography } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

function QuickActionPill(props: {
  label: string
  icon: LucideIcon
  busy?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const Icon = props.icon
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled, busy: props.busy }}
      disabled={props.disabled || props.busy}
      hitSlop={4}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.pill,
        pressed && { opacity: feedback.pressedOpacity },
        props.disabled && { opacity: feedback.disabledOpacity }
      ]}
    >
      {props.busy ? (
        <ActivityIndicator size="small" color={colors.textPrimary} />
      ) : (
        <Icon size={16} strokeWidth={2.2} color={colors.textPrimary} />
      )}
      <Text style={styles.label}>{props.label}</Text>
    </Pressable>
  )
}

/** Shark's one-step starts, stacked above Home's + button: a new session now, or a new project folder. */
export function MobileHomeQuickActions(props: {
  visible: boolean
  bottom: number
  sessionBusy: boolean
  onNewSession: () => void
  onNewProject: () => void
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  if (!props.visible) {
    return null
  }
  return (
    <View style={[styles.anchor, { bottom: props.bottom }]} pointerEvents="box-none">
      <QuickActionPill
        label={t('home.quickStart.newProject', 'New project')}
        icon={FolderPlus}
        disabled={props.sessionBusy}
        onPress={props.onNewProject}
      />
      <QuickActionPill
        label={t('home.quickStart.newSession', 'New session')}
        icon={Zap}
        busy={props.sessionBusy}
        onPress={props.onNewSession}
      />
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  anchor: {
    position: 'absolute',
    right: 18,
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.bgRaised,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  label: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textPrimary
  }
}))
