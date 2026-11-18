import { describe, expect, it } from 'vitest'
import { listLaunchFolderChoices } from './launch-folder-choices'

const repo = (id: string, addedAt = 0) => ({
  id,
  path: `/work/${id}`,
  displayName: id,
  addedAt
})
const worktree = (id: string, lastActivityAt: number, isArchived = false) => ({
  id,
  lastActivityAt,
  isArchived
})

describe('listLaunchFolderChoices', () => {
  it('lists projects newest first and reopens each one’s latest session', () => {
    const choices = listLaunchFolderChoices([repo('games'), repo('shark')], {
      games: [worktree('games::a', 100), worktree('games::b', 300)],
      shark: [worktree('shark::main', 500)]
    })
    expect(choices.map((choice) => [choice.name, choice.worktreeId])).toEqual([
      ['shark', 'shark::main'],
      ['games', 'games::b']
    ])
  })

  it('skips archived sessions and projects with nothing left to reopen', () => {
    const choices = listLaunchFolderChoices([repo('old'), repo('live')], {
      old: [worktree('old::gone', 900, true)],
      live: [worktree('live::archived', 900, true), worktree('live::kept', 10)]
    })
    expect(choices.map((choice) => choice.worktreeId)).toEqual(['live::kept'])
  })

  it('handles no projects, missing session lists and odd limits', () => {
    expect(listLaunchFolderChoices([], {})).toEqual([])
    expect(listLaunchFolderChoices([repo('x')], {})).toEqual([])
    const many = Array.from({ length: 10 }, (_, index) => repo(`p${index}`))
    const byRepo = Object.fromEntries(many.map((r, i) => [r.id, [worktree(`${r.id}::w`, i)]]))
    expect(listLaunchFolderChoices(many, byRepo)).toHaveLength(6)
    expect(listLaunchFolderChoices(many, byRepo, -1)).toEqual([])
  })
})
