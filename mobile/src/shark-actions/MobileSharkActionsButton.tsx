import { useEffect, useRef, useState } from 'react'
import type { HostInstance } from 'react-native'
import { Bell, Brush, CloudUpload, MonitorPlay, Zap } from 'lucide-react-native'
import type { ActionSheetAction } from '../components/sheets/ActionSheetModal'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { PullDownMenu } from '../components/nav-bar/PullDownMenu'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { MobileSessionController } from '../session/use-mobile-session-controller'
import { useMobileCommitAndPush } from './commit-and-push/use-mobile-commit-and-push'
import { useSharkHostSettings } from './host-settings/use-shark-host-settings'

/** Shark's session tools from the header, the phone's take on the desktop's title-bar buttons. */
export function MobileSharkActionsButton({ controller }: { controller: MobileSessionController }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const anchorRef = useRef<HostInstance>(null)
  const [open, setOpen] = useState(false)
  const {
    client,
    pairedHostClient,
    connState,
    worktreeId,
    worktreeName,
    isFolderWorkspaceRoute,
    isFloatingWorkspaceRoute,
    router,
    showToast
  } = controller
  const commitPush = useMobileCommitAndPush({
    client: connState === 'connected' ? client : null,
    worktreeId,
    displayName: worktreeName || undefined,
    showToast
  })
  // Read only while the menu is open, so opening a session sends no extra request.
  const host = useSharkHostSettings(pairedHostClient, open)
  useEffect(() => {
    if (host.error) {
      showToast(host.error, 2_500)
    }
  }, [host.error, showToast])
  const onOff = (on: boolean | null | undefined) =>
    on ? t('shark.actions.on', 'On') : t('shark.actions.off', 'Off')
  const olderDesktop = t('shark.actions.olderDesktop', 'Update Shark on the desktop to change this')
  const cleanupOn = host.settings?.cleanupRules?.unchanged.enabled
  const previewOn = host.settings?.autoPreview
  const canCommit = !isFolderWorkspaceRoute && !isFloatingWorkspaceRoute

  const sessionActions: ActionSheetAction[] = canCommit
    ? [
        {
          id: 'commitPush',
          label: t('shark.actions.commitPush', 'Commit + push'),
          hint: commitPush.running
            ? t('shark.actions.commitPushRunning', 'Already committing and pushing')
            : undefined,
          icon: CloudUpload,
          loading: commitPush.running,
          disabled: connState !== 'connected' || commitPush.running,
          closeBeforePress: true,
          onPress: commitPush.run
        }
      ]
    : []
  const hostToggle = (
    id: string,
    label: string,
    icon: ActionSheetAction['icon'],
    value: boolean | null | undefined,
    onPress: () => void
  ): ActionSheetAction => ({
    id,
    label,
    icon,
    // Unread yet (undefined) or not offered by this desktop (null).
    status: value === undefined ? '…' : value === null ? undefined : onOff(value),
    checked: value === true,
    disabled: value == null || host.saving,
    hint: value === null ? olderDesktop : undefined,
    skipAutoClose: true,
    onPress
  })
  const toggles: ActionSheetAction[] = [
    {
      id: 'notifications',
      label: t('shark.actions.notifications', 'Notify when AI finishes'),
      hint: t('shark.actions.notificationsHint', 'Opens this phone’s notification settings'),
      icon: Bell,
      closeBeforePress: true,
      onPress: () => router.push('/notifications')
    },
    hostToggle(
      'emptySessionCleanup',
      t('shark.actions.cleanup', 'Clear empty sessions after a day'),
      Brush,
      host.settings ? (host.settings.cleanupRules ? cleanupOn : null) : undefined,
      () => host.toggle({ kind: 'emptySessionCleanup', enabled: !cleanupOn })
    ),
    hostToggle(
      'autoPreview',
      t('shark.actions.autoPreview', 'Auto-preview when a web server starts'),
      MonitorPlay,
      host.settings ? previewOn : undefined,
      () => host.toggle({ kind: 'autoPreview', enabled: !previewOn })
    )
  ]
  return (
    <>
      <NavBarButton
        ref={anchorRef}
        active={open || commitPush.running}
        accessibilityLabel={t('shark.actions.open', 'Shark actions')}
        icon={Zap}
        onPress={() => setOpen(true)}
      />
      <PullDownMenu
        visible={open}
        anchorRef={anchorRef}
        groups={[sessionActions, toggles]}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
