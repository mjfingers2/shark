import { Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { buildElementAtPointScript, readElementAtPointResult } from './browser-element-at-point'

function rawPayload(): Record<string, unknown> {
  return {
    page: { sanitizedUrl: 'http://localhost:3000/a?token=secret', title: 'A', capturedAt: 'now' },
    target: {
      tagName: 'button',
      selector: '#save',
      textSnippet: 'Save',
      htmlSnippet: '<button id="save">Save</button>',
      accessibility: {},
      computedStyles: {}
    },
    nearbyText: [],
    ancestorPath: [],
    screenshot: { mimeType: 'image/png', dataUrl: 'data:image/png;base64,AA', width: 1, height: 1 }
  }
}

describe('buildElementAtPointScript', () => {
  it('builds a script that parses, with the point written as plain numbers', () => {
    const script = buildElementAtPointScript(12.5, 40)
    expect(() => new Script(script)).not.toThrow()
    expect(script).toContain('var x = 12.5;')
    expect(script).toContain('var y = 40;')
  })

  it('writes zero for a coordinate that is not a finite number', () => {
    const script = buildElementAtPointScript(Number.NaN, Number.POSITIVE_INFINITY)
    expect(script).toContain('var x = 0;')
    expect(script).toContain('var y = 0;')
  })
})

describe('readElementAtPointResult', () => {
  it('returns the cleaned element without its screenshot or url query', () => {
    const result = readElementAtPointResult(rawPayload())
    expect(result.kind).toBe('element')
    if (result.kind !== 'element') {
      return
    }
    expect(result.payload.screenshot).toBeNull()
    expect(result.payload.page.sanitizedUrl).toBe('http://localhost:3000/a')
    expect(result.payload.target.selector).toBe('#save')
  })

  it('reports a desktop grab that owns the page, and nothing for an empty answer', () => {
    expect(readElementAtPointResult({ __orcaGrabActive: true })).toEqual({
      kind: 'none',
      reason: 'grab-active'
    })
    expect(readElementAtPointResult(null)).toEqual({ kind: 'none', reason: 'no-element' })
    expect(readElementAtPointResult('<html>')).toEqual({ kind: 'none', reason: 'no-element' })
  })
})
