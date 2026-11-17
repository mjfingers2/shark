import { beforeEach, describe, expect, it, vi } from 'vitest'
import { followFirstChatTitle, resetSessionTitleOwnersForTest } from './session-title-from-chat'

const worktreeId = 'repo-1::/tmp/wt/soapfish'

function makeDeps(initial: string, pending = false) {
  let displayName = initial
  return {
    get displayName() {
      return displayName
    },
    getCurrentDisplayName: vi.fn(() => displayName),
    isPendingFirstAgentMessageRename: vi.fn(() => pending),
    setDisplayName: vi.fn((_id: string, name: string) => {
      displayName = name
    }),
    onRenamed: vi.fn()
  }
}

describe('followFirstChatTitle', () => {
  beforeEach(() => resetSessionTitleOwnersForTest())

  it('follows the first chat from its seed to its generated title', () => {
    const deps = makeDeps('soapfish')
    expect(
      followFirstChatTitle(worktreeId, 'chat-1', '로그인 버튼이 안 눌려요 고쳐 줘', deps)
    ).toBe(true)
    expect(followFirstChatTitle(worktreeId, 'chat-1', '로그인 버튼 클릭 오류 수정', deps)).toBe(
      true
    )
    expect(deps.displayName).toBe('로그인 버튼 클릭 오류 수정')
    expect(deps.onRenamed).toHaveBeenCalledWith('repo-1')
  })

  it('ignores later chats in the same session, such as context hand-offs', () => {
    const deps = makeDeps('soapfish')
    followFirstChatTitle(worktreeId, 'chat-1', '결제 화면 만들기', deps)
    expect(followFirstChatTitle(worktreeId, 'chat-2', '이어서 작업', deps)).toBe(false)
    expect(deps.displayName).toBe('결제 화면 만들기')
  })

  it('stops following once the user renames the session', () => {
    const deps = makeDeps('soapfish')
    followFirstChatTitle(worktreeId, 'chat-1', '첫 요청', deps)
    deps.setDisplayName(worktreeId, '내가 지은 이름')
    expect(followFirstChatTitle(worktreeId, 'chat-1', 'AI 제목', deps)).toBe(false)
    expect(deps.displayName).toBe('내가 지은 이름')
  })

  it('names a blank session that waits for its first message', () => {
    const deps = makeDeps('', true)
    expect(followFirstChatTitle(worktreeId, 'chat-1', 'Fix login', deps)).toBe(true)
  })

  it('leaves a named session such as the main checkout alone', () => {
    const deps = makeDeps('main')
    expect(followFirstChatTitle(worktreeId, 'chat-1', 'Fix login', deps)).toBe(false)
    expect(deps.setDisplayName).not.toHaveBeenCalled()
  })
})
