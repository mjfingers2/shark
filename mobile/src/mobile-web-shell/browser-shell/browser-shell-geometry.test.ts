import { describe, expect, it } from 'vitest'
import {
  keyboardInsetOf,
  safeAreaInsetsOf,
  viewportContentCovering
} from './browser-shell-geometry'

describe('browser shell geometry', () => {
  it('reports the keyboard as the layout height the visual viewport lost', () => {
    expect(
      keyboardInsetOf({
        innerHeight: 1000,
        visual: { height: 640, offsetTop: 0 }
      })
    ).toBe(360)
    expect(
      keyboardInsetOf({
        innerHeight: 1000,
        visual: { height: 640, offsetTop: 60 }
      })
    ).toBe(300)
  })

  it('ignores browser chrome settling and missing visual viewports', () => {
    expect(
      keyboardInsetOf({
        innerHeight: 1000,
        visual: { height: 980, offsetTop: 0 }
      })
    ).toBe(0)
    expect(keyboardInsetOf({ innerHeight: 1000, visual: null })).toBe(0)
    expect(
      keyboardInsetOf({
        innerHeight: 1000,
        visual: { height: 1200, offsetTop: 0 }
      })
    ).toBe(0)
  })

  it('reads computed env() paddings, treating anything unreadable as zero', () => {
    expect(
      safeAreaInsetsOf({
        paddingTop: '47px',
        paddingRight: '0px',
        paddingBottom: '34.4px',
        paddingLeft: 'auto'
      })
    ).toEqual({ top: 47, right: 0, bottom: 34, left: 0 })
  })

  it('reads the paddings, not the fixed probe position a computed style also carries', () => {
    // An iPad tab: the 0x0 fixed probe's computed right/bottom are the whole viewport.
    const computed = {
      top: '0px',
      right: '768px',
      bottom: '1024px',
      left: '0px',
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px'
    }
    expect(safeAreaInsetsOf(computed)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
  })

  it('adds viewport-fit=cover once, keeping the other viewport settings', () => {
    expect(viewportContentCovering('width=device-width, initial-scale=1')).toBe(
      'width=device-width, initial-scale=1, viewport-fit=cover'
    )
    expect(viewportContentCovering('width=device-width,viewport-fit=auto')).toBe(
      'width=device-width, viewport-fit=cover'
    )
    expect(viewportContentCovering('')).toBe('viewport-fit=cover')
  })
})
