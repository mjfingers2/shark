import * as z from 'zod'

// What a browser tab keeps to reach its desktop again after a reload: the same four facts a paired
// phone keeps in its keychain, plus the host's display name. Plain localStorage, because a tab has
// nothing better; the desktop can revoke the token from its Mobile settings.
const BROWSER_CREDENTIAL_KEY = 'shark-browser-shell:credential'

const browserCredentialSchema = z.object({
  v: z.literal(1),
  endpoint: z.string().min(1),
  deviceToken: z.string().min(1),
  publicKey: z.string().min(1),
  hostId: z.string().min(1).max(256),
  name: z.string().min(1).max(256)
})

export type BrowserCredential = Omit<z.infer<typeof browserCredentialSchema>, 'v'>

export type BrowserKeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The record as stored and as carried by a home-screen resume link. */
export function serializeBrowserCredential(credential: BrowserCredential): string {
  return JSON.stringify({ v: 1, ...credential })
}

/** Null for anything that is not a whole record from this build. */
export function parseBrowserCredential(raw: string): BrowserCredential | null {
  try {
    const read = browserCredentialSchema.safeParse(JSON.parse(raw))
    if (!read.success) {
      return null
    }
    const { v: _version, ...credential } = read.data
    return credential
  } catch {
    return null
  }
}

/** Null when nothing is stored, the store is unreadable, or the record is from another build. */
export function readBrowserCredential(
  store: BrowserKeyValueStore | null
): BrowserCredential | null {
  try {
    const raw = store?.getItem(BROWSER_CREDENTIAL_KEY) ?? null
    return raw === null ? null : parseBrowserCredential(raw)
  } catch {
    return null
  }
}

/** False when the store refused the write (private mode, quota), so the caller keeps the link. */
export function saveBrowserCredential(
  store: BrowserKeyValueStore | null,
  credential: BrowserCredential
): boolean {
  if (store === null) {
    return false
  }
  try {
    store.setItem(BROWSER_CREDENTIAL_KEY, serializeBrowserCredential(credential))
    return readBrowserCredential(store)?.deviceToken === credential.deviceToken
  } catch {
    return false
  }
}

const PAIRING_FRAGMENT_KEY = 'pairing'

/** The pairing code carried in `#pairing=<code>`, or null when the fragment names none. */
export function readPairingFragment(hash: string): string | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    const code = new URLSearchParams(fragment).get(PAIRING_FRAGMENT_KEY)
    return code === null || code.trim() === '' ? null : code
  } catch {
    return null
  }
}

/** The same URL without its pairing fragment, so a reload or a shared link never replays the code. */
export function withoutPairingFragment(href: string): string {
  const hashAt = href.indexOf('#')
  if (hashAt === -1) {
    return href
  }
  const params = new URLSearchParams(href.slice(hashAt + 1))
  params.delete(PAIRING_FRAGMENT_KEY)
  const rest = params.toString()
  return rest === '' ? href.slice(0, hashAt) : `${href.slice(0, hashAt)}#${rest}`
}
