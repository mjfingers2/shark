import { describe, expect, it } from 'vitest'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import { pickBrowserAgentTarget } from './browser-agent-target'

const browser: MobileSessionTab = {
  type: 'browser',
  id: 'b1',
  title: 'Preview',
  browserWorkspaceId: 'w',
  browserPageId: 'p1',
  url: 'http://localhost:5173/',
  loading: false,
  loadError: null,
  canGoBack: false,
  canGoForward: false,
  isActive: true
}

function chat(id: string, updatedAt?: number): MobileSessionTab {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a chat tab with only the fields the target picker reads.
  return {
    type: 'agent-session',
    id,
    title: 'Chat',
    sessionId: `session-${id}`,
    agent: 'claude',
    isActive: false,
    ...(updatedAt === undefined ? {} : { chatStatus: { state: 'done', updatedAt } })
  } as MobileSessionTab
}

function terminal(id: string, state?: 'working' | 'done'): MobileSessionTab {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a terminal tab with only the fields the target picker reads.
  return {
    type: 'terminal',
    id,
    title: 'claude',
    isActive: false,
    terminal: `handle-${id}`,
    launchAgent: 'claude',
    ...(state ? { agentStatus: { agentType: 'claude', state } } : {})
  } as MobileSessionTab
}

describe('pickBrowserAgentTarget', () => {
  it('sends to the most recently active chat even when a terminal agent runs', () => {
    expect(
      pickBrowserAgentTarget([browser, terminal('t1', 'working'), chat('a', 10), chat('b', 20)])
    ).toEqual({ kind: 'chat', sessionId: 'session-b', agent: 'claude' })
  })

  it('falls back to a terminal running an agent when the session has no chat', () => {
    expect(pickBrowserAgentTarget([browser, terminal('t1', 'working')])).toEqual({
      kind: 'terminal',
      terminal: 'handle-t1'
    })
  })

  it('finds nothing in a session with only a browser and a plain shell', () => {
    const shell: MobileSessionTab = {
      type: 'terminal',
      id: 's1',
      title: 'zsh',
      isActive: false,
      terminal: 'handle-s1'
    }
    expect(pickBrowserAgentTarget([browser, shell])).toBeNull()
    expect(pickBrowserAgentTarget([])).toBeNull()
  })
})
