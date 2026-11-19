import { MobileSwitch } from '../../components/controls/MobileSwitch'
import { ListRow } from '../../components/list/ListGroup'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { SettingsSection } from '../../settings/settings-screen-frame'
import { useSharkNotificationToggle } from './use-shark-notification-toggle'

/** Settings → Shark → This phone: push when an agent finishes. Native only; it reaches the push stack. */
export function SharkPhoneNotificationsSection({
  focused,
  push
}: {
  focused: boolean
  push: (route: string) => void
}) {
  const t = useMobileTranslation()
  const notifications = useSharkNotificationToggle(focused)
  const notifyLabel = t('shark.actions.notifications', 'Notify when AI finishes')
  return (
    <SettingsSection
      first
      title={t('shark.settings.thisPhone', 'This phone')}
      footer={
        notifications.blocked
          ? t(
              'settings.notificationSettingsScreen.notificationsBlocked',
              'Notifications are disabled in system settings.'
            )
          : t(
              'shark.settings.notificationsFooter',
              'Get a push on this phone when an agent finishes its work.'
            )
      }
    >
      <ListRow
        title={notifyLabel}
        accessory={
          <MobileSwitch
            value={notifications.on === true}
            accessibilityLabel={notifyLabel}
            disabled={notifications.on === null || notifications.saving || notifications.blocked}
            onValueChange={(next) => void notifications.toggle(next)}
          />
        }
      />
      <ListRow
        title={t('shark.settings.notificationDetails', 'Notification details')}
        navigates
        onPress={() => push('/notifications')}
      />
    </SettingsSection>
  )
}
