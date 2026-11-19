import { describe, expect, it } from 'vitest'
import { MOBILE_WEB_SHELL_GRANTS } from '../routing/page-route-policy'
import {
  BROWSER_ONLY_PAGE_ROUTES,
  BROWSER_SHELL_GRANTS,
  BROWSER_SHELL_PAGE_ROUTES,
  browserShellRouteView
} from './browser-shell-routes'

// Read through a variable path: the build module is plain JS outside this TypeScript project.
const BUILD_ROUTES_MODULE = new URL(
  '../../../../config/scripts/build/mobile-web-app/mobile-web-page-routes.mjs',
  import.meta.url
).href
const ROUTE_MANIFEST_MODULE = new URL(
  '../../../../config/scripts/mobile-web-app/mobile-web-app-route-manifest.mjs',
  import.meta.url
).href
const APP_DIR = new URL('../../../app', import.meta.url).pathname

async function bundledRoutePathnames(): Promise<string[]> {
  const manifest: {
    collectMobileWebAppRouteKeys: (appDir: string) => Promise<string[]>
    routePathnameFromKey: (key: string) => string | null
  } = await import(ROUTE_MANIFEST_MODULE)
  const keys = await manifest.collectMobileWebAppRouteKeys(APP_DIR)
  return keys.flatMap((key) => manifest.routePathnameFromKey(key) ?? [])
}

describe('browser shell routes', () => {
  it('declares exactly the routes the page bundle is built with, plus the browser-only ones', async () => {
    const built: { MOBILE_WEB_PAGE_ROUTES: unknown } = await import(BUILD_ROUTES_MODULE)
    const shared = BROWSER_SHELL_PAGE_ROUTES.filter(
      (route) => !BROWSER_ONLY_PAGE_ROUTES.includes(route)
    )
    expect(JSON.parse(JSON.stringify(shared))).toEqual(built.MOBILE_WEB_PAGE_ROUTES)
  })

  it('keeps the browser-only screens away from the native shell but inside the page bundle', async () => {
    const built: { MOBILE_WEB_PAGE_ROUTES: { pathname: string }[] } = await import(
      BUILD_ROUTES_MODULE
    )
    const nativePaths = built.MOBILE_WEB_PAGE_ROUTES.map((route) => route.pathname)
    const bundled = await bundledRoutePathnames()
    expect(BROWSER_ONLY_PAGE_ROUTES.map((route) => route.pathname)).toEqual([
      '/h/[hostId]/home',
      '/h/[hostId]/settings',
      '/h/[hostId]/settings/[section]'
    ])
    for (const route of BROWSER_ONLY_PAGE_ROUTES) {
      expect(nativePaths, route.pathname).not.toContain(route.pathname)
      expect(bundled, route.pathname).toContain(route.pathname)
    }
  })

  it('grants every required grant of every route, so no route reads as unavailable', () => {
    for (const route of BROWSER_SHELL_PAGE_ROUTES) {
      for (const grant of route.grants) {
        expect(BROWSER_SHELL_GRANTS, `${route.pathname} needs ${grant}`).toContain(grant)
      }
    }
    expect(
      BROWSER_SHELL_GRANTS.every((grant) => MOBILE_WEB_SHELL_GRANTS.some((g) => g === grant))
    ).toBe(true)
  })

  it('owns the host area at the host root with the union of served grants', () => {
    const view = browserShellRouteView('/h/host-a')
    expect(view.ownsHostArea).toBe(true)
    expect(view.pageRoutes).toContain('/h/[hostId]/session/[worktreeId]')
    expect(view.routeGrants).toEqual(
      expect.arrayContaining(['native.audio.start', 'native.storage.read', 'native.pdf.view'])
    )
    expect(view.routeGrants).not.toContain('terminalKeyRail')
    expect(view.routeGrants).not.toContain('native.store.rows')
  })

  it('serves nothing for a path that is not a page route', () => {
    const view = browserShellRouteView('/h/host-a/edit')
    expect(view.ownsHostArea).toBe(false)
    expect(view.routeGrants).toEqual([])
  })

  it('serves the browser-only home and settings screens with the base grants', () => {
    for (const path of ['/h/host-a/home', '/h/host-a/settings', '/h/host-a/settings/about']) {
      const view = browserShellRouteView(path)
      expect(view.ownsHostArea, path).toBe(false)
      expect(view.routeGrants, path).toEqual(['navigate', 'storage', 'externalLink', 'haptics'])
    }
    expect(browserShellRouteView('/h/host-a').pageRoutes).toContain(
      '/h/[hostId]/settings/[section]'
    )
  })
})
