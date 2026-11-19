import {
  parseBrowserCredential,
  serializeBrowserCredential,
  type BrowserCredential
} from './browser-credential-store'

// Why: an iPad home-screen app keeps storage apart from Safari's, and the one-time pairing code is
// spent by the time the user taps Add to Home Screen. So the pairing itself rides into the new app:
// in the start_url of the manifest the desktop serves, and in this tab's own fragment for an iOS
// that saves the current address instead. Fragments never reach a server or a Referer header; the
// manifest query only reaches the desktop that issued the token.
const RESUME_KEY = 'resume'
const MANIFEST_PATHNAME = '/m-manifest.webmanifest'

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string | null {
  try {
    const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0))
    )
  } catch {
    return null
  }
}

/** Where a home-screen copy of this tab finds its pairing: the tab's fragment and its manifest. */
export function homeScreenResumeLink(credential: BrowserCredential): {
  fragment: string
  manifestHref: string
} {
  const token = toBase64Url(serializeBrowserCredential(credential))
  return {
    fragment: `#${RESUME_KEY}=${token}`,
    manifestHref: `${MANIFEST_PATHNAME}?${RESUME_KEY}=${token}`
  }
}

/**
 * The address to hand history.replaceState/pushState so the tab keeps its resume fragment: the app
 * router rewrites the path (/m → /h/<host>) without one, and iOS may save that very address.
 */
export function keepResumeFragment<T extends string | URL | null | undefined>(
  url: T,
  fragment: string
): T | string {
  if (url === null || url === undefined) {
    return url
  }
  const text = String(url)
  return text.includes('#') ? url : `${text}${fragment}`
}

/** The pairing a home-screen app was launched with, or null when the fragment carries none. */
export function readResumeFragment(hash: string): BrowserCredential | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  const token = new URLSearchParams(fragment).get(RESUME_KEY)
  if (token === null || token === '') {
    return null
  }
  const raw = fromBase64Url(token)
  return raw === null ? null : parseBrowserCredential(raw)
}
