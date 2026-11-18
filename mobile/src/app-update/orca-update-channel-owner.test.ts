import { describe, expect, it } from 'vitest'
import { ownsOrcaUpdateChannel } from './orca-update-channel-owner'

describe('ownsOrcaUpdateChannel', () => {
  it("lets Orca's own iOS and Android apps check Orca's feeds", () => {
    expect(ownsOrcaUpdateChannel('com.stably.orca.mobile')).toBe(true)
    expect(ownsOrcaUpdateChannel('dev.orca.app')).toBe(true)
  })

  it('keeps the Shark app off them so it is never "updated" into Orca', () => {
    expect(ownsOrcaUpdateChannel('com.mjfingers2.shark.mobile')).toBe(false)
    expect(ownsOrcaUpdateChannel('com.mjfingers2.shark')).toBe(false)
  })

  it('treats a missing or empty app ID as not Orca', () => {
    expect(ownsOrcaUpdateChannel(undefined)).toBe(false)
    expect(ownsOrcaUpdateChannel(null)).toBe(false)
    expect(ownsOrcaUpdateChannel('')).toBe(false)
  })
})
