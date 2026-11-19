import { describe, expect, it } from 'vitest'

import { agentDotColors, agentStatusColors } from './agent-status-palette'

const GREENS = ['#10b981', '#86efac', '#147638']

describe('agentStatusColors', () => {
  // Shark: green read as "Claude is still running", so a finished or merely open session goes quiet.
  it('paints a finished session and an open idle session the quiet gray, not green', () => {
    const palette = agentStatusColors()
    expect(GREENS).not.toContain(palette.done)
    expect(GREENS).not.toContain(palette.active)
    expect(palette.done).toBe(palette.inactive)
    expect(palette.active).toBe(palette.inactive)
  })

  it('keeps work yellow and trouble red', () => {
    const palette = agentStatusColors()
    expect(palette.working).toBe('#eab308')
    expect(palette.failed).toBe('#ef4444')
    expect(palette.permission).toBe('#ef4444')
  })
})

describe('agentDotColors', () => {
  it('paints a finished agent the quiet gray, not green', () => {
    const palette = agentDotColors()
    expect(GREENS).not.toContain(palette.done)
    expect(palette.done).toBe(palette.idle)
  })
})
