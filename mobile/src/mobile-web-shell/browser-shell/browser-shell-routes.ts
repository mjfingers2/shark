import {
  MOBILE_WEB_SHELL_GRANTS,
  routeViewOf,
  type MobileWebPageRoute
} from '../routing/page-route-policy'

// The browser shell has no manifest download: the desktop that served this document built it from
// the same declarations, so mirror config/scripts/build/mobile-web-app/mobile-web-page-routes.mjs.
// browser-shell-routes.test.ts fails when the two lists drift apart.
const DEVICE_STORE_GRANT = 'native.store.rows'
const BASE_GRANTS = ['navigate', 'storage', 'externalLink', 'haptics']
const PREVIEW_OPTIONAL_GRANTS = [
  'externalNavigation',
  'native.pdf.view',
  'native.image.act',
  DEVICE_STORE_GRANT
]

const SHARED_PAGE_ROUTES: readonly MobileWebPageRoute[] = [
  {
    pathname: '/h/[hostId]',
    grants: BASE_GRANTS,
    optionalGrants: [DEVICE_STORE_GRANT],
    canOwnHostArea: true,
    canOwnHostAreaAcrossLayouts: true
  },
  {
    pathname: '/h/[hostId]/agent-history/[worktreeId]',
    grants: BASE_GRANTS,
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/tasks',
    grants: [...BASE_GRANTS, 'native.clipboard.write'],
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/automations',
    grants: BASE_GRANTS,
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/accounts',
    grants: BASE_GRANTS,
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/new-workspace',
    grants: BASE_GRANTS,
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/files/[worktreeId]',
    grants: [...BASE_GRANTS, 'native.clipboard.write'],
    optionalGrants: PREVIEW_OPTIONAL_GRANTS
  },
  {
    pathname: '/h/[hostId]/files/preview/[worktreeId]',
    grants: [...BASE_GRANTS, 'native.clipboard.write'],
    optionalGrants: PREVIEW_OPTIONAL_GRANTS
  },
  {
    pathname: '/h/[hostId]/source-control/[worktreeId]',
    grants: [...BASE_GRANTS, 'native.clipboard.write'],
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/review/[worktreeId]',
    grants: [...BASE_GRANTS, 'native.clipboard.write'],
    optionalGrants: [DEVICE_STORE_GRANT]
  },
  {
    pathname: '/h/[hostId]/session/[worktreeId]',
    grants: [
      ...BASE_GRANTS,
      'screencastBinary',
      'native.clipboard.write',
      'native.clipboard.read',
      'native.media.pick',
      'native.media.read',
      'native.media.release',
      'native.audio.start',
      'native.audio.read',
      'native.audio.stop'
    ],
    optionalGrants: [
      'externalNavigation',
      'native.media.name',
      'native.pdf.view',
      'native.image.act',
      'native.speech.act',
      'native.a11y.announce',
      'terminalKeyRail',
      DEVICE_STORE_GRANT
    ]
  }
]

// Why: a plain browser tab has no native home or settings, so it serves web copies of them inside
// the host's route tree. They stay out of the bundle's declared routes, so the native shell never
// opens them as pages and keeps its own screens.
export const BROWSER_ONLY_PAGE_ROUTES: readonly MobileWebPageRoute[] = [
  '/h/[hostId]/home',
  '/h/[hostId]/settings',
  '/h/[hostId]/settings/[section]'
].map((pathname) => ({ pathname, grants: BASE_GRANTS }))

export const BROWSER_SHELL_PAGE_ROUTES: readonly MobileWebPageRoute[] = [
  ...SHARED_PAGE_ROUTES,
  ...BROWSER_ONLY_PAGE_ROUTES
]

// Optional capabilities a browser tab cannot honour; withholding them hides the affordance rather
// than letting the page offer something that fails. Required grants all stay, or the route would
// show "route unavailable".
const WITHHELD_IN_BROWSER: readonly string[] = [
  // No side rail beside a browser tab; the page draws its own key row.
  'terminalKeyRail',
  // No on-device recognizer; dictation goes to the computer.
  'native.speech.act',
  // The page's own live region speaks to VoiceOver in Safari.
  'native.a11y.announce',
  // Copy/save/share of images needs Photos and the share sheet.
  'native.image.act',
  // Without the device store the page keeps its cache in memory, as on older shells.
  DEVICE_STORE_GRANT
]

export const BROWSER_SHELL_GRANTS: readonly string[] = MOBILE_WEB_SHELL_GRANTS.filter(
  (grant) => !WITHHELD_IN_BROWSER.includes(grant)
)

export type BrowserShellRouteView = {
  pageRoutes: string[]
  pageRouteGrants: { pathname: string; grants: string[] }[]
  routeGrants: string[]
  ownsHostArea: boolean
}

const isServed = (grant: string): boolean => BROWSER_SHELL_GRANTS.includes(grant)

/** The same session facts the native shell derives from a manifest, narrowed to what a tab serves. */
export function browserShellRouteView(pathname: string): BrowserShellRouteView {
  const view = routeViewOf(BROWSER_SHELL_PAGE_ROUTES, pathname, false)
  return {
    pageRoutes: view.pageRoutes,
    pageRouteGrants: view.pageRouteGrants.map((pair) => ({
      pathname: pair.pathname,
      grants: pair.grants.filter(isServed)
    })),
    routeGrants: view.routeGrants.filter(isServed),
    ownsHostArea: view.ownsHostArea
  }
}
