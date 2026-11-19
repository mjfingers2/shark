import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, expect, it, vi } from 'vitest'
import type {
  NativeChatMessage,
  NativeChatSubagentEntry
} from '../../../../../../src/shared/native-chat/native-chat-types'
import { MobileNativeChatAgentTree } from './MobileNativeChatAgentTree'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Platform: { OS: 'ios', select: (options: { ios?: unknown }) => options.ios },
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
  Appearance: {
    getColorScheme: () => 'dark',
    addChangeListener: () => ({ remove() {} })
  },
  useColorScheme: () => 'dark'
}))
vi.mock('lucide-react-native', () => ({ ChevronRight: 'Icon' }))

let renderer: ReactTestRenderer | null = null

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = null
})

function message(id: string, agents: NativeChatSubagentEntry[]): NativeChatMessage {
  return {
    id,
    role: 'assistant',
    blocks: [{ type: 'subagent-group', groupId: id, agents }],
    timestamp: 0,
    source: 'transcript'
  }
}

function render(sessionKey: string, messages: NativeChatMessage[]): ReactTestRenderer {
  act(() => {
    renderer = create(
      createElement(MobileNativeChatAgentTree, {
        scope: sessionKey,
        messages,
        agent: 'claude',
        agentWorking: true
      })
    )
  })
  return renderer!
}

function text(tree: ReactTestRenderer): string {
  return tree.root
    .findAll((node) => node.type === 'Text')
    .map((node) => flatten(node.props.children))
    .join('\n')
}

function flatten(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map(flatten).join('')
  }
  return typeof children === 'string' || typeof children === 'number' ? String(children) : ''
}

it('draws nothing for a chat without subagents', () => {
  const tree = render('s0', [
    {
      id: 'm',
      role: 'assistant',
      blocks: [],
      timestamp: 0,
      source: 'transcript'
    }
  ])
  expect(tree.toJSON()).toBeNull()
})

it('opens while a subagent works, lists every subagent, and folds on tap', () => {
  const tree = render('s1', [
    message('g1', [
      {
        id: 'a',
        label: 'Build the Mac side',
        state: 'working',
        operation: { toolName: 'Edit' }
      },
      { id: 'b', label: 'Design', state: 'completed', tokens: 1200 }
    ])
  ])
  expect(text(tree)).toContain('2 agents · 1 working')
  expect(text(tree)).toContain('Main (Claude)')
  expect(text(tree)).toContain('Edit')
  expect(text(tree)).toContain('1.2k')
  expect(tree.root.findAllByProps({ testID: 'native-chat-agent-tree-row' })).toHaveLength(2)

  const header = tree.root.findAll((node) => node.type === 'Pressable')[0]!
  expect(header.props.accessibilityState).toEqual({ expanded: true })
  act(() => header.props.onPress())
  expect(tree.root.findAllByProps({ testID: 'native-chat-agent-tree-row' })).toHaveLength(0)
  expect(
    tree.root.findAll((node) => node.type === 'Pressable')[0]!.props.accessibilityState
  ).toEqual({
    expanded: false
  })
})

it('starts folded once every subagent is done', () => {
  const tree = render('s2', [message('g1', [{ id: 'a', label: 'Design', state: 'completed' }])])
  expect(text(tree)).toContain('1 agent · done')
  expect(tree.root.findAllByProps({ testID: 'native-chat-agent-tree-row' })).toHaveLength(0)
})
