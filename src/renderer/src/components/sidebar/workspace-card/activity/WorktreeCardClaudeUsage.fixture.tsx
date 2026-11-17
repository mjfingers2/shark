import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { useAppStore } from '@/store'
import type { RateLimitWindow } from '../../../../../../shared/rate-limit-types'
import { WorktreeCardClaudeUsage } from './WorktreeCardClaudeUsage'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function win(usedPercent: number, windowMinutes: number, resetsInMs: number): RateLimitWindow {
  return { usedPercent, windowMinutes, resetsAt: Date.now() + resetsInMs, resetDescription: null }
}

function setUsage(): void {
  const current = useAppStore.getState().rateLimits
  useAppStore.setState({
    rateLimits: {
      ...current,
      claude: {
        provider: 'claude',
        planType: 'max',
        session: win(16, 300, 1 * HOUR + 25 * MIN),
        weekly: win(59, 10_080, 2 * DAY + 3 * HOUR),
        fableWeekly: win(77, 10_080, 2 * DAY + 3 * HOUR),
        updatedAt: Date.now(),
        error: null,
        status: 'ok'
      }
    }
  })
}

export const card = defineFixture({
  width: 340,
  setup: setUsage,
  render: () => (
    <div className="bg-sidebar p-2">
      <div className="rounded-lg bg-sidebar-accent p-2">
        <div className="px-2 pb-1 text-[13px] font-medium">master</div>
        <WorktreeCardClaudeUsage />
        <div className="px-2 text-[12px] text-muted-foreground">3 agents</div>
      </div>
    </div>
  )
})
