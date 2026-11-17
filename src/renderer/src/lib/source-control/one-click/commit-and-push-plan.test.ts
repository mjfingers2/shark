import { describe, expect, it } from 'vitest'
import { decideCommitAndPush, fallbackCommitMessage } from './commit-and-push-plan'

describe('decideCommitAndPush', () => {
  it('commits and pushes when files changed', () => {
    expect(decideCommitAndPush({ changedFiles: 2, hasUpstream: true, ahead: 0 })).toBe(
      'commit-and-push'
    )
  })
  it('pushes earlier commits or publishes a new branch without committing', () => {
    expect(decideCommitAndPush({ changedFiles: 0, hasUpstream: true, ahead: 3 })).toBe('push-only')
    expect(decideCommitAndPush({ changedFiles: 0, hasUpstream: false, ahead: 0 })).toBe('push-only')
  })
  it('does nothing when the remote already has everything', () => {
    expect(decideCommitAndPush({ changedFiles: 0, hasUpstream: true, ahead: 0 })).toBe('nothing')
  })
})

describe('fallbackCommitMessage', () => {
  it('uses the session name, then the branch', () => {
    expect(fallbackCommitMessage('로그인 버튼 클릭 오류 수정', 'user/fix-login')).toBe(
      '로그인 버튼 클릭 오류 수정'
    )
    expect(fallbackCommitMessage('  ', 'refs/heads/user/fix-login')).toBe('Update fix login')
    expect(fallbackCommitMessage('sawfish', 'user/readme-summary')).toBe('Update readme summary')
    expect(fallbackCommitMessage(undefined, '')).toBe('Update')
  })
})
