import { describe, expect, it } from 'vitest'
import { listHomeLaunchChoices, pickQuickSessionRepoId } from './home-launch-choices'

const repo = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  path: `/Users/me/${id}`,
  displayName: id,
  addedAt: 0,
  ...extra
})
const row = (
  worktreeId: string,
  repoId: string,
  lastActivityAt?: number,
  isArchived?: boolean
) => ({
  worktreeId,
  repoId,
  lastActivityAt,
  isArchived
})

describe('listHomeLaunchChoices', () => {
  it('lists the desktop projects newest first with each one’s latest session', () => {
    const choices = listHomeLaunchChoices(
      [repo('games'), repo('shark')],
      [row('g1', 'games', 100), row('g2', 'games', 300), row('s1', 'shark', 500)]
    )
    expect(choices.map((choice) => [choice.name, choice.worktreeId])).toEqual([
      ['shark', 's1'],
      ['games', 'g2']
    ])
  })

  it('leaves out SSH, server, pathless and archived-only projects', () => {
    const choices = listHomeLaunchChoices(
      [
        repo('ssh', { connectionId: 'box' }),
        repo('server', { executionHostId: 'runtime:cloud' }),
        { id: 'nopath' },
        repo('old'),
        repo('kept')
      ],
      [
        row('a', 'ssh', 9),
        row('b', 'server', 9),
        row('c', 'nopath', 9),
        row('d', 'old', 9, true),
        row('e', 'kept')
      ]
    )
    expect(choices.map((choice) => choice.worktreeId)).toEqual(['e'])
  })

  it('names a project after its folder when the host sends no display name', () => {
    const [choice] = listHomeLaunchChoices(
      [{ id: 'r', path: '/Users/me/my-app/' }],
      [row('w', 'r', 1)]
    )
    expect(choice?.name).toBe('my-app')
  })
})

describe('pickQuickSessionRepoId', () => {
  it('starts in the most recently active project', () => {
    expect(
      pickQuickSessionRepoId([repo('a'), repo('b')], [row('a1', 'a', 10), row('b1', 'b', 50)])
    ).toBe('b')
  })

  it('falls back to the newest added project when none has a session', () => {
    expect(pickQuickSessionRepoId([repo('a', { addedAt: 1 }), repo('b', { addedAt: 7 })], [])).toBe(
      'b'
    )
  })

  it('gives nothing when the desktop has no project of its own', () => {
    expect(pickQuickSessionRepoId([], [])).toBeNull()
    expect(pickQuickSessionRepoId([repo('ssh', { connectionId: 'box' })], [])).toBeNull()
  })
})
