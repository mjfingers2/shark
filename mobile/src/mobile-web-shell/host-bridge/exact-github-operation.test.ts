import { describe, expect, it } from 'vitest'
import { classifyExactGitHubOperation as shared } from './exact-github-operation'
import { classifyExactGitHubOperation as web } from './exact-github-operation.web'

const SOURCE = {
  expectedRuntimeSource: { sourceId: 'install-1', runtimeId: 'runtime-1' }
}

const CASES: [string, unknown, unknown][] = [
  ['github.updateIssue', { ownerRepo: { owner: 'o', repo: 'r' } }, SOURCE],
  ['github.listLabels', { ownerRepo: { owner: 'o', repo: 'r', host: 'ghe.example' } }, SOURCE],
  ['github.listLabels', { ownerRepo: { owner: 'o', repo: 'r', host: '' } }, SOURCE],
  ['github.workItemDetails', { ownerRepo: { owner: 'o', repo: 'r' } }, undefined],
  ['github.workItemDetails', { repo: 'x' }, SOURCE],
  ['worktree.list', { ownerRepo: { owner: 'o', repo: 'r' } }, SOURCE],
  ['github.listAssignableUsers', ['not', 'a', 'record'], SOURCE]
]

const INVALID: [string, unknown, unknown][] = [
  ['github.updateIssue', { ownerRepo: { owner: '', repo: 'r' } }, SOURCE],
  ['github.updateIssue', { ownerRepo: { owner: 'o', repo: 7 } }, SOURCE],
  ['github.updateIssue', { ownerRepo: { owner: 'o', repo: 'r' } }, { expectedRuntimeSource: {} }]
]

describe('page copy of the exact GitHub operation classifier', () => {
  it('answers what the shared classifier answers', () => {
    for (const [method, params, envelope] of CASES) {
      expect(web(method, params, envelope), method).toEqual(shared(method, params, envelope))
    }
  })

  it('refuses what the shared classifier refuses', () => {
    for (const [method, params, envelope] of INVALID) {
      expect(() => shared(method, params, envelope)).toThrow()
      expect(() => web(method, params, envelope)).toThrow('Unable to identify the GitHub operation')
    }
  })
})
