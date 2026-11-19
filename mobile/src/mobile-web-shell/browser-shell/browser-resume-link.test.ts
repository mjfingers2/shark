import { describe, expect, it } from 'vitest'
import { homeScreenResumeLink, keepResumeFragment, readResumeFragment } from './browser-resume-link'

const CREDENTIAL = {
  endpoint: 'ws://192.0.2.10:6768',
  deviceToken: 'token-a',
  publicKey: 'cHVibGljLWtleQ==',
  hostId: 'host-1',
  // Not Latin-1: the link must survive a non-ASCII host name.
  name: '민준의 MacBook Pro'
}

function tokenOf(fragment: string): string {
  return new URLSearchParams(fragment.slice(1)).get('resume') ?? ''
}

describe('browser resume link', () => {
  it('round-trips the pairing through the fragment and the manifest query', () => {
    const link = homeScreenResumeLink(CREDENTIAL)
    expect(readResumeFragment(link.fragment)).toEqual(CREDENTIAL)
    expect(link.manifestHref).toBe(`/m-manifest.webmanifest?resume=${tokenOf(link.fragment)}`)
    // URL-safe without escaping, so neither the query nor the fragment can be split by it.
    expect(tokenOf(link.fragment)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('finds the token beside other fragment params and without a leading #', () => {
    const token = tokenOf(homeScreenResumeLink(CREDENTIAL).fragment)
    expect(readResumeFragment(`#other=1&resume=${token}`)).toEqual(CREDENTIAL)
    expect(readResumeFragment(`resume=${token}`)).toEqual(CREDENTIAL)
  })

  it('reads nothing from a missing, damaged or incomplete token', () => {
    expect(readResumeFragment('')).toBeNull()
    expect(readResumeFragment('#pairing=abc')).toBeNull()
    expect(readResumeFragment('#resume=')).toBeNull()
    expect(readResumeFragment('#resume=%%%not-base64')).toBeNull()
    const missingToken = btoa(JSON.stringify({ v: 1, endpoint: 'ws://x', hostId: 'h', name: 'n' }))
    expect(readResumeFragment(`#resume=${missingToken}`)).toBeNull()
  })

  it('puts the pairing back on addresses the app router writes without a fragment', () => {
    const fragment = homeScreenResumeLink(CREDENTIAL).fragment
    expect(keepResumeFragment('/h/host-1', fragment)).toBe(`/h/host-1${fragment}`)
    expect(keepResumeFragment('/h/host-1?tab=2', fragment)).toBe(`/h/host-1?tab=2${fragment}`)
    expect(keepResumeFragment(new URL('http://192.0.2.10:6768/h/x'), fragment)).toBe(
      `http://192.0.2.10:6768/h/x${fragment}`
    )
  })

  it('leaves an address that brings its own fragment, or none at all, alone', () => {
    const fragment = homeScreenResumeLink(CREDENTIAL).fragment
    expect(keepResumeFragment('/h/host-1#section', fragment)).toBe('/h/host-1#section')
    // A state-only update keeps the current address, fragment included.
    expect(keepResumeFragment(null, fragment)).toBeNull()
    expect(keepResumeFragment(undefined, fragment)).toBeUndefined()
  })
})
