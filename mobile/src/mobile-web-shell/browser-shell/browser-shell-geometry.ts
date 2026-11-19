import {
  BROWSER_DISPLAY_PREFERENCES_EVENT,
  browserColorScheme
} from './browser-display-preferences'
import {
  BRIDGE_MAX_SAFE_AREA_INSET,
  type BridgeSafeAreaInsets
} from '../bridge/page-geometry/bridge-safe-area-insets'
import type { BridgeColorScheme } from '../bridge/protocol/bridge-envelope'

export type ViewportFacts = {
  innerHeight: number
  // window.visualViewport; absent in very old browsers.
  visual: { height: number; offsetTop: number } | null
}

function clampInset(value: number): number {
  return Number.isFinite(value)
    ? Math.min(BRIDGE_MAX_SAFE_AREA_INSET, Math.max(0, Math.round(value)))
    : 0
}

/**
 * How much of the layout viewport the on-screen keyboard covers. Safari keeps the layout viewport
 * and shrinks the visual one, which is the same occlusion the app reports from the native keyboard.
 */
export function keyboardInsetOf(facts: ViewportFacts): number {
  if (facts.visual === null) {
    return 0
  }
  const covered = facts.innerHeight - (facts.visual.height + facts.visual.offsetTop)
  // Below this it is browser chrome settling, not a keyboard.
  return covered < 40 ? 0 : clampInset(covered)
}

/**
 * Insets from the probe's computed env(safe-area-inset-*) paddings; anything unreadable counts as
 * zero. Only the padding fields: a computed style's top/right/bottom/left are the probe's position.
 */
export function safeAreaInsetsOf(computed: {
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
}): BridgeSafeAreaInsets {
  const read = (value: string) => clampInset(Number.parseFloat(value))
  return {
    top: read(computed.paddingTop),
    right: read(computed.paddingRight),
    bottom: read(computed.paddingBottom),
    left: read(computed.paddingLeft)
  }
}

/** The viewport content with `viewport-fit=cover` added once; other settings are kept as they are. */
export function viewportContentCovering(content: string): string {
  const parts = content
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '' && !/^viewport-fit\s*=/i.test(part))
  return [...parts, 'viewport-fit=cover'].join(', ')
}

/**
 * Lets the page draw under a home-screen app's translucent status bar, so env(safe-area-inset-*)
 * reports real insets and the page pads by them, as it does for the app's published insets.
 */
export function coverViewport(doc: Document): void {
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (meta === null) {
    meta = doc.createElement('meta')
    meta.name = 'viewport'
    meta.content = 'width=device-width, initial-scale=1'
    doc.head.append(meta)
  }
  meta.content = viewportContentCovering(meta.content)
}

export type BrowserGeometryPublisher = {
  publishSafeAreaInsets: (next: BridgeSafeAreaInsets) => void
  publishKeyboardInset: (next: number) => void
  publishColorScheme: (next: BridgeColorScheme) => void
}

export type BrowserGeometrySnapshot = {
  safeAreaInsets: BridgeSafeAreaInsets
  keyboardInset: number
  colorScheme: BridgeColorScheme
}

/**
 * Reads the tab's geometry now and keeps the bridge host told: the safe area the native shell
 * measures, the keyboard it reports, and the system light/dark choice the app would resolve.
 */
export function watchBrowserGeometry(
  win: Window,
  publisher: () => BrowserGeometryPublisher | null,
  readAppearance: () => 'system' | 'light' | 'dark' = () => 'system'
): { snapshot: BrowserGeometrySnapshot; dispose: () => void } {
  const doc = win.document
  const probe = doc.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  doc.body.append(probe)
  const readInsets = () => safeAreaInsetsOf(win.getComputedStyle(probe))
  const readKeyboard = () =>
    keyboardInsetOf({
      innerHeight: win.innerHeight,
      visual: win.visualViewport ?? null
    })
  const lightQuery = win.matchMedia('(prefers-color-scheme: light)')
  // A fixed Light or Dark chosen in this tab's Settings wins over the system setting.
  const readScheme = (): BridgeColorScheme =>
    browserColorScheme(readAppearance(), lightQuery.matches)

  const onViewport = () => {
    publisher()?.publishKeyboardInset(readKeyboard())
    publisher()?.publishSafeAreaInsets(readInsets())
  }
  const onScheme = () => publisher()?.publishColorScheme(readScheme())
  win.visualViewport?.addEventListener('resize', onViewport)
  win.visualViewport?.addEventListener('scroll', onViewport)
  win.addEventListener('resize', onViewport)
  win.addEventListener('orientationchange', onViewport)
  lightQuery.addEventListener('change', onScheme)
  win.addEventListener(BROWSER_DISPLAY_PREFERENCES_EVENT, onScheme)
  return {
    snapshot: {
      safeAreaInsets: readInsets(),
      keyboardInset: readKeyboard(),
      colorScheme: readScheme()
    },
    dispose: () => {
      win.visualViewport?.removeEventListener('resize', onViewport)
      win.visualViewport?.removeEventListener('scroll', onViewport)
      win.removeEventListener('resize', onViewport)
      win.removeEventListener('orientationchange', onViewport)
      lightQuery.removeEventListener('change', onScheme)
      win.removeEventListener(BROWSER_DISPLAY_PREFERENCES_EVENT, onScheme)
      probe.remove()
    }
  }
}
