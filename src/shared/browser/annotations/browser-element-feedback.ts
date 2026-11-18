import type { BrowserAnnotationPayload } from '../element-grab/browser-grab-types'
import { formatBrowserAnnotationsAsMarkdown } from './browser-annotation-output'

/** One pointed-at element and the user's comment, in the shape the desktop annotate flow sends. */
export function formatBrowserElementFeedbackForAgent(args: {
  browserPageId: string
  payload: BrowserAnnotationPayload
  comment: string
  createdAt: string
}): string {
  return formatBrowserAnnotationsAsMarkdown(
    [
      {
        id: `element-feedback:${args.createdAt}`,
        browserPageId: args.browserPageId,
        comment: args.comment,
        intent: 'change',
        priority: 'important',
        createdAt: args.createdAt,
        payload: args.payload
      }
    ],
    { includeHtmlSnippet: true }
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Whether a reply carries every field the formatter reads; a client checks before it formats. */
export function isBrowserAnnotationPayloadShape(value: unknown): value is BrowserAnnotationPayload {
  if (!isRecord(value) || !isRecord(value.page) || !isRecord(value.target)) {
    return false
  }
  const { page, target } = value
  return (
    typeof page.sanitizedUrl === 'string' &&
    typeof target.tagName === 'string' &&
    typeof target.selector === 'string' &&
    typeof target.textSnippet === 'string' &&
    typeof target.htmlSnippet === 'string' &&
    isRecord(target.accessibility) &&
    Array.isArray(value.nearbyText) &&
    Array.isArray(value.ancestorPath)
  )
}
