import {
  decideCommitAndPush,
  fallbackCommitMessage
} from '../../../../src/shared/source-control/one-click/commit-and-push-plan'

/** What the one-tap run is doing right now, for its progress line. */
export type MobileCommitAndPushStep =
  | 'checking'
  | 'staging'
  | 'writing-message'
  | 'committing'
  | 'pushing'

export type MobileCommitAndPushStatus = {
  changedFiles: number
  /** Empty or missing on a detached HEAD. */
  branch: string | undefined
  hasUnresolvedConflicts: boolean
  /** A merge, rebase or cherry-pick is still open. */
  operationInProgress: boolean
}

export type MobileCommitAndPushUpstream = { hasUpstream: boolean; ahead: number; behind: number }

/** The host calls the run needs; each throws with the host's own message when it fails. */
export type MobileCommitAndPushPorts = {
  readStatus: () => Promise<MobileCommitAndPushStatus>
  readUpstream: () => Promise<MobileCommitAndPushUpstream>
  stageAll: () => Promise<void>
  /** The AI-written message, or null when AI is unavailable or fails. */
  writeMessage: () => Promise<string | null>
  commit: (message: string) => Promise<void>
  push: (options: { publish: boolean }) => Promise<void>
}

export type MobileCommitAndPushBlock = 'conflicts' | 'no-branch' | 'behind-remote'

export type MobileCommitAndPushOutcome =
  | { kind: 'pushed'; committedMessage: string | null }
  | { kind: 'nothing' }
  | { kind: 'blocked'; reason: MobileCommitAndPushBlock }
  | { kind: 'failed'; step: MobileCommitAndPushStep; error: string }

/**
 * Shark's one-tap finish, as the desktop button does it: stage everything, let AI write the message
 * (the session name when it cannot), commit, then push — publishing a branch that has no upstream.
 * Unlike the manual sheet it never force-pushes: a branch the remote moved ahead of stops before any change.
 */
export async function runMobileCommitAndPush(
  ports: MobileCommitAndPushPorts,
  session: { displayName: string | undefined },
  onStep: (step: MobileCommitAndPushStep) => void = () => {}
): Promise<MobileCommitAndPushOutcome> {
  let step: MobileCommitAndPushStep = 'checking'
  const enter = (next: MobileCommitAndPushStep) => {
    step = next
    onStep(next)
  }
  try {
    enter('checking')
    const [status, upstream] = await Promise.all([ports.readStatus(), ports.readUpstream()])
    if (status.hasUnresolvedConflicts || status.operationInProgress) {
      return { kind: 'blocked', reason: 'conflicts' }
    }
    const branch = status.branch?.trim() ?? ''
    if (!branch) {
      return { kind: 'blocked', reason: 'no-branch' }
    }
    const plan = decideCommitAndPush({
      changedFiles: status.changedFiles,
      hasUpstream: upstream.hasUpstream,
      ahead: upstream.ahead
    })
    if (plan === 'nothing') {
      return { kind: 'nothing' }
    }
    if (upstream.hasUpstream && upstream.behind > 0) {
      return { kind: 'blocked', reason: 'behind-remote' }
    }
    let committedMessage: string | null = null
    if (plan === 'commit-and-push') {
      enter('staging')
      await ports.stageAll()
      enter('writing-message')
      const written = await ports.writeMessage().catch(() => null)
      committedMessage = written?.trim() || fallbackCommitMessage(session.displayName, branch)
      enter('committing')
      await ports.commit(committedMessage)
    }
    enter('pushing')
    await ports.push({ publish: !upstream.hasUpstream })
    return { kind: 'pushed', committedMessage }
  } catch (error) {
    return { kind: 'failed', step, error: error instanceof Error ? error.message : String(error) }
  }
}
