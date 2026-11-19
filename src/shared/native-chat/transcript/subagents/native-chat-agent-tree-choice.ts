// The person's open/closed choice for each session's agent tree; lives for the app run, never persisted.

const choiceBySession = new Map<string, boolean>()
const listeners = new Set<() => void>()

/** Undefined until the person toggles that session's tree. */
export function nativeChatAgentTreeChoice(sessionKey: string): boolean | undefined {
  return choiceBySession.get(sessionKey)
}

export function chooseNativeChatAgentTreeExpanded(sessionKey: string, expanded: boolean): void {
  if (choiceBySession.get(sessionKey) === expanded) {
    return
  }
  choiceBySession.set(sessionKey, expanded)
  for (const listener of listeners) {
    listener()
  }
}

/** For useSyncExternalStore: every surface showing the same session's tree follows one choice. */
export function subscribeNativeChatAgentTreeChoice(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
