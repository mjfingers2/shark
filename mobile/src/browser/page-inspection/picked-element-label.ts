import type { BrowserAnnotationPayload } from '../../../../src/shared/browser/element-grab/browser-grab-types'

const TEXT_MAX = 40
const SELECTOR_MAX = 80

function shorten(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** One line naming the element the user pointed at, so they can tell they hit the right one. */
export function pickedElementLabel(payload: BrowserAnnotationPayload): string {
  const { target } = payload
  const name = target.accessibility.accessibleName || target.textSnippet
  const tag = `<${target.tagName.toLowerCase() || 'element'}>`
  const head = name ? `${tag} "${shorten(name, TEXT_MAX)}"` : tag
  return target.selector ? `${head} · ${shorten(target.selector, SELECTOR_MAX)}` : head
}
