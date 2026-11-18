import type { BrowserPageError } from '../../../../src/shared/browser/page-errors/browser-page-error-rules'

// The host keeps one list per page and clears it on a full load; the phone only hides what it already sent.

function errorKey(error: BrowserPageError): string {
  return JSON.stringify([error.message, error.source, error.line])
}

/** The errors the chip counts: listed on the host and not yet sent from this phone. */
export function unsentBrowserPageErrors(
  listed: readonly BrowserPageError[],
  sentKeys: ReadonlySet<string>
): BrowserPageError[] {
  return listed.filter((error) => !sentKeys.has(errorKey(error)))
}

/** Sent keys still worth holding: an error the host dropped (page reloaded) may come back and count again. */
export function nextSentBrowserPageErrorKeys(
  sentKeys: ReadonlySet<string>,
  listed: readonly BrowserPageError[],
  justSent: readonly BrowserPageError[] = []
): ReadonlySet<string> {
  const held = new Set([...sentKeys, ...justSent.map(errorKey)])
  return new Set(listed.map(errorKey).filter((key) => held.has(key)))
}
