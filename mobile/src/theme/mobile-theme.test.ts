import { describe, expect, it } from 'vitest'
import { paletteForScheme, type MobileColorScheme } from './mobile-theme'

// WCAG relative luminance of an opaque #rrggbb colour.
function luminanceOf(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) {
    throw new Error(`not an opaque #rrggbb colour: ${hex}`)
  }
  const [red, green, blue] = match.slice(1).map((pair) => {
    const channel = Number.parseInt(pair, 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}

function contrastBetween(first: string, second: string): number {
  const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

const schemes: MobileColorScheme[] = ['dark', 'light']

describe('Shark mobile palette', () => {
  it.each(schemes)('keeps body text readable (4.5:1) on every %s surface', (scheme) => {
    const palette = paletteForScheme(scheme)
    for (const surface of [palette.bgBase, palette.sheetSurface, palette.sheetGroup]) {
      expect(contrastBetween(palette.textPrimary, surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrastBetween(palette.textSecondary, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(schemes)('keeps the blue primary button and its ink apart in %s', (scheme) => {
    const palette = paletteForScheme(scheme)
    // Send, the active nav button and the like draw bgBase ink on surfaceBright.
    expect(contrastBetween(palette.bgBase, palette.surfaceBright)).toBeGreaterThanOrEqual(4.5)
    // Icons and bold labels on the accent only need the 3:1 for large text and UI parts.
    expect(contrastBetween(palette.onAccent, palette.accentBlue)).toBeGreaterThanOrEqual(3)
    expect(
      contrastBetween(palette.onCreateActionFill, palette.createActionFill)
    ).toBeGreaterThanOrEqual(3)
  })

  it.each(schemes)('draws text field edges at 3:1 on the %s screen and sheets', (scheme) => {
    const palette = paletteForScheme(scheme)
    for (const surface of [palette.bgBase, palette.sheetSurface, palette.sheetGroup]) {
      expect(contrastBetween(palette.inputBorder, surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('paints the dark scheme navy rather than neutral grey', () => {
    const { bgBase } = paletteForScheme('dark')
    const blue = Number.parseInt(bgBase.slice(5, 7), 16)
    const red = Number.parseInt(bgBase.slice(1, 3), 16)
    expect(blue).toBeGreaterThan(red)
  })

  it('rejects a colour it cannot measure instead of guessing', () => {
    expect(() => contrastBetween('rgba(0, 0, 0, 0.5)', '#ffffff')).toThrow()
  })
})
