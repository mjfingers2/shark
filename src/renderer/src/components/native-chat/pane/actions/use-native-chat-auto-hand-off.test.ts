// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useNativeChatAutoHandOff } from './use-native-chat-auto-hand-off'

type Props = {
  sessionId: string
  isWorking: boolean
  percentage: number | null
  available: boolean
}

function mount(initial: Props) {
  const startAutomatically = vi.fn()
  const view = renderHook(
    (props: Props) =>
      useNativeChatAutoHandOff({
        sessionId: props.sessionId,
        isWorking: props.isWorking,
        percentage: props.percentage,
        hasPendingPrompt: false,
        handOff: { available: props.available, preparing: false, startAutomatically }
      }),
    { initialProps: initial }
  )
  return { ...view, startAutomatically }
}

describe('useNativeChatAutoHandOff', () => {
  it('splits once when a turn ends past 40%, even if the usage lands just after the turn', () => {
    const base = { sessionId: 'session-late-usage', available: true }
    const { rerender, startAutomatically } = mount({ ...base, isWorking: true, percentage: 30 })
    rerender({ ...base, isWorking: false, percentage: 30 })
    expect(startAutomatically).not.toHaveBeenCalled()
    rerender({ ...base, isWorking: false, percentage: 45 })
    expect(startAutomatically).toHaveBeenCalledTimes(1)

    // The next turn in the same conversation does not split it again.
    rerender({ ...base, isWorking: true, percentage: 45 })
    rerender({ ...base, isWorking: false, percentage: 60 })
    expect(startAutomatically).toHaveBeenCalledTimes(1)
  })

  it('does not split a session that was only opened, already past 40%', () => {
    const { rerender, startAutomatically } = mount({
      sessionId: 'session-opened',
      isWorking: false,
      percentage: 80,
      available: true
    })
    rerender({ sessionId: 'session-opened', isWorking: false, percentage: 80, available: true })
    expect(startAutomatically).not.toHaveBeenCalled()
  })

  it('waits for a hidden pane to be shown before splitting', () => {
    const base = { sessionId: 'session-hidden', percentage: 50 }
    const { rerender, startAutomatically } = mount({ ...base, isWorking: true, available: false })
    rerender({ ...base, isWorking: false, available: false })
    expect(startAutomatically).not.toHaveBeenCalled()
    rerender({ ...base, isWorking: false, available: true })
    expect(startAutomatically).toHaveBeenCalledTimes(1)
  })
})
