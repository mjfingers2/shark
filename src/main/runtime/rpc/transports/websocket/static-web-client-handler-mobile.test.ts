import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request as httpRequest, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliCompressSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computeMobileWebBundleId,
  type MobileWebBundleAsset
} from '../../../../../shared/mobile-web-bundle/manifest-contract'
import {
  createStaticWebClientHandler,
  type StaticWebClientHandlerOptions
} from './static-web-client-handler'

const SCRIPT_NAME = `${'a'.repeat(64)}.js`
const SCRIPT_BODY = 'console.log("phone")'
const BROTLI_NAME = `${'b'.repeat(64)}.css`
const BROTLI_BODY = 'body{color:red}'.repeat(40)
const INDEX_HTML = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8" />',
  '<title>Orca</title>',
  '</head>',
  '<body><div id="root"></div>',
  `<script type="module" src="/assets/${SCRIPT_NAME}"></script>`,
  '</body>',
  '</html>'
].join('\n')
const ICON_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])

let appRoot: string
let desktopRoot: string
let mobileRoot: string
let server: Server | null = null

function asset(path: string, body: string, contentType: string): MobileWebBundleAsset {
  return { path, sha256: 'c'.repeat(64), byteLength: Buffer.byteLength(body), contentType }
}

function writeMobileBundle(): void {
  mkdirSync(join(mobileRoot, 'assets'), { recursive: true })
  writeFileSync(join(mobileRoot, 'index.html'), INDEX_HTML)
  writeFileSync(join(mobileRoot, 'assets', SCRIPT_NAME), SCRIPT_BODY)
  writeFileSync(join(mobileRoot, 'assets', BROTLI_NAME), BROTLI_BODY)
  writeFileSync(
    join(mobileRoot, 'assets', `${BROTLI_NAME}.br`),
    brotliCompressSync(Buffer.from(BROTLI_BODY))
  )
  // Present on disk but absent from the manifest, so it must never be served.
  writeFileSync(join(mobileRoot, 'assets', `${'d'.repeat(64)}.js`), 'unlisted')
  const assets = [
    asset(`assets/${SCRIPT_NAME}`, SCRIPT_BODY, 'text/javascript; charset=utf-8'),
    {
      ...asset(`assets/${BROTLI_NAME}`, BROTLI_BODY, 'text/css; charset=utf-8'),
      brotliByteLength: 1
    },
    asset('index.html', INDEX_HTML, 'text/html; charset=utf-8')
  ].sort((left, right) => (left.path < right.path ? -1 : 1))
  const manifest = {
    schemaVersion: 1,
    buildId: computeMobileWebBundleId(assets),
    desktopVersion: '1.0.0',
    minCompatibleRuntimeProtocolVersion: 1,
    runtimeProtocolVersion: 1,
    entrypoint: 'index.html',
    totalBytes: assets.reduce((sum, entry) => sum + entry.byteLength, 0),
    assets,
    routes: []
  }
  writeFileSync(join(mobileRoot, 'manifest.json'), JSON.stringify(manifest))
}

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), 'orca-static-web-mobile-'))
  desktopRoot = join(appRoot, 'out', 'web')
  mobileRoot = join(appRoot, 'out', 'mobile-web')
  mkdirSync(join(desktopRoot, 'assets'), { recursive: true })
  writeFileSync(join(desktopRoot, 'web-index.html'), '<html>desktop</html>')
  writeFileSync(join(desktopRoot, 'assets', 'desktop.js'), 'desktop')
  writeMobileBundle()
  mkdirSync(join(appRoot, 'resources', 'mobile-web-app'), { recursive: true })
  writeFileSync(
    join(appRoot, 'resources', 'mobile-web-app', 'shark-home-screen-icon.png'),
    ICON_BYTES
  )
})

afterEach(async () => {
  if (server) {
    server.close()
    server.closeAllConnections()
    await once(server, 'close')
    server = null
  }
  rmSync(appRoot, { recursive: true, force: true })
})

async function serve(
  staticRoot: string | undefined,
  options?: StaticWebClientHandlerOptions
): Promise<number> {
  server = createServer(createStaticWebClientHandler(staticRoot, options))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing listener port')
  }
  return address.port
}

type Reply = { status: number; headers: Record<string, unknown>; body: Buffer }

// Raw http.request keeps the path byte-for-byte; fetch would normalize traversal segments away.
function get(port: number, path: string, headers: Record<string, string> = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) })
      )
    })
    req.on('error', reject)
    req.end()
  })
}

describe('static web client handler: phone web app', () => {
  it('serves /m as the phone page dressed for the home screen', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const reply = await get(port, '/m')
    const html = reply.body.toString('utf8')

    expect(reply.status).toBe(200)
    expect(reply.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(html).toContain('<title>Shark</title>')
    expect(html).not.toContain('<title>Orca</title>')
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />')
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Shark" />')
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
    )
    expect(html).toContain('<meta name="theme-color" content="#0a1324" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/m-icon.png" />')
    expect(html).toContain(`src="/assets/${SCRIPT_NAME}"`)
  })

  it('serves the same page for /m/ and phone deep links under /h/', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const page = (await get(port, '/m')).body.toString('utf8')

    for (const path of ['/m/', '/h/host-1/session/abc', '/h/x/y?tab=2']) {
      const reply = await get(port, path)
      expect(reply.status, path).toBe(200)
      expect(reply.body.toString('utf8'), path).toBe(page)
    }
  })

  it('serves the home-screen icon', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const reply = await get(port, '/m-icon.png')

    expect(reply.status).toBe(200)
    expect(reply.headers['content-type']).toBe('image/png')
    expect(reply.body.equals(ICON_BYTES)).toBe(true)
  })

  it('serves the home-screen manifest starting at the pairing the page asked for', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const reply = await get(port, '/m-manifest.webmanifest?resume=abc_-123')

    expect(reply.status).toBe(200)
    expect(reply.headers['content-type']).toBe('application/manifest+json; charset=utf-8')
    expect(JSON.parse(reply.body.toString('utf8'))).toMatchObject({
      start_url: '/m#resume=abc_-123',
      display: 'standalone'
    })
  })

  it('serves manifest-listed phone assets with their content type', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const reply = await get(port, `/assets/${SCRIPT_NAME}`)

    expect(reply.status).toBe(200)
    expect(reply.headers['content-type']).toBe('text/javascript; charset=utf-8')
    expect(reply.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(reply.body.toString('utf8')).toBe(SCRIPT_BODY)
  })

  it('sends the brotli copy only to clients that accept it', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })
    const compressed = await get(port, `/assets/${BROTLI_NAME}`, {
      'accept-encoding': 'gzip, br'
    })
    const plain = await get(port, `/assets/${BROTLI_NAME}`, { 'accept-encoding': 'gzip' })

    expect(compressed.status).toBe(200)
    expect(compressed.headers['content-encoding']).toBe('br')
    expect(compressed.headers.vary).toBe('Accept-Encoding')
    expect(compressed.body.toString('utf8')).not.toBe(BROTLI_BODY)
    expect(plain.headers['content-encoding']).toBeUndefined()
    expect(plain.body.toString('utf8')).toBe(BROTLI_BODY)
  })

  it('refuses hashes the manifest does not list, and the bundle index itself', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })

    expect((await get(port, `/assets/${'d'.repeat(64)}.js`)).status).toBe(404)
    expect((await get(port, `/assets/${'e'.repeat(64)}.js`)).status).toBe(404)
    expect((await get(port, '/manifest.json')).status).toBe(404)
    expect((await get(port, '/index.html')).body.toString('utf8')).toBe('<html>desktop</html>')
  })

  it('refuses traversal, plain or percent-encoded', async () => {
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })

    // Encoded separators survive URL parsing and are refused outright.
    for (const path of [
      '/assets/..%2f..%2fresources%2fmobile-web-app%2fshark-home-screen-icon.png',
      `/assets/..%2fassets%2f${SCRIPT_NAME}`,
      '/assets/%5c..%5cmanifest.json'
    ]) {
      expect((await get(port, path)).status, path).toBe(400)
    }
    // Dot segments, even encoded ones, collapse during URL parsing and land outside every allowlist.
    for (const path of [
      '/assets/../manifest.json',
      '/assets/%2e%2e/manifest.json',
      '/h/%2e%2e/%2e%2e/out/mobile-web/manifest.json'
    ]) {
      expect((await get(port, path)).status, path).toBe(404)
    }
  })

  it('keeps desktop files first', async () => {
    writeFileSync(join(desktopRoot, 'assets', SCRIPT_NAME), 'desktop wins')
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })

    expect((await get(port, `/assets/${SCRIPT_NAME}`)).body.toString('utf8')).toBe('desktop wins')
    expect((await get(port, '/assets/desktop.js')).body.toString('utf8')).toBe('desktop')
    expect((await get(port, '/')).body.toString('utf8')).toBe('<html>desktop</html>')
  })

  it('serves the phone app when no desktop web client is installed', async () => {
    const port = await serve(undefined, { mobileWebRoot: mobileRoot })

    expect((await get(port, '/m')).status).toBe(200)
    expect((await get(port, `/assets/${SCRIPT_NAME}`)).status).toBe(200)
    expect((await get(port, '/')).status).toBe(404)
  })

  it('answers 404 for phone routes without a mobile web root, as before', async () => {
    const port = await serve(desktopRoot)

    for (const path of ['/m', '/m/', '/h/x/y', '/m-icon.png', `/assets/${SCRIPT_NAME}`]) {
      expect((await get(port, path)).status, path).toBe(404)
    }
    expect((await get(port, '/assets/desktop.js')).status).toBe(200)
  })

  it('answers 404 for /m when the bundle has no index.html', async () => {
    rmSync(join(mobileRoot, 'index.html'))
    const port = await serve(desktopRoot, { mobileWebRoot: mobileRoot })

    expect((await get(port, '/m')).status).toBe(404)
  })
})
