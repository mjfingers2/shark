import type { WorktreeStatus } from '../../../../src/shared/worktree-status-rollup'
import type { AgentDotState } from '../../worktree/agent-lineage/agent-row-display'
import { colors } from '../../theme/mobile-theme'

// Match desktop: working yellow, attention red, interrupted muted, unconfirmed amber, quiet gray.
// Why (Shark): green read as "Claude is still running", so a finished session and an open session
// with nothing running share the quiet gray; only work, questions and trouble stand out.
const WORKING = '#eab308'
const ATTENTION = '#ef4444'
const QUIET = 'rgba(115,115,115,0.4)'

/** The worktree rollup dot, one color per state. */
export const agentStatusColors = (): Record<WorktreeStatus, string> => ({
  working: WORKING,
  monitoring: WORKING,
  active: QUIET,
  done: QUIET,
  permission: ATTENTION,
  failed: ATTENTION,
  interrupted: colors.textMuted,
  unconfirmed: colors.statusAmber,
  inactive: QUIET
})

/** One agent's dot; working and monitoring draw a spinner and an icon instead. */
export const agentDotColors = (): Record<
  Exclude<AgentDotState, 'working' | 'monitoring' | 'unverifiable'>,
  string
> => ({
  done: QUIET,
  blocked: ATTENTION,
  waiting: ATTENTION,
  permission: ATTENTION,
  interrupted: colors.textMuted,
  failed: ATTENTION,
  unconfirmed: colors.statusAmber,
  idle: QUIET
})
