import { expect, it, vi } from 'vitest'
import {
  chooseNativeChatAgentTreeExpanded,
  nativeChatAgentTreeChoice,
  subscribeNativeChatAgentTreeChoice
} from './native-chat-agent-tree-choice'

it('keeps each session its own choice and tells subscribers only of changes', () => {
  const listener = vi.fn()
  const unsubscribe = subscribeNativeChatAgentTreeChoice(listener)
  expect(nativeChatAgentTreeChoice('claude:s1')).toBeUndefined()
  chooseNativeChatAgentTreeExpanded('claude:s1', false)
  chooseNativeChatAgentTreeExpanded('claude:s1', false)
  expect(nativeChatAgentTreeChoice('claude:s1')).toBe(false)
  expect(nativeChatAgentTreeChoice('claude:s2')).toBeUndefined()
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  chooseNativeChatAgentTreeExpanded('claude:s1', true)
  expect(listener).toHaveBeenCalledTimes(1)
})
