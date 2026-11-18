import { requireGitStageWorktreeScopeReceipt } from '../../../../src/shared/git/paths/git-stage-worktree-scope'
import { translate } from '../../i18n/mobile-i18n'
import { requestMobileCommitMessage } from '../../source-control/commits/mobile-commit-message-ai'
import {
  gitUpstreamStatusSchema,
  type MobileGitStatusHostPayload
} from '../../source-control/git/git-status-reply-schema'
import {
  gitBulkStageRun,
  gitCommitRun,
  gitPushRun
} from '../../source-control/git/mobile-git-mutation-operations'
import { gitStatusHostPayloadRead } from '../../source-control/git/mobile-git-read-operations'
import { bindDeferredRpcOperation, defineRpcOperation } from '../../transport/rpc/rpc-operation'
import { rpcResultVariant } from '../../transport/rpc/rpc-operation-result-reader'
import {
  hostReplyErrorTextOrFallback,
  interpretOrThrowRefusalMessage
} from '../../transport/rpc/rpc-refusal-message'
import type { UnvalidatedRpcRequestPort } from '../../transport/rpc/unvalidated-rpc-request-port'
import type { MobileCommitAndPushPorts } from './mobile-commit-and-push-run'

const gitUpstreamStatusRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'git.upstream-status',
    method: 'git.upstreamStatus',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('upstream-status', gitUpstreamStatusSchema)
  })
)

function failedCopy(): string {
  return translate('sourceControl.runners.actionFailed', 'Source control action failed')
}

/** Binds the one-tap run's host calls to this workspace, over the phone's RPC client. */
export function createMobileCommitAndPushPorts(
  client: UnvalidatedRpcRequestPort,
  worktreeId: string
): MobileCommitAndPushPorts {
  const worktree = `id:${worktreeId}`
  let statusRead: Promise<MobileGitStatusHostPayload> | null = null
  const readStatusPayload = () => {
    statusRead ??= gitStatusHostPayloadRead
      .request(client, { worktree, includeLineStats: false })
      .then((reply) =>
        interpretOrThrowRefusalMessage(
          () => gitStatusHostPayloadRead.interpret(reply),
          failedCopy()
        )
      )
    return statusRead
  }
  return {
    readStatus: async () => {
      const status = await readStatusPayload()
      if (status.readError) {
        throw new Error(status.readError)
      }
      const operation = status.conflictOperation
      return {
        changedFiles: status.entries.length,
        branch: status.branch?.replace(/^refs\/heads\//, ''),
        hasUnresolvedConflicts: status.entries.some(
          (entry) => entry.conflictStatus === 'unresolved'
        ),
        operationInProgress: operation !== undefined && operation !== 'unknown'
      }
    },
    readUpstream: async () => {
      try {
        const reply = await gitUpstreamStatusRead.request(client, { worktree })
        return gitUpstreamStatusRead.interpret(reply)
      } catch (error) {
        // Older hosts without git.upstreamStatus still report it inside git.status.
        const fromStatus = (await readStatusPayload().catch(() => null))?.upstreamStatus
        if (fromStatus) {
          return fromStatus
        }
        throw error
      }
    },
    stageAll: async () => {
      // Scope all stages what a capped status list leaves out; an older host must refuse, not stage nothing.
      const reply = await gitBulkStageRun.request(client, { worktree, filePaths: [], scope: 'all' })
      const receipt = interpretOrThrowRefusalMessage(
        () => gitBulkStageRun.interpret(reply),
        failedCopy()
      )
      requireGitStageWorktreeScopeReceipt(receipt, 'all')
    },
    writeMessage: async () => {
      const result = await requestMobileCommitMessage(client, worktreeId)
      return result.success ? result.message : null
    },
    commit: async (message) => {
      const reply = await gitCommitRun.request(client, { worktree, message })
      const outcome = interpretOrThrowRefusalMessage(
        () => gitCommitRun.interpret(reply),
        failedCopy()
      )
      // Acceptance can still carry an in-band commit failure.
      if (outcome.success !== true) {
        throw new Error(
          hostReplyErrorTextOrFallback(
            outcome.error,
            translate('sourceControl.useMobileGitRequests.commitFailed', 'Commit failed')
          )
        )
      }
    },
    push: async ({ publish }) => {
      const reply = await gitPushRun.request(client, publish ? { worktree, publish } : { worktree })
      interpretOrThrowRefusalMessage(() => gitPushRun.interpret(reply), failedCopy())
    }
  }
}
