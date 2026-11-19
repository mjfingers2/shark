import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import {
  InstalledMobileWebBundleManifestSchema,
  MOBILE_WEB_BUNDLE_ENTRYPOINT,
  mobileWebBundleBrotliPath
} from '../../../../../../shared/mobile-web-bundle/manifest-contract'
import type { StaticFileTarget } from '../static-file-response'
import { buildMobileWebAppHtml, MOBILE_WEB_APP_ICON_PATHNAME } from './mobile-web-app-html'

const MANIFEST_FILENAME = 'manifest.json'
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
/** The bundle lives at <app>/out/mobile-web; the icon ships beside it under <app>/resources. */
const ICON_PATH_FROM_ROOT = ['..', '..', 'resources', 'mobile-web-app', 'shark-home-screen-icon.png']

/** The phone UI served from the desktop listener as a browser app. */
export type MobileWebApp = {
  /** /m and phone deep links under /h/ all open the same page. */
  isPagePath(pathname: string): boolean
  /** The generated page, or null when the bundle's index.html is missing or unusable. */
  readPageHtml(): Promise<string | null>
  /** The icon or a manifest-listed bundle asset; null for anything else. */
  resolveFile(pathname: string): Promise<StaticFileTarget | null>
}

type BundleAsset = { contentType: string; hasBrotli: boolean }

export function createMobileWebApp(mobileWebRoot: string): MobileWebApp {
  const root = resolve(mobileWebRoot)
  const iconPath = resolve(root, ...ICON_PATH_FROM_ROOT)
  let pageHtml: Promise<string | null> | undefined
  let assets: Promise<ReadonlyMap<string, BundleAsset>> | undefined

  return {
    isPagePath: (pathname) =>
      pathname === '/m' || pathname === '/m/' || pathname.startsWith('/h/'),
    readPageHtml: async () => {
      // Built once: the bundle is immutable for the life of an install.
      pageHtml ??= readPageHtml(root)
      const html = await pageHtml
      if (html === null) {
        // A dev build may write the bundle later, so only a success is kept.
        pageHtml = undefined
      }
      return html
    },
    resolveFile: async (pathname) => {
      if (pathname === MOBILE_WEB_APP_ICON_PATHNAME) {
        return { absolutePath: iconPath, contentType: 'image/png', cacheControl: 'no-cache' }
      }
      if (!pathname.startsWith('/assets/')) {
        return null
      }
      assets ??= readBundleAssets(root)
      const listed = await assets
      if (listed.size === 0) {
        assets = undefined
      }
      const assetPath = pathname.slice(1)
      const asset = listed.get(assetPath)
      const absolutePath = asset ? resolveInside(root, assetPath) : null
      if (!asset || !absolutePath) {
        return null
      }
      return {
        absolutePath,
        contentType: asset.contentType,
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        ...(asset.hasBrotli ? { brotliPath: mobileWebBundleBrotliPath(absolutePath) } : {})
      }
    }
  }
}

async function readPageHtml(root: string): Promise<string | null> {
  try {
    return buildMobileWebAppHtml(await readFile(join(root, MOBILE_WEB_BUNDLE_ENTRYPOINT), 'utf8'))
  } catch {
    return null
  }
}

/** Only files the manifest lists are served, so nothing else under the bundle root leaks. */
async function readBundleAssets(root: string): Promise<ReadonlyMap<string, BundleAsset>> {
  const listed = new Map<string, BundleAsset>()
  try {
    const parsed = InstalledMobileWebBundleManifestSchema.safeParse(
      JSON.parse(await readFile(join(root, MANIFEST_FILENAME), 'utf8'))
    )
    if (!parsed.success) {
      console.warn('[ws-transport] mobile web app disabled: invalid bundle manifest')
      return listed
    }
    for (const asset of parsed.data.assets) {
      if (asset.path.startsWith('assets/')) {
        listed.set(asset.path, {
          contentType: asset.contentType,
          hasBrotli: asset.brotliByteLength !== undefined
        })
      }
    }
  } catch (error) {
    console.warn(`[ws-transport] mobile web app disabled: ${String(error)}`)
  }
  return listed
}

function resolveInside(root: string, relativePath: string): string | null {
  const absolutePath = resolve(root, relativePath)
  const fromRoot = relative(root, absolutePath)
  return fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot) ? null : absolutePath
}
