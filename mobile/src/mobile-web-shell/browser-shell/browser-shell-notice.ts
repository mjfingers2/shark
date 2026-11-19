import { translate } from '../../i18n/mobile-i18n'

/** Why the tab shows a notice instead of a workspace. */
export type BrowserShellNotice = 'open-from-desktop' | 'invalid-link' | 'link-used' | 'unreachable'

function noticeCopy(kind: BrowserShellNotice): { title: string; body: string } {
  switch (kind) {
    case 'open-from-desktop':
      return {
        title: translate('browserShell.notice.openFromDesktopTitle', 'Open this from your desktop'),
        body: translate(
          'browserShell.notice.openFromDesktopBody',
          "On your computer, open Shark's Mobile settings and open the browser link shown there on this device."
        )
      }
    case 'invalid-link':
      return {
        title: translate('browserShell.notice.invalidLinkTitle', 'This link is not a pairing link'),
        body: translate(
          'browserShell.notice.invalidLinkBody',
          "Open a new link from Shark's Mobile settings on your computer."
        )
      }
    case 'link-used':
      return {
        title: translate('browserShell.notice.linkUsedTitle', 'This link was already used'),
        body: translate(
          'browserShell.notice.linkUsedBody',
          "Each link works once. Open a new link from Shark's Mobile settings on your computer."
        )
      }
    case 'unreachable':
      return {
        title: translate('browserShell.notice.unreachableTitle', "Can't reach your computer"),
        body: translate(
          'browserShell.notice.unreachableBody',
          'Make sure Shark is running on your computer and this device is on the same network.'
        )
      }
  }
}

// Built outside React: nothing of the route tree mounts in a tab that has no desktop to talk to.
export function renderBrowserShellNotice(container: HTMLElement, kind: BrowserShellNotice): void {
  const doc = container.ownerDocument
  const { title, body } = noticeCopy(kind)
  const panel = doc.createElement('div')
  panel.setAttribute('role', 'alert')
  panel.style.cssText =
    'font:16px/1.5 system-ui,-apple-system,sans-serif;color:#e6e9f0;background:#0a1324;' +
    'min-height:100vh;width:100%;box-sizing:border-box;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center'
  const brand = doc.createElement('div')
  brand.style.cssText = 'font-size:28px;font-weight:700;letter-spacing:0.02em;margin-bottom:8px'
  // The product name stays as it is in every language.
  brand.textContent = 'Shark'
  const heading = doc.createElement('div')
  heading.style.cssText = 'font-size:18px;font-weight:600'
  heading.textContent = title
  const detail = doc.createElement('div')
  detail.style.cssText = 'color:#9aa4b8;font-size:14px;max-width:420px'
  detail.textContent = body
  panel.append(brand, heading, detail)
  if (kind === 'unreachable') {
    const retry = doc.createElement('button')
    retry.type = 'button'
    retry.textContent = translate('browserShell.notice.retry', 'Try again')
    retry.style.cssText =
      'margin-top:12px;font:inherit;font-size:15px;color:#0a1324;background:#e6e9f0;' +
      'border:0;border-radius:8px;padding:10px 20px;cursor:pointer'
    retry.addEventListener('click', () => {
      doc.defaultView?.location.reload()
    })
    panel.append(retry)
  }
  doc.documentElement.style.background = '#0a1324'
  container.replaceChildren(panel)
}
