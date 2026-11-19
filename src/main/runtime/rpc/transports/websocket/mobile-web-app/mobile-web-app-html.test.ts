import { describe, expect, it } from 'vitest'
import { buildMobileWebAppHtml } from './mobile-web-app-html'

describe('buildMobileWebAppHtml', () => {
  it('renames the page and adds the home-screen tags inside <head>', () => {
    const html = buildMobileWebAppHtml(
      '<html><head><title>Orca</title></head><body><script src="/assets/x.js"></script></body></html>'
    )

    expect(html).not.toBeNull()
    const head = html?.slice(0, html.indexOf('</head>')) ?? ''
    expect(head).toContain('<title>Shark</title>')
    expect(head).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(head).toContain('<link rel="apple-touch-icon" href="/m-icon.png" />')
    expect(html).not.toContain('Orca')
    expect(html).toContain('<script src="/assets/x.js"></script>')
  })

  it('adds a title when the page has none', () => {
    const html = buildMobileWebAppHtml('<html><head></head><body></body></html>')

    expect(html?.match(/<title>Shark<\/title>/g)).toHaveLength(1)
  })

  it('returns null for markup without a head', () => {
    expect(buildMobileWebAppHtml('not html')).toBeNull()
  })
})
