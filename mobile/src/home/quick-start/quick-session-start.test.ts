import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { RpcResponse } from '../../transport/rpc/rpc-wire-types'

const readHostLaunchState = vi.fn()
const createBlankWorkspace = vi.fn()
const readNewWorktreeRuntimeCapabilities = vi.fn()

vi.mock('./host-projects', () => ({ readHostLaunchState }))
vi.mock('../../new-workspace/creation/blank-workspace-create', () => ({ createBlankWorkspace }))
vi.mock('../../new-workspace/creation/worktree-create-capability', () => ({
  readNewWorktreeRuntimeCapabilities
}))

const { startQuickSession } = await import('./quick-session-start')

const results: Record<string, unknown> = {}
// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a stub that only answers sendRequest, all these tests call.
const client = {
  sendRequest: vi.fn(async (method: string): Promise<RpcResponse> =>
    method in results
      ? { id: 'r', ok: true, result: results[method] }
      : { id: 'r', ok: false, error: { code: 'method_not_found', message: method } }
  )
} as unknown as RpcClient

const capabilities = { worktreeCreateIdempotency: false, agentLaunch: { replay: true } }
const state = {
  repos: [
    { id: 'old', path: '/Users/me/old', displayName: 'old' },
    { id: 'game', path: '/Users/me/game', displayName: 'game' }
  ],
  rows: [
    { worktreeId: 'o1', repoId: 'old', path: '/w/old-1', lastActivityAt: 10 },
    { worktreeId: 'g1', repoId: 'game', path: '/w/game-1', lastActivityAt: 90 }
  ]
}

describe('startQuickSession', () => {
  beforeEach(() => {
    for (const key of Object.keys(results)) {
      delete results[key]
    }
    vi.clearAllMocks()
    readHostLaunchState.mockResolvedValue(state)
    readNewWorktreeRuntimeCapabilities.mockResolvedValue(capabilities)
    createBlankWorkspace.mockResolvedValue({ worktreeId: 'game::new', name: 'otter' })
  })

  it('creates a session in the most recently active project with the default agent', async () => {
    results['settings.get'] = { settings: { defaultTuiAgent: 'codex', disabledTuiAgents: [] } }
    results['preflight.detectAgents'] = ['claude', 'codex']
    await expect(startQuickSession(client, () => 0)).resolves.toEqual({
      kind: 'created',
      worktreeId: 'game::new',
      name: 'otter'
    })
    expect(createBlankWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        repoId: 'game',
        createdWithAgentId: 'codex',
        nameWasGenerated: true,
        setupDecision: 'inherit',
        agentLaunchSupported: { replay: true }
      })
    )
    expect(createBlankWorkspace.mock.calls[0]?.[0].baseName).toMatch(/^[a-z]/)
  })

  it('starts a blank terminal when the default is a blank terminal', async () => {
    results['settings.get'] = { settings: { defaultTuiAgent: 'blank' } }
    await startQuickSession(client, () => 0)
    expect(createBlankWorkspace.mock.calls[0]?.[0].createdWithAgentId).toBeUndefined()
  })

  it('hands over to the form when there is no project or the host’s abilities are unknown', async () => {
    readHostLaunchState.mockResolvedValueOnce({ repos: [], rows: [] })
    await expect(startQuickSession(client, () => 0)).resolves.toEqual({ kind: 'needs-form' })
    readHostLaunchState.mockRejectedValueOnce(new Error('offline'))
    await expect(startQuickSession(client, () => 0)).resolves.toEqual({ kind: 'needs-form' })
    readNewWorktreeRuntimeCapabilities.mockResolvedValueOnce(null)
    await expect(startQuickSession(client, () => 0)).resolves.toEqual({ kind: 'needs-form' })
    expect(createBlankWorkspace).not.toHaveBeenCalled()
  })

  it('reports a refused create, and flags one whose reply was lost', async () => {
    createBlankWorkspace.mockResolvedValueOnce({ error: 'Disk full' })
    await expect(startQuickSession(client, () => 0)).resolves.toEqual({
      kind: 'failed',
      message: 'Disk full',
      uncertain: false
    })
    createBlankWorkspace.mockResolvedValueOnce({ error: 'Already exists', replayed: true })
    await expect(startQuickSession(client, () => 0)).resolves.toMatchObject({ uncertain: true })
  })
})
