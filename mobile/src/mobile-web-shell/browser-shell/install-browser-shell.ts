import { connect } from '../../transport/rpc/direct-rpc-connect'
import { activateMobileUiLocale } from '../../i18n/mobile-i18n'
import { readDeviceUiLocaleTags, resolveUiLocaleFromTags } from '../../i18n/system-ui-locale'
import type { BridgeRpcClient } from '../bridge/client-state/bridge-rpc-client-contract'
import {
  readBrowserCredential,
  readPairingFragment,
  saveBrowserCredential,
  withoutPairingFragment,
  type BrowserCredential,
  type BrowserKeyValueStore
} from './browser-credential-store'
import { BrowserPairingError, pairBrowserShell } from './browser-shell-pairing'
import { homeScreenResumeLink, keepResumeFragment, readResumeFragment } from './browser-resume-link'
import { renderBrowserShellNotice, type BrowserShellNotice } from './browser-shell-notice'
import { startBrowserShellSession } from './browser-shell-session'
import { coverViewport } from './browser-shell-geometry'

const PAIRING_TIMEOUT_MS = 20_000

function openLocalStorage(win: Window): BrowserKeyValueStore | null {
  try {
    return win.localStorage
  } catch {
    // Safari throws on access when site data is blocked.
    return null
  }
}

// The desktop that served this document is the one to dial: same host and port, upgraded to a socket.
function sameOriginEndpoint(location: Location): string {
  return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
}

function noticeFor(error: unknown): BrowserShellNotice {
  if (!(error instanceof BrowserPairingError)) {
    return 'unreachable'
  }
  switch (error.reason) {
    case 'invalid-code':
      return 'invalid-link'
    case 'rejected':
      return 'link-used'
    case 'unreachable':
      return 'unreachable'
  }
}

async function showNotice(container: HTMLElement, kind: BrowserShellNotice): Promise<null> {
  // Settles to English on failure, so the notice always renders.
  await activateMobileUiLocale(resolveUiLocaleFromTags(readDeviceUiLocaleTags()))
  renderBrowserShellNotice(container, kind)
  return null
}

function stripPairingFragment(win: Window): void {
  win.history.replaceState(win.history.state, '', withoutPairingFragment(win.location.href))
}

// A home-screen app launched with the pairing it was added with: keep it, as Safari kept its own.
function restoreFromResumeLink(
  win: Window,
  store: BrowserKeyValueStore | null
): BrowserCredential | null {
  const resumed = readResumeFragment(win.location.hash)
  if (resumed !== null) {
    saveBrowserCredential(store, resumed)
  }
  return resumed
}

// Why: the app router replaces /m with /h/<host> right after connecting, which would drop the
// fragment before the user ever reaches Add to Home Screen.
function keepFragmentThroughRouting(history: History, fragment: string): void {
  const replace = history.replaceState.bind(history)
  const push = history.pushState.bind(history)
  history.replaceState = (data, unused, url) =>
    replace(data, unused, keepResumeFragment(url, fragment))
  history.pushState = (data, unused, url) => push(data, unused, keepResumeFragment(url, fragment))
}

// Hands the pairing to whatever Add to Home Screen saves: the manifest's start_url, or this address.
function offerHomeScreenResume(win: Window, credential: BrowserCredential): void {
  const link = homeScreenResumeLink(credential)
  const base = withoutPairingFragment(win.location.href).split('#')[0]
  win.history.replaceState(win.history.state, '', `${base}${link.fragment}`)
  keepFragmentThroughRouting(win.history, link.fragment)
  const doc = win.document
  const manifest =
    doc.querySelector<HTMLLinkElement>('link[rel="manifest"]') ?? doc.createElement('link')
  manifest.rel = 'manifest'
  manifest.href = link.manifestHref
  doc.head.append(manifest)
}

// Pair from `#pairing=` when the tab carries one; otherwise reuse what an earlier visit saved.
async function resolveCredential(
  win: Window,
  store: BrowserKeyValueStore | null
): Promise<BrowserCredential | BrowserShellNotice> {
  const saved = readBrowserCredential(store)
  const code = readPairingFragment(win.location.hash)
  if (code === null) {
    return saved ?? restoreFromResumeLink(win, store) ?? 'open-from-desktop'
  }
  try {
    const paired = await pairBrowserShell({
      code,
      endpoint: sameOriginEndpoint(win.location),
      existing: saved,
      deps: {
        connect: (endpoint, deviceToken, publicKeyB64) =>
          connect(endpoint, deviceToken, publicKeyB64),
        now: () => Date.now(),
        randomBytes: (length) => win.crypto.getRandomValues(new Uint8Array(length)),
        timeoutMs: PAIRING_TIMEOUT_MS
      }
    })
    // Keep the link while nothing holds the token: a home-screen app has storage apart from Safari's,
    // and the link is then the only way back in.
    if (saveBrowserCredential(store, paired)) {
      stripPairingFragment(win)
    } else {
      console.warn('[browser-shell] this browser would not keep the pairing; keeping the link')
    }
    return paired
  } catch (error) {
    console.warn('[browser-shell] pairing from the link failed', error)
    if (saved === null) {
      return restoreFromResumeLink(win, store) ?? noticeFor(error)
    }
    // A spent link next to a working pairing is just an old bookmark.
    stripPairingFragment(win)
    return saved
  }
}

/**
 * Plays the native shell's part for a page opened in a plain browser: pairs from the link the
 * desktop handed out (or reuses the saved pairing), connects to that desktop, and returns the page
 * client the entry would otherwise have read from the app's bridge. Null when the tab shows a
 * notice instead, because there is no desktop it can talk to.
 */
export async function installBrowserShell(args: {
  win: Window
  container: HTMLElement
}): Promise<BridgeRpcClient | null> {
  const { win, container } = args
  // Before any measuring: safe-area insets read zero until the page covers the viewport.
  coverViewport(win.document)
  const store = openLocalStorage(win)
  const resolved = await resolveCredential(win, store)
  if (typeof resolved === 'string') {
    return showNotice(container, resolved)
  }
  offerHomeScreenResume(win, resolved)
  return startBrowserShellSession({
    win,
    store,
    credential: resolved,
    connect
  })
}
