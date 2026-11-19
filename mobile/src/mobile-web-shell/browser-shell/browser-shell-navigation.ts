import { matchesRoutePattern } from '../routing/page-route-policy'
import { BridgeInitRouteSchema, type BridgeInitRoute } from '../bridge/protocol/bridge-init-route'
import type { BridgeNavigateBackOutcome } from '../host-bridge/bridge-host-contract'
import { browserAliasPath } from '../../settings/browser-settings-sections'
import { BROWSER_SHELL_PAGE_ROUTES } from './browser-shell-routes'

function hostRoot(hostId: string): string {
  return `/h/${encodeURIComponent(hostId)}`
}

function hostIdOf(pathname: string): string | null {
  const [empty, h, encoded] = pathname.split('/')
  if (empty !== '' || h !== 'h' || encoded === undefined || encoded === '') {
    return null
  }
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

// A page route of this host's own; another host's screens, `/`, settings and native-only screens are not.
function servesPath(pathname: string, hostId: string): boolean {
  return (
    hostIdOf(pathname) === hostId &&
    BROWSER_SHELL_PAGE_ROUTES.some((route) => matchesRoutePattern(pathname, route.pathname))
  )
}

/**
 * Where a document opened at `pathname?search` starts: the screen it names when this tab serves it
 * for the paired host, else the host's home. Query params ride along only while init accepts them.
 */
export function browserShellStartRoute(
  pathname: string,
  search: string,
  hostId: string
): BridgeInitRoute {
  if (!servesPath(pathname, hostId)) {
    return { pathname: hostRoot(hostId) }
  }
  const params = Object.fromEntries(new URLSearchParams(search))
  const withParams = BridgeInitRouteSchema.safeParse({ pathname, params })
  if (Object.keys(params).length > 0 && withParams.success) {
    return withParams.data
  }
  return BridgeInitRouteSchema.safeParse({ pathname }).success
    ? { pathname }
    : { pathname: hostRoot(hostId) }
}

/** The document to load for a `navigate` the page handed out: a served screen or a web copy, else the host's home. */
export function browserShellNavigationTarget(href: string, hostId: string): string {
  let url: URL
  try {
    url = new URL(href, 'http://browser-shell.invalid')
  } catch {
    return hostRoot(hostId)
  }
  if (servesPath(url.pathname, hostId)) {
    return `${url.pathname}${url.search}`
  }
  // The native home and settings screens have web copies the page cannot reach on its own.
  return browserAliasPath(url.pathname, hostId) ?? hostRoot(hostId)
}

export type BrowserShellNavigatorDeps = {
  hostId: string
  readCurrentPath: () => string
  assign: (href: string) => void
  replace: (href: string) => void
  historyLength: () => number
  back: () => void
}

/** The native stack's two jobs for a tab: open another document, and go back through history. */
export function createBrowserShellNavigator(deps: BrowserShellNavigatorDeps): {
  onNavigate: (href: string, replace: boolean) => void
  onNavigateBack: () => BridgeNavigateBackOutcome
} {
  return {
    onNavigate: (href, replace) => {
      const target = browserShellNavigationTarget(href, deps.hostId)
      // A screen that maps onto the document already shown would only reload it.
      if (target === deps.readCurrentPath()) {
        return
      }
      if (replace) {
        deps.replace(target)
      } else {
        deps.assign(target)
      }
    },
    onNavigateBack: () => {
      if (deps.historyLength() <= 1) {
        return 'nothing-to-pop'
      }
      deps.back()
      return 'popped'
    }
  }
}
