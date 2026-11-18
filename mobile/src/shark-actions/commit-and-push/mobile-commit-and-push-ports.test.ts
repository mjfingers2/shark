import { describe, expect, it } from 'vitest'
import type { RpcResponse } from '../../transport/rpc/rpc-wire-types'
import { createMobileCommitAndPushPorts } from './mobile-commit-and-push-ports'

type Reply = { ok: true; result: unknown } | { ok: false; message: string }

function fakeClient(replies: Record<string, Reply>) {
  const sent: { method: string; params: unknown }[] = []
  const client = {
    sendRequest: async (method: string, params?: unknown): Promise<RpcResponse> => {
      sent.push({ method, params })
      const reply = replies[method] ?? { ok: true, result: {} }
      return reply.ok
        ? { id: '1', ok: true, result: reply.result }
        : { id: '1', ok: false, error: { code: 'failed', message: reply.message } }
    }
  }
  return { client, sent }
}

const STATUS = {
  entries: [
    { path: 'a.ts', status: 'modified', area: 'unstaged' },
    { path: 'b.ts', status: 'modified', area: 'unstaged', conflictStatus: 'unresolved' }
  ],
  conflictOperation: 'unknown',
  branch: 'refs/heads/user/fix-login',
  upstreamStatus: { hasUpstream: true, ahead: 1, behind: 0 }
}

describe('createMobileCommitAndPushPorts', () => {
  it('reads the session status in the run’s terms', async () => {
    const { client } = fakeClient({ 'git.status': { ok: true, result: STATUS } })
    const ports = createMobileCommitAndPushPorts(client, 'repo::/w')
    expect(await ports.readStatus()).toEqual({
      changedFiles: 2,
      branch: 'user/fix-login',
      hasUnresolvedConflicts: true,
      operationInProgress: false
    })
  })

  it('takes the upstream from git.status when the host lacks git.upstreamStatus', async () => {
    const { client } = fakeClient({
      'git.status': { ok: true, result: STATUS },
      'git.upstreamStatus': { ok: false, message: 'method not found' }
    })
    const ports = createMobileCommitAndPushPorts(client, 'repo::/w')
    expect(await ports.readUpstream()).toMatchObject({ hasUpstream: true, ahead: 1, behind: 0 })
  })

  it('stages the whole worktree and refuses a host that cannot', async () => {
    const supported = fakeClient({ 'git.bulkStage': { ok: true, result: { stagedScope: 'all' } } })
    await createMobileCommitAndPushPorts(supported.client, 'repo::/w').stageAll()
    expect(supported.sent[0]).toEqual({
      method: 'git.bulkStage',
      params: { worktree: 'id:repo::/w', filePaths: [], scope: 'all' }
    })
    const older = fakeClient({ 'git.bulkStage': { ok: true, result: {} } })
    await expect(
      createMobileCommitAndPushPorts(older.client, 'repo::/w').stageAll()
    ).rejects.toThrow('cannot stage changes beyond the ones listed')
  })

  it('throws the host’s in-band commit failure and pushes with publish only when asked', async () => {
    const { client, sent } = fakeClient({
      'git.commit': { ok: true, result: { success: false, error: 'nothing to commit' } }
    })
    const ports = createMobileCommitAndPushPorts(client, 'repo::/w')
    await expect(ports.commit('msg')).rejects.toThrow('nothing to commit')
    await ports.push({ publish: true })
    await ports.push({ publish: false })
    expect(sent.filter((call) => call.method === 'git.push').map((call) => call.params)).toEqual([
      { worktree: 'id:repo::/w', publish: true },
      { worktree: 'id:repo::/w' }
    ])
  })
})
