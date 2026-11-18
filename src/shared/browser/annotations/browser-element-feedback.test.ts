import { describe, expect, it } from 'vitest'
import {
  formatBrowserElementFeedbackForAgent,
  isBrowserAnnotationPayloadShape
} from './browser-element-feedback'
import type { BrowserAnnotationPayload } from '../element-grab/browser-grab-types'

function payload(): BrowserAnnotationPayload {
  return {
    page: {
      sanitizedUrl: 'http://localhost:5173/login',
      title: 'Login',
      viewportWidth: 390,
      viewportHeight: 844,
      scrollX: 0,
      scrollY: 0,
      devicePixelRatio: 3,
      capturedAt: '2026-11-19T00:00:00.000Z'
    },
    target: {
      tagName: 'button',
      selector: 'form > button.submit',
      textSnippet: 'Sign in',
      htmlSnippet: '<button class="submit">Sign in</button>',
      attributes: {},
      accessibility: {
        role: 'button',
        accessibleName: null,
        ariaLabel: null,
        ariaLabelledBy: null
      },
      rectViewport: { x: 0, y: 0, width: 10, height: 10 },
      rectPage: { x: 0, y: 0, width: 10, height: 10 },
      computedStyles: {
        display: 'block',
        position: 'static',
        width: '10px',
        height: '10px',
        margin: '0px',
        padding: '0px',
        color: 'red',
        backgroundColor: 'white',
        border: 'none',
        borderRadius: '0px',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: 'normal',
        textAlign: 'left',
        zIndex: 'auto'
      }
    },
    nearbyText: [],
    ancestorPath: [],
    screenshot: null
  }
}

describe('formatBrowserElementFeedbackForAgent', () => {
  it('writes the desktop annotation shape with the element markup and the comment', () => {
    const text = formatBrowserElementFeedbackForAgent({
      browserPageId: 'page-1',
      payload: payload(),
      comment: 'Make this button larger',
      createdAt: '2026-11-19T00:00:00.000Z'
    })
    expect(text).toContain('## Design Feedback: /login')
    expect(text).toContain('**URL:** http://localhost:5173/login')
    expect(text).toContain('**Selector:** `form > button.submit`')
    expect(text).toContain('**Text:** "Sign in"')
    expect(text).toContain('<button class="submit">Sign in</button>')
    expect(text).toContain('**Feedback:** Make this button larger')
    expect(text).not.toContain('**Computed styles:**')
  })
})

describe('isBrowserAnnotationPayloadShape', () => {
  it('accepts a full payload and rejects one missing its selector', () => {
    expect(isBrowserAnnotationPayloadShape(payload())).toBe(true)
    const { selector: _selector, ...targetWithoutSelector } = payload().target
    expect(isBrowserAnnotationPayloadShape({ ...payload(), target: targetWithoutSelector })).toBe(
      false
    )
    expect(isBrowserAnnotationPayloadShape(null)).toBe(false)
  })
})
