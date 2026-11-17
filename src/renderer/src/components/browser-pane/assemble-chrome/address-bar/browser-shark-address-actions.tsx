import { CircleAlert, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import type { BrowserViewportPresetId } from '../../../../../../shared/browser/workspaces/browser-workspace-types'
import { getBrowserViewportPreset } from '../../../../../../shared/browser/guest-lifecycle/browser-viewport-presets'
import { useBrowserPageErrors } from '@/lib/browser/page-errors/browser-page-errors'
import { sendBrowserPageErrorsToAgent } from '@/lib/browser/page-errors/send-browser-page-errors'
import { applyBrowserViewportPreset } from '../viewport/browser-viewport-preset-apply'

const PHONE_PRESET: BrowserViewportPresetId = 'mobile-l'

function TooltipButton({
  tooltip,
  children
}: {
  tooltip: string
  children: React.ReactElement
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

/** Shark: the page's console errors, one click from the session's agent. */
export function BrowserPageErrorsChip({
  browserPageId,
  worktreeId,
  url
}: {
  browserPageId: string
  worktreeId: string
  url: string
}): React.JSX.Element | null {
  const t = useTranslate()
  const count = useBrowserPageErrors((s) => s.errorsByPageId[browserPageId]?.length ?? 0)
  if (count === 0) {
    return null
  }
  const label = t('shark.pageErrors.chip', '{{count}} errors', { count })
  const tooltip = t('shark.pageErrors.tooltip', 'Send these errors to the agent to fix')
  return (
    <TooltipButton tooltip={tooltip}>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="text-destructive"
        aria-label={`${tooltip} (${label})`}
        onClick={() => void sendBrowserPageErrorsToAgent({ browserPageId, worktreeId, url })}
      >
        <CircleAlert className="size-3.5" />
        {label}
      </Button>
    </TooltipButton>
  )
}

/** Shark: one tap between the phone-sized view and the full page. */
export function BrowserPhoneViewButton({
  browserPageId,
  viewportPresetId
}: {
  browserPageId: string
  viewportPresetId: BrowserViewportPresetId | null
}): React.JSX.Element {
  const t = useTranslate()
  const onPhone = getBrowserViewportPreset(viewportPresetId)?.mobile === true
  const tooltip = onPhone
    ? t('shark.phoneView.off', 'Back to full size')
    : t('shark.phoneView.on', 'View at phone size')
  return (
    <TooltipButton tooltip={tooltip}>
      <Button
        type="button"
        size="icon-xs"
        variant="muted-field-icon"
        aria-label={tooltip}
        aria-pressed={onPhone}
        className={onPhone ? 'text-primary' : undefined}
        onClick={() => applyBrowserViewportPreset(browserPageId, onPhone ? null : PHONE_PRESET)}
      >
        <Smartphone className="size-3.5" />
      </Button>
    </TooltipButton>
  )
}
