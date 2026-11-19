import { describe, expect, it } from 'vitest'
import type { NativeChatMessage, NativeChatSubagentEntry } from '../../native-chat-types'
import {
  buildNativeChatAgentTree,
  isNativeChatAgentTreeExpanded,
  nativeChatAgentTreeRoster,
  type NativeChatAgentTreeInput
} from './native-chat-agent-tree-model'

function agent(
  id: string,
  state: NativeChatSubagentEntry['state'],
  extra: Partial<NativeChatSubagentEntry> = {}
): NativeChatSubagentEntry {
  return { id, label: `Task ${id}`, state, ...extra }
}

/** A roster written by a newer build can carry a state this build does not know. */
function agentInUnknownState(id: string, extra: Partial<NativeChatSubagentEntry>) {
  return Object.assign(agent(id, 'working', extra), { state: 'paused-by-newer-build' })
}

function build(overrides: Partial<NativeChatAgentTreeInput>) {
  return buildNativeChatAgentTree({
    entries: [],
    main: { label: 'Claude', state: 'working' },
    viewedId: null,
    unnamed: 'Subagent',
    ...overrides
  })
}

describe('buildNativeChatAgentTree', () => {
  it('hides the panel when the session has no subagent', () => {
    expect(build({ entries: [] })).toBeNull()
  })

  it('counts working children and draws ├─ for all but the last', () => {
    const tree = build({
      entries: [
        agent('a', 'working', {
          operation: { toolName: 'Edit' },
          startedAt: 1,
          tokens: 1200
        }),
        agent('b', 'working', { operation: { toolName: 'Bash' } }),
        agent('c', 'completed', {
          startedAt: 1,
          settledAt: 5,
          operation: { toolName: 'Read' }
        })
      ]
    })!
    expect(tree.total).toBe(3)
    expect(tree.working).toBe(2)
    expect(tree.root).toEqual({
      label: 'Claude',
      state: 'working',
      current: true
    })
    expect(tree.rows.map((row) => [row.id, row.depth, row.isLast])).toEqual([
      ['a', 0, false],
      ['b', 0, false],
      ['c', 0, true]
    ])
    expect(tree.rows[0]).toMatchObject({
      toolName: 'Edit',
      tokens: 1200,
      startedAt: 1
    })
    // A settled child's last tool is history, not what it runs now.
    expect(tree.rows[2]!.toolName).toBeUndefined()
    expect(tree.rows[2]).toMatchObject({ state: 'completed', settledAt: 5 })
  })

  it('marks only the viewed subagent current', () => {
    const tree = build({
      entries: [agent('a', 'idle'), agent('b', 'failed')],
      viewedId: 'b'
    })!
    expect(tree.root.current).toBe(false)
    expect(tree.rows.map((row) => row.current)).toEqual([false, true])
  })

  it('reads an unknown state as unavailable, never as working', () => {
    const tree = build({
      entries: [agentInUnknownState('a', { operation: { toolName: 'Edit' } })]
    })!
    expect(tree.working).toBe(0)
    expect(tree.rows[0]).toMatchObject({ state: 'unverifiable', isLast: true })
    expect(tree.rows[0]!.toolName).toBeUndefined()
  })

  it('names unnamed and repeated labels apart, and keeps the first of a repeated id', () => {
    const tree = build({
      entries: [
        { ...agent('a', 'idle'), label: '' },
        { ...agent('b', 'idle'), label: 'Review' },
        { ...agent('c', 'idle'), label: 'Review' },
        agent('a', 'working')
      ]
    })!
    expect(tree.rows.map((row) => row.label)).toEqual(['Subagent', 'Review', 'Review 2'])
    expect(tree.working).toBe(0)
  })

  it('nests children under their spawner with continuing guides', () => {
    const parents: Record<string, string> = { a1: 'a', a2: 'a', x: 'missing' }
    const tree = build({
      entries: [
        agent('a', 'working'),
        agent('a1', 'working'),
        agent('b', 'idle'),
        agent('a2', 'completed'),
        agent('x', 'idle')
      ],
      parentOf: (id) => parents[id] ?? null
    })!
    expect(tree.rows.map((row) => [row.id, row.depth, row.isLast, row.guides])).toEqual([
      ['a', 0, false, []],
      ['a1', 1, false, [true]],
      ['a2', 1, true, [true]],
      ['b', 0, false, []],
      // A spawner outside the roster leaves its child under the main agent.
      ['x', 0, true, []]
    ])
  })

  it('breaks a spawn loop instead of dropping or repeating rows', () => {
    const parents: Record<string, string> = { a: 'b', b: 'a' }
    const tree = build({
      entries: [agent('a', 'idle'), agent('b', 'idle')],
      parentOf: (id) => parents[id] ?? null
    })!
    expect(tree.rows.map((row) => [row.id, row.depth])).toEqual([
      ['a', 0],
      ['b', 1]
    ])
  })
})

describe('isNativeChatAgentTreeExpanded', () => {
  it('opens while any subagent works and otherwise follows the person', () => {
    expect(isNativeChatAgentTreeExpanded({ working: 2 }, undefined)).toBe(true)
    expect(isNativeChatAgentTreeExpanded({ working: 0 }, undefined)).toBe(false)
    expect(isNativeChatAgentTreeExpanded({ working: 2 }, false)).toBe(false)
    expect(isNativeChatAgentTreeExpanded({ working: 0 }, true)).toBe(true)
  })
})

describe('nativeChatAgentTreeRoster', () => {
  function message(id: string, blocks: NativeChatMessage['blocks']): NativeChatMessage {
    return { id, role: 'assistant', blocks, timestamp: 0, source: 'transcript' }
  }

  it('collects group and single subagent rows once each, with their spawners', () => {
    const roster = nativeChatAgentTreeRoster([
      message('m1', [
        { type: 'text', text: 'Starting' },
        { type: 'subagent-group', groupId: 'g1', agents: [agent('a', 'working')] }
      ]),
      message('m2', [{ type: 'subagent', groupId: 'g2', parentId: 'a', ...agent('b', 'idle') }]),
      message('m3', [{ type: 'subagent', groupId: 'g1', ...agent('a', 'completed') }])
    ])
    expect(roster.entries.map((entry) => [entry.id, entry.state])).toEqual([
      ['a', 'working'],
      ['b', 'idle']
    ])
    expect(roster.parentOf('b')).toBe('a')
    expect(roster.parentOf('a')).toBeNull()
    expect(
      nativeChatAgentTreeRoster([message('m1', [{ type: 'text', text: 'hi' }])]).entries
    ).toEqual([])
  })
})
