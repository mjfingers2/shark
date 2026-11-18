import { describe, expect, it } from 'vitest'
import type { BrowserAnnotationPayload } from '../../../../src/shared/browser/element-grab/browser-grab-types'
import { pickedElementLabel } from './picked-element-label'

function payload(target: {
  tagName: string
  selector: string
  textSnippet: string
  accessibleName?: string | null
}): BrowserAnnotationPayload {
  return {
    page: {
      sanitizedUrl: 'http://localhost:3000/',
      title: '',
      viewportWidth: 0,
      viewportHeight: 0,
      scrollX: 0,
      scrollY: 0,
      devicePixelRatio: 1,
      capturedAt: ''
    },
    target: {
      tagName: target.tagName,
      selector: target.selector,
      textSnippet: target.textSnippet,
      htmlSnippet: '',
      attributes: {},
      accessibility: {
        role: null,
        accessibleName: target.accessibleName ?? null,
        ariaLabel: null,
        ariaLabelledBy: null
      },
      rectViewport: { x: 0, y: 0, width: 0, height: 0 },
      rectPage: { x: 0, y: 0, width: 0, height: 0 },
      computedStyles: {
        display: '',
        position: '',
        width: '',
        height: '',
        margin: '',
        padding: '',
        color: '',
        backgroundColor: '',
        border: '',
        borderRadius: '',
        fontFamily: '',
        fontSize: '',
        fontWeight: '',
        lineHeight: '',
        textAlign: '',
        zIndex: ''
      }
    },
    nearbyText: [],
    ancestorPath: [],
    screenshot: null
  }
}

describe('pickedElementLabel', () => {
  it('names the tag, its accessible name and its selector', () => {
    expect(
      pickedElementLabel(
        payload({ tagName: 'BUTTON', selector: '#save', textSnippet: 'x', accessibleName: 'Save' })
      )
    ).toBe('<button> "Save" · #save')
  })

  it('shortens long text and leaves out what the element lacks', () => {
    const label = pickedElementLabel(
      payload({ tagName: 'p', selector: '', textSnippet: `${'word '.repeat(20)}end` })
    )
    expect(label.startsWith('<p> "word word')).toBe(true)
    expect(label.endsWith('…"')).toBe(true)
    expect(label).not.toContain('·')
  })

  it('falls back to a bare tag for an element with no text', () => {
    expect(pickedElementLabel(payload({ tagName: 'div', selector: '', textSnippet: '' }))).toBe(
      '<div>'
    )
  })
})
