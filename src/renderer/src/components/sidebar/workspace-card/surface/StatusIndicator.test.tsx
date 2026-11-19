import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import StatusIndicator from './StatusIndicator'
import type { WorktreeStatus } from '../../../../../../shared/worktree-status-rollup'

function markupOf(status: WorktreeStatus): string {
  return renderToStaticMarkup(<StatusIndicator status={status} showTooltip={false} />)
}

describe('StatusIndicator', () => {
  // Shark: green read as "Claude is still running", so a finished or merely open session goes quiet.
  it('shows a finished session as the quiet gray dot, not green', () => {
    expect(markupOf('done')).not.toContain('emerald')
    expect(markupOf('done')).toContain('bg-muted-foreground/40')
  })

  it('shows an open session with nothing running as the quiet gray dot, not green', () => {
    expect(markupOf('active')).not.toContain('emerald')
    expect(markupOf('active')).toContain('bg-muted-foreground/40')
  })

  it('still spins while an agent works, and stays red when it failed', () => {
    expect(markupOf('working')).toContain('agent-working-spinner')
    expect(markupOf('failed')).toContain('bg-red-500')
  })
})
