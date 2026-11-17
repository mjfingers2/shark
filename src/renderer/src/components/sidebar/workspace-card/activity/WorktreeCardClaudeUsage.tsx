import React from 'react'
import { useAppStore } from '@/store/index'
import { useNow } from '@/hooks/use-now'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type { RateLimitWindow } from '../../../../../../shared/rate-limit-types'
import { clampUsedPercent } from '../../../../../../shared/usage-percentage-display'
import { validResetAt } from '../../../status-bar/usage/usage-reset-caption'

const DAY_MS = 24 * 60 * 60_000

/** "Resets at 10:50 PM" today, "Resets Mon, Nov 16 at 5:00 PM" later, as Claude Code words it. */
function resetCaption(
  resetsAt: number | null,
  now: number,
  locale: string,
  t: ReturnType<typeof useTranslate>
): string | null {
  const at = validResetAt(resetsAt)
  if (at == null || at <= now) {
    return null
  }
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(at)
  if (new Date(at).toDateString() === new Date(now).toDateString() || at - now < DAY_MS / 2) {
    return t('sidebar.claudeUsage.resetsAt', 'Resets at {{time}}', { time })
  }
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(at)
  return t('sidebar.claudeUsage.resetsOn', 'Resets {{day}} at {{time}}', { day, time })
}

function UsageRow({
  label,
  window,
  now
}: {
  label: string
  window: RateLimitWindow
  now: number
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const used = clampUsedPercent(window.usedPercent)
  const caption = resetCaption(window.resetsAt, now, locale, t)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[12px] text-foreground">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{Math.round(used)}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(used)}
        className="h-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <div className="h-full rounded-full bg-usage-meter" style={{ width: `${used}%` }} />
      </div>
      {caption ? <div className="text-[11px] text-muted-foreground">{caption}</div> : null}
    </div>
  )
}

/** The Claude plan's windows above a card's agent list, so a split-up task shows how much is left. */
export const WorktreeCardClaudeUsage = React.memo(function WorktreeCardClaudeUsage() {
  const t = useTranslate()
  const claude = useAppStore((s) => s.rateLimits?.claude ?? null)
  const now = useNow(30_000)
  const rows = [
    { id: 'session', label: t('sidebar.claudeUsage.session', 'Session (5hr)'), w: claude?.session },
    { id: 'weekly', label: t('sidebar.claudeUsage.weekly', 'Weekly (7 day)'), w: claude?.weekly },
    { id: 'fable', label: t('sidebar.claudeUsage.fable', 'Fable limit'), w: claude?.fableWeekly }
  ].filter((row): row is { id: string; label: string; w: RateLimitWindow } => row.w != null)
  if (rows.length === 0) {
    return null
  }
  return (
    <section
      data-worktree-claude-usage
      aria-label={t('sidebar.claudeUsage.title', 'Usage')}
      className="mb-1 space-y-2 px-2 pt-1 pb-1.5"
    >
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t('sidebar.claudeUsage.title', 'Usage')}
      </div>
      {rows.map((row) => (
        <UsageRow key={row.id} label={row.label} window={row.w} now={now} />
      ))}
    </section>
  )
})
