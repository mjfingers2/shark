import { toast } from 'sonner'
import { useAppStore } from '@/store/index'
import { translate } from '@/i18n/i18n'
import { findWorktreeById } from '@/store/github/refresh/worktree-refresh'
import { getRepoIdFromWorktreeId } from '../../../../../shared/worktree/id'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host'
import { resolveSourceControlAiForOperation } from '../../../../../shared/source-control/ai/source-control-ai-operation-resolution'
import { hasConfiguredCommitMessageGenerationDefaults } from '@/components/right-sidebar/source-control/ai/text-generation-defaults'
import {
  getRuntimeGitRepoDiscoveryHostKey,
  type RuntimeGitContext
} from '@/runtime/source-control/git/runtime-git-client-context'
import { generateRuntimeCommitMessage } from '@/runtime/source-control/git/runtime-git-generation-client'
import { getRuntimeGitStatus } from '@/runtime/source-control/git/runtime-git-status-client'
import { stageRuntimeGitWorktreeScope } from '@/runtime/source-control/git/runtime-git-working-tree-client'
import {
  commitRuntimeGit,
  getRuntimeGitUpstreamStatus,
  pushRuntimeGit
} from '@/runtime/source-control/git/runtime-git-sync-client'
import { decideCommitAndPush, fallbackCommitMessage } from './commit-and-push-plan'

const running = new Set<string>()

async function writeCommitMessage(
  ctx: RuntimeGitContext,
  worktreeId: string
): Promise<string | null> {
  const state = useAppStore.getState()
  const settings = state.settings
  const repo = state.repos.find(({ id }) => id === getRepoIdFromWorktreeId(worktreeId)) ?? null
  if (!settings || !hasConfiguredCommitMessageGenerationDefaults({ settings, repo })) {
    return null
  }
  const resolved = resolveSourceControlAiForOperation({
    settings,
    repo,
    operation: 'commitMessage',
    discoveryHostKey: getRuntimeGitRepoDiscoveryHostKey(ctx.target, repo, undefined)
  })
  if (!resolved.ok) {
    return null
  }
  const result = await generateRuntimeCommitMessage(ctx, {
    sourceControlAiResolvedParams: resolved.value.params
  }).catch(() => null)
  return result?.success ? result.message.trim() || null : null
}

/**
 * Shark's one-click finish: stage everything in the session, have AI write the commit message
 * (the session's name when AI is unavailable), commit, and push, publishing a new branch.
 */
export async function commitAndPushSession(worktreeId: string): Promise<void> {
  const state = useAppStore.getState()
  const worktree = findWorktreeById(state, worktreeId)
  if (!worktree || running.has(worktreeId)) {
    return
  }
  if (worktree.hostId && worktree.hostId !== LOCAL_EXECUTION_HOST_ID) {
    toast.error(
      translate(
        'shark.commitPush.localOnly',
        'One-click commit and push works for sessions on this computer.'
      )
    )
    return
  }
  running.add(worktreeId)
  const ctx: RuntimeGitContext = {
    target: { kind: 'local' },
    worktreeId,
    worktreePath: worktree.path,
    prefs: state.settings
  }
  const toastId = toast.loading(translate('shark.commitPush.working', 'Committing and pushing…'))
  try {
    const [status, upstream] = await Promise.all([
      getRuntimeGitStatus(ctx, { admissionTier: 'interactive' }),
      getRuntimeGitUpstreamStatus(ctx)
    ])
    const plan = decideCommitAndPush({
      changedFiles: status.entries.length,
      hasUpstream: upstream.hasUpstream,
      ahead: upstream.ahead
    })
    if (plan === 'nothing') {
      toast.info(translate('shark.commitPush.nothing', 'Nothing new to commit or push.'), {
        id: toastId
      })
      return
    }
    let message: string | null = null
    if (plan === 'commit-and-push') {
      await stageRuntimeGitWorktreeScope(ctx, 'all')
      message =
        (await writeCommitMessage(ctx, worktreeId)) ??
        fallbackCommitMessage(worktree.displayName, worktree.branch)
      const committed = await commitRuntimeGit(ctx, message)
      if (!committed.success) {
        throw new Error(committed.error ?? 'commit failed')
      }
    }
    await pushRuntimeGit(ctx, { publish: !upstream.hasUpstream })
    toast.success(translate('shark.commitPush.done', 'Committed and pushed.'), {
      id: toastId,
      description: message?.split('\n')[0]
    })
  } catch (error) {
    toast.error(translate('shark.commitPush.failed', 'Commit and push failed.'), {
      id: toastId,
      description: error instanceof Error ? error.message : String(error)
    })
  } finally {
    running.delete(worktreeId)
  }
}
