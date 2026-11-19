// The agent tree panel atop a chat: the main agent with every subagent under its spawner.
// Shared by desktop and mobile so both draw the same rows, connectors and counts.

import {
  isSubagentBlock,
  type NativeChatMessage,
  type NativeChatSubagentEntry,
  type NativeChatSubagentState
} from '../../native-chat-types'
import { disambiguateSubagentLabels, namedSubagents } from './native-chat-subagent-items'
import { normalizeSubagentState } from './native-chat-subagent-summary'

export type NativeChatAgentTreeRow = {
  id: string
  label: string
  state: NativeChatSubagentState
  /** The tool it runs now; only while it works. */
  toolName?: string
  tokens?: number
  startedAt?: number
  settledAt?: number
  /** 0 for the main agent's own children; each spawn level adds one. */
  depth: number
  /** The last child of its spawner: draws └─ rather than ├─. */
  isLast: boolean
  /** One flag per ancestor level above this row: true while that level still has siblings below, so a │ runs through. */
  guides: readonly boolean[]
  current: boolean
}

export type NativeChatAgentTreeModel = {
  /** Subagents only; the main agent is not counted. */
  total: number
  working: number
  root: {
    label: string
    state: NativeChatSubagentState | null
    current: boolean
  }
  rows: readonly NativeChatAgentTreeRow[]
}

export type NativeChatAgentTreeInput = {
  /** Every subagent the session names, in roster order. */
  entries: readonly NativeChatSubagentEntry[]
  main: { label: string; state?: NativeChatSubagentState | null }
  /** The subagent whose view is shown; null for the main conversation. */
  viewedId: string | null
  /** Label for a subagent whose provider gave none. */
  unnamed: string
  /** The subagent that spawned this one, when known; null or absent puts it under the main agent. */
  parentOf?: (agentId: string) => string | null
}

/** Null when the session has no subagent, which hides the panel. */
export function buildNativeChatAgentTree(
  input: NativeChatAgentTreeInput
): NativeChatAgentTreeModel | null {
  const { entries, viewedId } = input
  if (entries.length === 0) {
    return null
  }
  const byId = new Map<string, NativeChatSubagentEntry>()
  for (const entry of entries) {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry)
    }
  }
  const ids = [...byId.keys()]
  const labels = disambiguateSubagentLabels(ids.map((id) => byId.get(id)!.label || input.unnamed))
  const labelOf = new Map(ids.map((id, index) => [id, labels[index]!]))
  const childrenOf = groupBySpawner(ids, input.parentOf)

  const rows: NativeChatAgentTreeRow[] = []
  const placed = new Set<string>()
  const place = (spawner: string | null, guides: readonly boolean[]): void => {
    const children = (childrenOf.get(spawner) ?? []).filter((id) => !placed.has(id))
    children.forEach((id) => placed.add(id))
    children.forEach((id, index) => {
      const isLast = index === children.length - 1
      rows.push(toRow(byId.get(id)!, labelOf.get(id)!, guides, isLast, id === viewedId))
      place(id, [...guides, !isLast])
    })
  }
  place(null, [])

  let working = 0
  for (const row of rows) {
    if (row.state === 'working') {
      working += 1
    }
  }
  return {
    total: rows.length,
    working,
    root: {
      label: input.main.label,
      state: input.main.state ?? null,
      current: viewedId === null
    },
    rows
  }
}

/** A transcript's subagents for the tree when no roster sits beside it: first naming row wins, spawners from `parentId`. */
export function nativeChatAgentTreeRoster(messages: readonly NativeChatMessage[]): {
  entries: readonly NativeChatSubagentEntry[]
  parentOf: (agentId: string) => string | null
} {
  const entries = new Map<string, NativeChatSubagentEntry>()
  const spawners = new Map<string, string>()
  for (const message of messages) {
    for (const block of message.blocks) {
      for (const entry of namedSubagents(block)) {
        if (!entries.has(entry.id)) {
          entries.set(entry.id, entry)
        }
      }
      if (isSubagentBlock(block) && block.parentId !== undefined && !spawners.has(block.id)) {
        spawners.set(block.id, block.parentId)
      }
    }
  }
  return { entries: [...entries.values()], parentOf: (agentId) => spawners.get(agentId) ?? null }
}

/** Expanded while any subagent works, unless the person already chose. */
export function isNativeChatAgentTreeExpanded(
  model: Pick<NativeChatAgentTreeModel, 'working'>,
  choice: boolean | undefined
): boolean {
  return choice ?? model.working > 0
}

/** Spawner → children in roster order; a spawner outside the roster, or a spawn loop, falls back to the main agent. */
function groupBySpawner(
  ids: readonly string[],
  parentOf: ((agentId: string) => string | null) | undefined
): Map<string | null, string[]> {
  const known = new Set(ids)
  const spawnerOf = new Map<string, string | null>()
  for (const id of ids) {
    const parent = parentOf?.(id) ?? null
    spawnerOf.set(id, parent !== null && parent !== id && known.has(parent) ? parent : null)
  }
  // A cycle has no path to the main agent; cut it where it is first found.
  for (const id of ids) {
    const seen = new Set<string>([id])
    for (let up = spawnerOf.get(id) ?? null; up !== null; up = spawnerOf.get(up) ?? null) {
      if (seen.has(up)) {
        spawnerOf.set(id, null)
        break
      }
      seen.add(up)
    }
  }
  const childrenOf = new Map<string | null, string[]>()
  for (const id of ids) {
    const spawner = spawnerOf.get(id) ?? null
    const siblings = childrenOf.get(spawner)
    if (siblings) {
      siblings.push(id)
    } else {
      childrenOf.set(spawner, [id])
    }
  }
  return childrenOf
}

function toRow(
  entry: NativeChatSubagentEntry,
  label: string,
  guides: readonly boolean[],
  isLast: boolean,
  current: boolean
): NativeChatAgentTreeRow {
  const state = normalizeSubagentState(entry.state)
  const toolName = state === 'working' ? entry.operation?.toolName?.trim() : undefined
  return {
    id: entry.id,
    label,
    state,
    ...(toolName ? { toolName } : {}),
    ...(typeof entry.tokens === 'number' && Number.isFinite(entry.tokens)
      ? { tokens: entry.tokens }
      : {}),
    ...(entry.startedAt !== undefined ? { startedAt: entry.startedAt } : {}),
    ...(entry.settledAt !== undefined ? { settledAt: entry.settledAt } : {}),
    depth: guides.length,
    isLast,
    guides,
    current
  }
}
