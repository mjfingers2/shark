import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import { isMobileTerminalTabRunningAgent } from '../../session/tabs/mobile-terminal-tab-agent'

/** Where a browser finding goes: the session's chat, or a terminal agent when there is no chat. */
export type BrowserAgentTarget =
  | { kind: 'chat'; sessionId: string; agent: string }
  | { kind: 'terminal'; terminal: string }

/** The desktop's rule: the chat first (the most recently active one); a terminal agent only without one. */
export function pickBrowserAgentTarget(
  tabs: readonly MobileSessionTab[]
): BrowserAgentTarget | null {
  let chat: { sessionId: string; agent: string; updatedAt: number } | null = null
  for (const tab of tabs) {
    if (tab.type !== 'agent-session' || !tab.sessionId) {
      continue
    }
    const updatedAt = tab.chatStatus?.updatedAt ?? 0
    if (!chat || updatedAt > chat.updatedAt) {
      chat = { sessionId: tab.sessionId, agent: tab.agent, updatedAt }
    }
  }
  if (chat) {
    return { kind: 'chat', sessionId: chat.sessionId, agent: chat.agent }
  }
  for (const tab of tabs) {
    if (tab.type === 'terminal' && tab.terminal && isMobileTerminalTabRunningAgent(tab)) {
      return { kind: 'terminal', terminal: tab.terminal }
    }
  }
  return null
}
