import { describe, expect, it } from 'vitest'
import { buildMobileWebAppManifest } from './mobile-web-app-manifest'

function manifestFor(requestUrl: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = JSON.parse(buildMobileWebAppManifest(requestUrl))
  return parsed
}

describe('mobile web app manifest', () => {
  it('starts the home-screen app with the pairing the tab asked to carry', () => {
    const manifest = manifestFor('/m-manifest.webmanifest?resume=eyJ2IjoxfQ_-x')
    expect(manifest.start_url).toBe('/m#resume=eyJ2IjoxfQ_-x')
    expect(manifest).toMatchObject({ name: 'Shark', short_name: 'Shark', display: 'standalone', scope: '/' })
    expect(manifest.icons).toEqual([{ src: '/m-icon.png', sizes: '180x180', type: 'image/png' }])
  })

  it('falls back to the plain page without a usable token', () => {
    expect(manifestFor('/m-manifest.webmanifest').start_url).toBe('/m')
    expect(manifestFor('/m-manifest.webmanifest?resume=').start_url).toBe('/m')
    expect(manifestFor(`/m-manifest.webmanifest?resume=${'a'.repeat(8193)}`).start_url).toBe('/m')
  })

  it('never lets the token leave the fragment or break the JSON', () => {
    for (const hostile of ['a"b', 'a#b', 'a/b', 'a&x=1', '../x', 'a%22b', 'a b']) {
      const url = `/m-manifest.webmanifest?resume=${encodeURIComponent(hostile)}`
      expect(manifestFor(url).start_url).toBe('/m')
    }
    expect(manifestFor('not a url at all %%').start_url).toBe('/m')
  })
})
