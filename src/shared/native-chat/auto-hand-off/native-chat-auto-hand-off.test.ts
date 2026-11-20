import { describe, expect, it } from 'vitest'

import {
  AUTO_HAND_OFF_CONTEXT_PERCENTAGE,
  shouldAutoHandOffAfterTurn
} from './native-chat-auto-hand-off'

const turnJustEnded = { wasWorking: true, isWorking: false, hasPendingPrompt: false }

describe('shouldAutoHandOffAfterTurn', () => {
  it('hands off when a turn ends with the context at 40% or more', () => {
    expect(AUTO_HAND_OFF_CONTEXT_PERCENTAGE).toBe(40)
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: 52 })).toBe(true)
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: 40 })).toBe(true)
  })

  it('keeps the session below 40%', () => {
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: 39 })).toBe(false)
  })

  it('never splits mid-turn, on a session only opened, or while Claude asks something', () => {
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, isWorking: true, percentage: 70 })).toBe(
      false
    )
    expect(
      shouldAutoHandOffAfterTurn({ ...turnJustEnded, wasWorking: false, percentage: 70 })
    ).toBe(false)
    expect(
      shouldAutoHandOffAfterTurn({ ...turnJustEnded, hasPendingPrompt: true, percentage: 70 })
    ).toBe(false)
  })

  it('does nothing when the context size is unknown', () => {
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: null })).toBe(false)
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: undefined })).toBe(false)
    expect(shouldAutoHandOffAfterTurn({ ...turnJustEnded, percentage: Number.NaN })).toBe(false)
  })
})
