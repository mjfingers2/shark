import { describe, expect, it } from 'vitest'
import { createMobileWebAppUrl } from './runtime-rpc-pairing-types'

// Shape of a real phone QR code; the base64 payload itself is opaque here.
const PAIRING_URL = 'orca://pair?code=eyJ2IjoyLCJlbmRwb2ludCI6IndzOi8vMTkyLjE2OC4wLjU6Njc2OCJ9'

describe('createMobileWebAppUrl', () => {
  it('points at /m on the listener and carries the encoded pairing code', () => {
    const url = createMobileWebAppUrl('ws://192.168.0.5:6768', PAIRING_URL)

    expect(url).toBe(`http://192.168.0.5:6768/m#pairing=${encodeURIComponent(PAIRING_URL)}`)
    const fragment = new URLSearchParams(new URL(url ?? '').hash.slice(1))
    expect(fragment.get('pairing')).toBe(PAIRING_URL)
  })

  it('keeps TLS and IPv6 brackets', () => {
    expect(createMobileWebAppUrl('wss://[fd7a::5]:6768', PAIRING_URL)).toBe(
      `https://[fd7a::5]:6768/m#pairing=${encodeURIComponent(PAIRING_URL)}`
    )
  })

  it('returns null when a tablet could not reach the endpoint', () => {
    expect(createMobileWebAppUrl(null, PAIRING_URL)).toBeNull()
    expect(createMobileWebAppUrl('ws://127.0.0.1:6768', PAIRING_URL)).toBeNull()
    expect(createMobileWebAppUrl('ws://localhost:6768', PAIRING_URL)).toBeNull()
    expect(createMobileWebAppUrl('not a url', PAIRING_URL)).toBeNull()
  })

  it('returns null for a path-prefixed proxy endpoint, which would not route /m', () => {
    expect(createMobileWebAppUrl('wss://example.com/orca', PAIRING_URL)).toBeNull()
  })
})
