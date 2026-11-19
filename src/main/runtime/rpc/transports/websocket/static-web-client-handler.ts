import { stat } from 'node:fs/promises'
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http'
import { basename, extname, isAbsolute, posix, relative, resolve } from 'node:path'
import { readBundledWebClientFiles } from '../../../../../shared/bundled-web-client-manifest'
import { createMobileWebApp, type MobileWebApp } from './mobile-web-app/mobile-web-app-files'
import {
  buildMobileWebAppManifest,
  MOBILE_WEB_APP_MANIFEST_PATHNAME
} from './mobile-web-app/mobile-web-app-manifest'
import {
  sendStaticBody,
  sendStaticFile,
  writeHttpStatus,
  type StaticFileTarget
} from './static-file-response'

const STATIC_WEB_ALLOWED_PATHS = new Set(['/web-index.html'])
const STATIC_WEB_ALLOWED_PREFIXES = ['/assets/', '/cmaps/', '/standard_fonts/', '/wasm/']
const STATIC_WEB_CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2']
])

/** A server without a web client still answers plain HTTP, so callers fail fast instead of hanging. */
export const answerWithoutWebClient: RequestListener = (_request, response) => {
  writeHttpStatus(response, 404)
}

type DesktopWebClient = { root: string; files: ReadonlySet<string> | undefined }

export type StaticWebClientHandlerOptions = {
  /** The built phone bundle (out/mobile-web), served as a home-screen web app at /m. */
  mobileWebRoot?: string
}

export function createStaticWebClientHandler(
  staticRoot: string | undefined,
  options: StaticWebClientHandlerOptions = {}
): RequestListener {
  const desktop = staticRoot ? readDesktopWebClient(staticRoot) : null
  const mobile = options.mobileWebRoot ? createMobileWebApp(options.mobileWebRoot) : null
  if (!desktop && !mobile) {
    return answerWithoutWebClient
  }
  return (request, response) => {
    void handleStaticRequest(desktop, mobile, request, response)
  }
}

function readDesktopWebClient(staticRoot: string): DesktopWebClient | null {
  const root = resolve(staticRoot)
  let files: ReadonlySet<string> | undefined
  try {
    files = readBundledWebClientFiles(root)
  } catch (error) {
    // Damaged web installs must not disable the runtime server.
    console.warn(`[ws-transport] browser client disabled: ${String(error)}`)
    return null
  }
  if (basename(root) === 'renderer' && !files) {
    return null
  }
  return { root, files }
}

async function handleStaticRequest(
  desktop: DesktopWebClient | null,
  mobile: MobileWebApp | null,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  if (response.destroyed) {
    return
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    writeHttpStatus(response, 405)
    return
  }

  const requestPath = parseRequestPathname(request.url)
  if (!requestPath) {
    writeHttpStatus(response, 400)
    return
  }
  if (mobile?.isPagePath(requestPath)) {
    const html = await mobile.readPageHtml()
    if (html === null) {
      writeHttpStatus(response, 404)
      return
    }
    sendStaticBody(request, response, html, 'text/html; charset=utf-8')
    return
  }
  if (mobile && requestPath === MOBILE_WEB_APP_MANIFEST_PATHNAME) {
    const manifest = buildMobileWebAppManifest(request.url ?? requestPath)
    sendStaticBody(request, response, manifest, 'application/manifest+json; charset=utf-8')
    return
  }

  const pathname = mapStaticPathname(requestPath)
  // Desktop files keep priority; the phone bundle fills in only what the desktop client lacks.
  const target =
    (desktop ? await resolveDesktopFile(desktop, pathname) : null) ??
    (mobile ? await mobile.resolveFile(pathname) : null)
  if (!target) {
    writeHttpStatus(response, 404)
    return
  }
  await sendStaticFile(request, response, target)
}

async function resolveDesktopFile(
  desktop: DesktopWebClient,
  pathname: string
): Promise<StaticFileTarget | null> {
  if (!isAllowedStaticWebPath(pathname) || (desktop.files && !desktop.files.has(pathname.slice(1)))) {
    return null
  }
  const absolutePath = resolve(desktop.root, pathname.slice(1))
  const relativePath = relative(desktop.root, absolutePath)
  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return null
  }
  if (!desktop.files && !(await isRegularFile(absolutePath))) {
    // Without a manifest, only files that exist count, so a missing name can fall through to the phone bundle.
    return null
  }
  return {
    absolutePath,
    contentType: STATIC_WEB_CONTENT_TYPES.get(extname(absolutePath)) ?? 'application/octet-stream',
    cacheControl: pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  }
}

async function isRegularFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/** Decoded request path, or null when it is malformed or tries to leave the served roots. */
function parseRequestPathname(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return '/web-index.html'
  }
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1').pathname)
  } catch {
    return null
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
    return null
  }
  if (posix.normalize(pathname) !== pathname) {
    return null
  }
  return pathname
}

function mapStaticPathname(pathname: string): string {
  if (pathname === '/' || pathname === '/index.html') {
    return '/web-index.html'
  }
  return mapProxyPrefixedStaticPathname(pathname)
}

function mapProxyPrefixedStaticPathname(pathname: string): string {
  if (pathname === '/web-index.html' || pathname.endsWith('/web-index.html')) {
    return '/web-index.html'
  }
  const prefixIndex = STATIC_WEB_ALLOWED_PREFIXES.reduce(
    (deepest, prefix) => Math.max(deepest, pathname.indexOf(prefix)),
    -1
  )
  if (prefixIndex !== -1) {
    // Proxies may forward an external prefix; serve only the bundled assets subtree after it.
    return pathname.slice(prefixIndex)
  }
  return pathname
}

function isAllowedStaticWebPath(pathname: string): boolean {
  return (
    STATIC_WEB_ALLOWED_PATHS.has(pathname) ||
    STATIC_WEB_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}
