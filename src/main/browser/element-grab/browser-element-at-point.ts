import type { BrowserAnnotationPayload } from '../../../shared/browser/element-grab/browser-grab-types'
import { clampGrabPayload } from './browser-grab-payload'
import { buildGuestOverlayScript } from './grab-guest-script'

/** What pointing at a spot on the page found; `grab-active` means a desktop grab owns the page now. */
export type BrowserElementAtPoint =
  | { kind: 'element'; payload: BrowserAnnotationPayload }
  | { kind: 'none'; reason: 'no-element' | 'grab-active' }

const GRAB_ACTIVE_MARKER = '__orcaGrabActive'

/**
 * Runs in the guest: hit-tests viewport CSS point (x, y), then extracts it with the desktop grab's own
 * extractor so both devices describe an element the same way. Arming and cleanup happen in one task, so
 * the grab overlay never paints, and an armed desktop grab is left alone.
 */
export function buildElementAtPointScript(x: number, y: number): string {
  const px = Number.isFinite(x) ? x : 0
  const py = Number.isFinite(y) ? y : 0
  return `(function() {
  'use strict';
  if (window.__orcaGrab) return { ${GRAB_ACTIVE_MARKER}: true };
  var x = ${JSON.stringify(px)};
  var y = ${JSON.stringify(py)};
  var el = document.elementFromPoint(x, y);
  // Open shadow roots hide their content from the document-level hit test.
  for (var depth = 0; el && el.shadowRoot && depth < 16; depth++) {
    var inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  if (!el) return null;
  ${buildGuestOverlayScript('arm')};
  var grab = window.__orcaGrab;
  if (!grab) return null;
  try {
    return grab.extractPayload(el);
  } finally {
    try { grab.cleanup(); } catch (e) {}
  }
})()`
}

/** Revalidates the guest's answer; a page can hand back anything, so nothing is trusted unchecked. */
export function readElementAtPointResult(raw: unknown, documentUrl = ''): BrowserElementAtPoint {
  if (raw && typeof raw === 'object' && GRAB_ACTIVE_MARKER in raw) {
    return { kind: 'none', reason: 'grab-active' }
  }
  const payload = clampGrabPayload(raw, documentUrl)
  if (!payload) {
    return { kind: 'none', reason: 'no-element' }
  }
  // The phone has no screenshot use and the wire should stay small.
  return { kind: 'element', payload: { ...payload, screenshot: null } }
}
