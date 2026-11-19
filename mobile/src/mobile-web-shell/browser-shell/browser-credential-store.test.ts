import { describe, expect, it } from 'vitest'
import {
  readBrowserCredential,
  readPairingFragment,
  saveBrowserCredential,
  withoutPairingFragment
} from './browser-credential-store'
import { createMemoryStore } from './browser-shell-test-store'

const CREDENTIAL = {
  endpoint: 'ws://192.0.2.10:6768',
  deviceToken: 'token-a',
  publicKey: 'cHVibGljLWtleQ==',
  hostId: 'host-1',
  name: 'Studio Mac'
}

describe('browser credential store', () => {
  it('round-trips a saved credential', () => {
    const store = createMemoryStore()
    expect(readBrowserCredential(store)).toBeNull()
    expect(saveBrowserCredential(store, CREDENTIAL)).toBe(true)
    expect(readBrowserCredential(store)).toEqual(CREDENTIAL)
  })

  it('reads nothing from a missing, broken or throwing store', () => {
    expect(readBrowserCredential(null)).toBeNull()
    const store = createMemoryStore()
    store.setItem('shark-browser-shell:credential', '{not json')
    expect(readBrowserCredential(store)).toBeNull()
    store.setItem('shark-browser-shell:credential', JSON.stringify({ v: 9, ...CREDENTIAL }))
    expect(readBrowserCredential(store)).toBeNull()
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {}
    }
    expect(readBrowserCredential(throwing)).toBeNull()
    expect(saveBrowserCredential(throwing, CREDENTIAL)).toBe(false)
    expect(saveBrowserCredential(null, CREDENTIAL)).toBe(false)
  })

  it('reads the pairing code from the fragment, percent-decoded', () => {
    const code = 'eyJ2IjoyfQ+/='
    expect(readPairingFragment(`#pairing=${encodeURIComponent(code)}`)).toBe(code)
    const link = 'orca://pair?code=eyJ2IjoyfQ'
    expect(readPairingFragment(`#pairing=${encodeURIComponent(link)}`)).toBe(link)
    expect(readPairingFragment('#other=1')).toBeNull()
    expect(readPairingFragment('')).toBeNull()
    expect(readPairingFragment('#pairing=')).toBeNull()
  })

  it('strips only the pairing fragment', () => {
    expect(withoutPairingFragment('http://192.0.2.10:6768/m#pairing=abc')).toBe(
      'http://192.0.2.10:6768/m'
    )
    expect(withoutPairingFragment('http://h/m#pairing=abc&keep=1')).toBe('http://h/m#keep=1')
    expect(withoutPairingFragment('http://h/m')).toBe('http://h/m')
  })
})
