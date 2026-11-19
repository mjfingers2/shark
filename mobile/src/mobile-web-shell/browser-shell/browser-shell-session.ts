import type { HostStatusReply } from '../../transport/hosts/host-status-reply-schema'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { BridgeRpcClient } from '../bridge/client-state/bridge-rpc-client-contract'
import type { BridgeInitRoute } from '../bridge/protocol/bridge-init-route'
import type { BridgeNativeVerb } from '../bridge/native-capabilities/bridge-native-verbs'
import type { BridgeHost, BridgeNavigateBackOutcome } from '../host-bridge/bridge-host-contract'
import type { BrowserCredential, BrowserKeyValueStore } from './browser-credential-store'
import { createBrowserPageStorage, type BrowserPageStorage } from './browser-page-storage'
import { browserShellRouteView } from './browser-shell-routes'
import { browserShellStartRoute, createBrowserShellNavigator } from './browser-shell-navigation'
import { createBrowserShellConnection } from './browser-shell-connection'
import { createBrowserNativeVerbs } from './browser-native-verbs'
import {
  createDomNativeVerbDeps,
  onTabBackground,
  onTabForeground
} from './browser-dom-capabilities'
import type { BridgeUiLocale } from '../bridge/protocol/bridge-envelope'
import { UI_LANGUAGE_SYSTEM } from '../../../../src/shared/ui-language'
import { readBrowserDisplayPreferences } from './browser-display-preferences'
import { watchBrowserGeometry, type BrowserGeometrySnapshot } from './browser-shell-geometry'
import { createInPageBridge } from './in-page-bridge'

const BROWSER_SHELL_BUILD_ID = 'browser-shell'

export type BrowserShellBridgeArgs = {
  rpc: RpcClient
  credential: BrowserCredential
  route: BridgeInitRoute
  sessionId: string
  storage: (view: { ownsHostArea: boolean }) => BrowserPageStorage
  readHostStatus: () => HostStatusReply | null
  geometry: BrowserGeometrySnapshot
  serveNativeVerb: (verb: BridgeNativeVerb, params: unknown) => Promise<unknown>
  onNavigate: (href: string, replace: boolean) => void
  onNavigateBack: () => BridgeNavigateBackOutcome
  onExternalLink: (url: string) => void
  /** The language this tab chose in Settings; absent follows the device, as the page does. */
  uiLocale?: BridgeUiLocale
}

/**
 * The bridge for one document, built from plain inputs so a test can drive the handshake: the
 * route view and grants a manifest would give the native shell, this tab's storage, and its verbs.
 */
export function createBrowserShellBridge(args: BrowserShellBridgeArgs): {
  client: BridgeRpcClient
  host: BridgeHost
} {
  const { credential, route } = args
  const view = browserShellRouteView(route.pathname)
  const storage = args.storage({ ownsHostArea: view.ownsHostArea })
  return createInPageBridge({
    client: args.rpc,
    buildId: BROWSER_SHELL_BUILD_ID,
    sessionId: args.sessionId,
    route,
    pageRoutes: view.pageRoutes,
    pageRouteGrants: view.pageRouteGrants,
    routeGrants: view.routeGrants,
    ownsHostArea: view.ownsHostArea,
    readHostStatus: args.readHostStatus,
    sessionEstablished: false,
    host: {
      id: credential.hostId,
      name: credential.name,
      endpoint: credential.endpoint,
      lastConnected: 0
    },
    safeAreaInsets: args.geometry.safeAreaInsets,
    keyboardInset: args.geometry.keyboardInset,
    colorScheme: args.geometry.colorScheme,
    ...(args.uiLocale === undefined ? {} : { uiLocale: args.uiLocale }),
    // The device token is this tab's identity with the desktop, as it is the phone's.
    readClientIdentity: () => credential.deviceToken,
    readStorage: storage.readStorage,
    onStorageWrite: storage.writeStorage,
    onNavigate: args.onNavigate,
    serveNativeVerb: args.serveNativeVerb,
    onExternalLink: args.onExternalLink,
    // No haptic engine reachable from a web page on iOS; the grant stays so routes are served.
    onHaptic: () => {},
    onNavigateBack: args.onNavigateBack,
    onPageFault: (error) => {
      console.error('[browser-shell] the page faulted', error)
    },
    onPageReady: () => {},
    onPagePainted: () => {},
    // Browser Back goes through history, which the page's router already follows.
    onPageBackClaim: () => {},
    onPageLocation: () => {},
    onRouteParamClear: () => {},
    onRouteRefused: (issue) => {
      console.error('[browser-shell] refused to open this screen', issue)
    }
  })
}

function randomSessionId(win: Window): string {
  const bytes = win.crypto.getRandomValues(new Uint8Array(12))
  return `browser-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/** Connects the tab to its desktop and returns the page client, kept alive for the document's life. */
export function startBrowserShellSession(args: {
  win: Window
  store: BrowserKeyValueStore | null
  credential: BrowserCredential
  connect: (endpoint: string, deviceToken: string, publicKeyB64: string) => RpcClient
}): BridgeRpcClient {
  const { win, store, credential } = args
  const doc = win.document
  const connection = createBrowserShellConnection(credential, {
    connect: args.connect,
    onForeground: (listener) => onTabForeground(doc, listener)
  })
  const route = browserShellStartRoute(
    win.location.pathname,
    win.location.search,
    credential.hostId
  )
  let host: BridgeHost | null = null
  let pageStorage: BrowserPageStorage | null = null
  const display = readBrowserDisplayPreferences(store)
  const geometry = watchBrowserGeometry(
    win,
    () => host,
    () => readBrowserDisplayPreferences(store).appearance
  )
  const verbs = createBrowserNativeVerbs(
    createDomNativeVerbDeps({
      win,
      readClient: () => connection.client,
      readWorkspaceKey: (key) => pageStorage?.readWorkspaceKey(key) ?? Promise.resolve(null)
    })
  )
  const navigator = createBrowserShellNavigator({
    hostId: credential.hostId,
    readCurrentPath: () => `${win.location.pathname}${win.location.search}`,
    assign: (href) => win.location.assign(href),
    replace: (href) => win.location.replace(href),
    historyLength: () => win.history.length,
    back: () => win.history.back()
  })
  const bridge = createBrowserShellBridge({
    rpc: connection.client,
    credential,
    route,
    sessionId: randomSessionId(win),
    storage: ({ ownsHostArea }) => {
      pageStorage = createBrowserPageStorage({
        store,
        hostId: credential.hostId,
        routePathname: route.pathname,
        ownsHostArea
      })
      return pageStorage
    },
    readHostStatus: connection.readHostStatus,
    geometry: geometry.snapshot,
    ...(display.uiLanguage === UI_LANGUAGE_SYSTEM ? {} : { uiLocale: display.uiLanguage }),
    serveNativeVerb: verbs.serve,
    onNavigate: navigator.onNavigate,
    onNavigateBack: navigator.onNavigateBack,
    onExternalLink: (url) => {
      if (win.open(url, '_blank', 'noopener') === null) {
        console.warn('[browser-shell] the browser blocked opening a link', url)
      }
    }
  })
  host = bridge.host
  connection.onHostStatusChange(() => bridge.host.publishHostStatus())
  onTabBackground(doc, () => bridge.host.sendAppInactive())
  // A page kept in the back/forward cache comes back with this same shell; the client redials.
  win.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      return
    }
    bridge.host.dispose()
    geometry.dispose()
    verbs.dispose()
    connection.dispose()
  })
  return bridge.client
}
