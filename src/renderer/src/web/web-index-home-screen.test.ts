import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Why: on an iPad, "Add to Home Screen" reads these tags to turn the browser link into a Shark app icon.
const webIndexHtml = readFileSync(
  fileURLToPath(new URL('../../web-index.html', import.meta.url)),
  'utf8'
)

function readMetaContent(name: string): string | null {
  const match = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`).exec(webIndexHtml)
  return match ? match[1]! : null
}

describe('web client home screen app', () => {
  it('opens full screen under the Shark name', () => {
    expect(readMetaContent('apple-mobile-web-app-capable')).toBe('yes')
    expect(readMetaContent('mobile-web-app-capable')).toBe('yes')
    expect(readMetaContent('apple-mobile-web-app-title')).toBe('Shark')
    expect(webIndexHtml).toMatch(/<title>Shark<\/title>/)
  })

  it('uses the Shark icon on a navy status bar', () => {
    expect(webIndexHtml).toMatch(
      /<link\s+rel="apple-touch-icon"\s+href="\/src\/assets\/shark-home-screen-icon\.png"/
    )
    expect(readMetaContent('theme-color')).toBe('#0a1324')
  })

  it('has no manifest start_url that would drop the pairing link', () => {
    // A manifest start_url would replace the saved address and lose the #pairing fragment.
    expect(webIndexHtml).not.toMatch(/rel="manifest"/)
  })
})
