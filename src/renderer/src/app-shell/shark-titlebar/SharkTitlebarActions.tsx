import {
  Bell,
  BellOff,
  Brush,
  CircleAlert,
  CloudUpload,
  MonitorPlay,
  MousePointerClick,
  Smartphone
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { getBrowserViewportPreset } from '../../../../shared/browser/guest-lifecycle/browser-viewport-presets'
import { getDefaultWorkspaceCleanupRules } from '../../../../shared/workspace-cleanup/workspace-cleanup-policy'
import { applyBrowserViewportPreset } from '@/components/browser-pane/assemble-chrome/viewport/browser-viewport-preset-apply'
import { useBrowserPageErrors } from '@/lib/browser/page-errors/browser-page-errors'
import { sendBrowserPageErrorsToAgent } from '@/lib/browser/page-errors/send-browser-page-errors'
import { requestBrowserPageAnnotate } from '@/lib/browser/shark-grab-request'
import { commitAndPushSession } from '@/lib/source-control/one-click/commit-and-push-session'
import { resolveSharkBrowserTarget } from './shark-titlebar-target'

function TitlebarAction({
  label,
  active,
  disabled,
  onClick,
  children
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`titlebar-icon-button${active ? ' text-primary' : ''}`}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Shark's own tools, one click each from the top of the window. */
export function SharkTitlebarActions(): React.JSX.Element | null {
  const t = useTranslate()
  const target = useAppStore(useShallow(resolveSharkBrowserTarget))
  const worktreeId = useAppStore((s) => s.activeWorktreeId)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const errorCount = useBrowserPageErrors((s) =>
    target ? (s.errorsByPageId[target.browserPageId]?.length ?? 0) : 0
  )
  if (!worktreeId || !settings) {
    return null
  }
  const onPhone = getBrowserViewportPreset(target?.viewportPresetId)?.mobile === true
  const notificationsOn = settings.notifications.enabled
  const cleanupRules = settings.workspaceCleanupPolicy ?? getDefaultWorkspaceCleanupRules()
  const cleanupOn = cleanupRules.unchanged.enabled
  const previewOn = settings.browserAutoPreviewEnabled !== false
  const noPreview = t('shark.titlebar.noPreview', 'Open a preview first')
  const onOff = (on: boolean): string =>
    on ? t('shark.titlebar.on', 'On') : t('shark.titlebar.off', 'Off')

  return (
    <div
      className="flex items-center gap-0.5 mr-1"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <TitlebarAction
        label={
          target ? t('shark.titlebar.annotate', 'Point at something in the preview') : noPreview
        }
        disabled={!target}
        onClick={() => target && requestBrowserPageAnnotate(target.browserPageId)}
      >
        <MousePointerClick size={15} />
      </TitlebarAction>
      <TitlebarAction
        label={
          errorCount > 0
            ? t('shark.titlebar.errors', 'Send {{count}} preview errors to the agent', {
                count: errorCount
              })
            : t('shark.titlebar.noErrors', 'No preview errors')
        }
        active={errorCount > 0}
        disabled={!target || errorCount === 0}
        onClick={() => target && void sendBrowserPageErrorsToAgent(target)}
      >
        <span className={`flex items-center gap-0.5${errorCount > 0 ? ' text-destructive' : ''}`}>
          <CircleAlert size={15} />
          {errorCount > 0 ? <span className="text-[11px] tabular-nums">{errorCount}</span> : null}
        </span>
      </TitlebarAction>
      <TitlebarAction
        label={
          target
            ? onPhone
              ? t('shark.phoneView.off', 'Back to full size')
              : t('shark.phoneView.on', 'View at phone size')
            : noPreview
        }
        active={onPhone}
        disabled={!target}
        onClick={() =>
          target && applyBrowserViewportPreset(target.browserPageId, onPhone ? null : 'mobile-l')
        }
      >
        <Smartphone size={15} />
      </TitlebarAction>
      <TitlebarAction
        label={`${t('shark.titlebar.notifications', 'Notify when the agent finishes')}: ${onOff(notificationsOn)}`}
        active={notificationsOn}
        onClick={() =>
          void updateSettings({
            notifications: { ...settings.notifications, enabled: !notificationsOn }
          })
        }
      >
        {notificationsOn ? <Bell size={15} /> : <BellOff size={15} />}
      </TitlebarAction>
      <TitlebarAction
        label={t('shark.commitPush.button', 'Commit and push everything')}
        onClick={() => void commitAndPushSession(worktreeId)}
      >
        <CloudUpload size={15} />
      </TitlebarAction>
      <TitlebarAction
        label={`${t('shark.titlebar.cleanup', 'Clear empty sessions after a day')}: ${onOff(cleanupOn)}`}
        active={cleanupOn}
        onClick={() =>
          void updateSettings({
            workspaceCleanupPolicy: {
              ...cleanupRules,
              unchanged: { ...cleanupRules.unchanged, enabled: !cleanupOn }
            }
          })
        }
      >
        <Brush size={15} />
      </TitlebarAction>
      <TitlebarAction
        label={`${t('shark.autoPreview.title', 'Open previews automatically')}: ${onOff(previewOn)}`}
        active={previewOn}
        onClick={() => void updateSettings({ browserAutoPreviewEnabled: !previewOn })}
      >
        <MonitorPlay size={15} />
      </TitlebarAction>
    </div>
  )
}
