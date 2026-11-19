import { defineFixture } from '../../../component-fixtures/component-fixture'
import type { NativeChatSubagentEntry } from '../../../../../shared/native-chat/native-chat-types'
import type { NativeChatSubagentRow } from '../../../../../shared/native-chat/transcript/native-chat-transcript-projection'
import { nativeChatAppearanceStyle } from '../appearance/native-chat-appearance-style'
import { NativeChatAgentTree } from './NativeChatAgentTree'

const now = Date.now()

const agents: NativeChatSubagentEntry[] = [
  {
    id: 'mac',
    label: 'Build the Mac side',
    state: 'working',
    startedAt: now - 120_000,
    tokens: 31_200,
    operation: { toolName: 'Edit' }
  },
  {
    id: 'mobile',
    label: 'Build the mobile side',
    state: 'working',
    startedAt: now - 64_000,
    operation: { toolName: 'Bash' }
  },
  {
    id: 'design',
    label: 'Design the feature',
    state: 'completed',
    startedAt: now - 300_000,
    settledAt: now,
    tokens: 8_100
  }
]
const nestedAgents: NativeChatSubagentEntry[] = [
  ...agents.slice(0, 1),
  { id: 'check', label: 'Check refresh race', state: 'failed', startedAt: now - 9_000 },
  ...agents.slice(1)
]

function rows(id: string, parentAgentId?: string): [string, NativeChatSubagentRow[]] {
  return [
    id,
    [
      {
        message: {
          id: `${id}-row`,
          role: 'assistant',
          blocks: [],
          timestamp: now,
          source: 'transcript',
          ...(parentAgentId ? { parentAgentId } : {})
        },
        turnKey: undefined
      }
    ]
  ]
}

const NO_ROWS = new Map<string, readonly NativeChatSubagentRow[]>()
// `check` was spawned by `mac`.
const nestedRows = new Map([rows('mac'), rows('check', 'mac')])

function Tree({
  sessionKey,
  list,
  subagentRows = NO_ROWS,
  viewedId = null,
  mainWorking = true
}: {
  sessionKey: string
  list: readonly NativeChatSubagentEntry[]
  subagentRows?: ReadonlyMap<string, readonly NativeChatSubagentRow[]>
  viewedId?: string | null
  mainWorking?: boolean
}) {
  return (
    <div
      className="native-chat-appearance h-72 bg-chat-canvas"
      style={nativeChatAppearanceStyle({})}
    >
      <NativeChatAgentTree
        sessionKey={sessionKey}
        mainLabel="Claude"
        mainWorking={mainWorking}
        entries={new Map(list.map((agent) => [agent.id, agent]))}
        subagentRows={subagentRows}
        viewedId={viewedId}
        onOpen={() => {}}
      />
    </div>
  )
}

export const working = defineFixture({
  width: 640,
  render: () => <Tree sessionKey="fixture:working" list={agents} />
})

export const nestedViewingChild = defineFixture({
  width: 640,
  render: () => (
    <Tree
      sessionKey="fixture:nested"
      list={nestedAgents}
      subagentRows={nestedRows}
      viewedId="check"
    />
  )
})

export const allDoneCollapsed = defineFixture({
  width: 640,
  render: () => (
    <Tree
      sessionKey="fixture:done"
      mainWorking={false}
      list={agents.map((agent) => ({ ...agent, state: 'completed', settledAt: now }))}
    />
  )
})

export const narrow = defineFixture({
  width: 340,
  render: () => <Tree sessionKey="fixture:narrow" list={agents} />
})
