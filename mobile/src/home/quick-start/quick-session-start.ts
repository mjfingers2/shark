import { readRetiredNameRegistryForRepo } from '../../../../src/shared/worktree/naming/retired-name-cache'
import { EMPTY_RETIRED_NAME_REGISTRY } from '../../../../src/shared/worktree/naming/retired-name-registry'
import { suggestCreatureNameForPaths } from '../../../../src/shared/worktree-name-suggestion'
import { createBlankWorkspace } from '../../new-workspace/creation/blank-workspace-create'
import { localAgentDetectionRead } from '../../new-workspace/creation/mobile-workspace-source-operations'
import { pickWorkspaceAgent } from '../../new-workspace/creation/workspace-agent-selection'
import { readNewWorktreeRuntimeCapabilities } from '../../new-workspace/creation/worktree-create-capability'
import { settingsRead } from '../../settings/mobile-settings-read-operations'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { retiredWorktreeNamesRead } from '../../worktree/catalog/worktree-catalog-operations'
import { pickQuickSessionRepoId } from './home-launch-choices'
import { readHostLaunchState } from './host-projects'

export type QuickSessionOutcome =
  | { kind: 'created'; worktreeId: string; name: string; warning?: string }
  /** Defaults could not be worked out; the full new-workspace form takes over. */
  | { kind: 'needs-form' }
  /** `uncertain`: the reply was lost after a resend, so the session may exist already. */
  | { kind: 'failed'; message: string; uncertain: boolean }

type AgentSettings = Parameters<typeof pickWorkspaceAgent>[0]

async function settled<T>(work: Promise<T>): Promise<T | null> {
  return work.catch(() => null)
}

/**
 * New session in one step, like the desktop's "New session": the most recently active project,
 * a generated name and the default agent, with no form. `random` picks the name.
 */
export async function startQuickSession(
  client: RpcClient,
  random: () => number
): Promise<QuickSessionOutcome> {
  const state = await settled(readHostLaunchState(client))
  const repoId = state ? pickQuickSessionRepoId(state.repos, state.rows) : null
  if (!state || !repoId) {
    return { kind: 'needs-form' }
  }
  const [settingsReply, detectReply, retiredReply, capabilities] = await Promise.all([
    settled(settingsRead.request(client)),
    settled(localAgentDetectionRead.request(client, { repoId })),
    settled(retiredWorktreeNamesRead.request(client, { repo: `id:${repoId}` })),
    settled(readNewWorktreeRuntimeCapabilities(client))
  ])
  if (!capabilities) {
    return { kind: 'needs-form' }
  }
  const settings = settingsReply ? settingsRead.interpret(settingsReply) : null
  const detected = detectReply ? localAgentDetectionRead.interpret(detectReply) : null
  const retired = retiredReply ? retiredWorktreeNamesRead.interpret(retiredReply) : null
  const agent = pickWorkspaceAgent(
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: pickWorkspaceAgent re-checks both fields it reads.
    settings?.accepted ? (Object(settings.value) as AgentSettings) : {},
    detected?.accepted
      ? new Set(detected.value.filter((id): id is string => typeof id === 'string'))
      : null
  )
  const result = await createBlankWorkspace({
    client,
    repoId,
    baseName: suggestCreatureNameForPaths(
      state.rows.map((row) => row.path),
      random,
      retired?.accepted
        ? readRetiredNameRegistryForRepo(retired.value, repoId)
        : EMPTY_RETIRED_NAME_REGISTRY
    ),
    nameWasGenerated: true,
    createdWithAgentId: agent === 'blank' ? undefined : agent,
    comment: undefined,
    // The host applies the project's own setup policy and trust check.
    setupDecision: 'inherit',
    worktreeCreateIdempotency: capabilities.worktreeCreateIdempotency,
    agentLaunchSupported: capabilities.agentLaunch
  })
  if ('error' in result) {
    return { kind: 'failed', message: result.error, uncertain: result.replayed === true }
  }
  return { kind: 'created', ...result }
}
