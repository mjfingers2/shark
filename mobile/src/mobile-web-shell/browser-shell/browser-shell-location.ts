// Kept free of imports: the page entry reads it at boot, before deciding to load the browser shell.

// Android serves the shell's own documents from https://<label>.orca-mobile-web.invalid, iOS from a
// custom scheme; a document there without its bridge is a WebView whose bridge is still off.
const NATIVE_SHELL_HOST_SUFFIX = '.orca-mobile-web.invalid'

/** True only for a document a browser fetched from the desktop, never one inside the app's WebView. */
export function isBrowserShellLocation(location: { protocol: string; hostname: string }): boolean {
  return (
    (location.protocol === 'http:' || location.protocol === 'https:') &&
    !location.hostname.endsWith(NATIVE_SHELL_HOST_SUFFIX)
  )
}
