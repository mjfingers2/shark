import { describe, expect, it } from 'vitest'
import {
  runMobileCommitAndPush,
  type MobileCommitAndPushPorts,
  type MobileCommitAndPushStatus,
  type MobileCommitAndPushUpstream
} from './mobile-commit-and-push-run'

type Fake = {
  status?: Partial<MobileCommitAndPushStatus>
  upstream?: Partial<MobileCommitAndPushUpstream>
  message?: string | null | Error
  failCommit?: string
  failPush?: string
}

function fakePorts(fake: Fake = {}) {
  const calls: string[] = []
  const ports: MobileCommitAndPushPorts = {
    readStatus: async () => ({
      changedFiles: 2,
      branch: 'user/fix-login',
      hasUnresolvedConflicts: false,
      operationInProgress: false,
      ...fake.status
    }),
    readUpstream: async () => ({ hasUpstream: true, ahead: 0, behind: 0, ...fake.upstream }),
    stageAll: async () => {
      calls.push('stage')
    },
    writeMessage: async () => {
      calls.push('message')
      if (fake.message instanceof Error) {
        throw fake.message
      }
      return fake.message === undefined ? 'Fix the login button' : fake.message
    },
    commit: async (message) => {
      calls.push(`commit:${message}`)
      if (fake.failCommit) {
        throw new Error(fake.failCommit)
      }
    },
    push: async ({ publish }) => {
      calls.push(`push:${publish ? 'publish' : 'plain'}`)
      if (fake.failPush) {
        throw new Error(fake.failPush)
      }
    }
  }
  return { ports, calls }
}

describe('runMobileCommitAndPush', () => {
  it('stages, commits with the AI message and pushes, reporting each step', async () => {
    const { ports, calls } = fakePorts()
    const steps: string[] = []
    const outcome = await runMobileCommitAndPush(ports, { displayName: 'Login fix' }, (step) =>
      steps.push(step)
    )
    expect(outcome).toEqual({ kind: 'pushed', committedMessage: 'Fix the login button' })
    expect(calls).toEqual(['stage', 'message', 'commit:Fix the login button', 'push:plain'])
    expect(steps).toEqual(['checking', 'staging', 'writing-message', 'committing', 'pushing'])
  })

  it('falls back to the session name when AI fails or writes nothing', async () => {
    const failed = fakePorts({ message: new Error('no model') })
    await runMobileCommitAndPush(failed.ports, { displayName: '로그인 버튼 수정' })
    expect(failed.calls).toContain('commit:로그인 버튼 수정')
    const blank = fakePorts({ message: '   ' })
    await runMobileCommitAndPush(blank.ports, { displayName: 'sawfish' })
    expect(blank.calls).toContain('commit:Update fix login')
  })

  it('publishes a branch without an upstream, and pushes earlier commits without committing', async () => {
    const unpublished = fakePorts({ status: { changedFiles: 0 }, upstream: { hasUpstream: false } })
    expect(await runMobileCommitAndPush(unpublished.ports, { displayName: undefined })).toEqual({
      kind: 'pushed',
      committedMessage: null
    })
    expect(unpublished.calls).toEqual(['push:publish'])
    const ahead = fakePorts({ status: { changedFiles: 0 }, upstream: { ahead: 3 } })
    await runMobileCommitAndPush(ahead.ports, { displayName: undefined })
    expect(ahead.calls).toEqual(['push:plain'])
  })

  it('reports nothing to do when the remote already has everything', async () => {
    const { ports, calls } = fakePorts({ status: { changedFiles: 0 } })
    expect(await runMobileCommitAndPush(ports, { displayName: 'x' })).toEqual({ kind: 'nothing' })
    expect(calls).toEqual([])
  })

  it('changes nothing when conflicts, a detached HEAD or newer remote commits are in the way', async () => {
    const cases: [Fake, string][] = [
      [{ status: { hasUnresolvedConflicts: true } }, 'conflicts'],
      [{ status: { operationInProgress: true } }, 'conflicts'],
      [{ status: { branch: '' } }, 'no-branch'],
      [{ upstream: { ahead: 1, behind: 2 } }, 'behind-remote']
    ]
    for (const [fake, reason] of cases) {
      const { ports, calls } = fakePorts(fake)
      expect(await runMobileCommitAndPush(ports, { displayName: 'x' })).toEqual({
        kind: 'blocked',
        reason
      })
      expect(calls).toEqual([])
    }
  })

  it('names the step that failed and stops there', async () => {
    const commitFails = fakePorts({ failCommit: 'nothing staged' })
    expect(await runMobileCommitAndPush(commitFails.ports, { displayName: 'x' })).toEqual({
      kind: 'failed',
      step: 'committing',
      error: 'nothing staged'
    })
    expect(commitFails.calls.some((call) => call.startsWith('push'))).toBe(false)
    const pushFails = fakePorts({ failPush: 'rejected' })
    expect(await runMobileCommitAndPush(pushFails.ports, { displayName: 'x' })).toMatchObject({
      kind: 'failed',
      step: 'pushing'
    })
  })
})
