/** Served at /m: the phone bundle's index.html, dressed so iPad Safari can add it to the home screen. */

export const MOBILE_WEB_APP_ICON_PATHNAME = '/m-icon.png'

const MOBILE_WEB_APP_TITLE = 'Shark'

// Why: Safari reads these tags at "Add to Home Screen" time to open the link full screen under the Shark name and icon.
const HOME_SCREEN_HEAD_TAGS = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  `<meta name="apple-mobile-web-app-title" content="${MOBILE_WEB_APP_TITLE}" />`,
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="theme-color" content="#0a1324" />',
  `<link rel="apple-touch-icon" href="${MOBILE_WEB_APP_ICON_PATHNAME}" />`
]

const TITLE_PATTERN = /<title>[\s\S]*?<\/title>/i
const HEAD_CLOSE_PATTERN = /<\/head>/i

/** Returns the page with the Shark title and home-screen tags; null when the input has no <head> to extend. */
export function buildMobileWebAppHtml(indexHtml: string): string | null {
  if (!HEAD_CLOSE_PATTERN.test(indexHtml)) {
    return null
  }
  const title = `<title>${MOBILE_WEB_APP_TITLE}</title>`
  const titled = TITLE_PATTERN.test(indexHtml)
    ? indexHtml.replace(TITLE_PATTERN, title)
    : indexHtml.replace(HEAD_CLOSE_PATTERN, `${title}\n</head>`)
  return titled.replace(HEAD_CLOSE_PATTERN, `${HOME_SCREEN_HEAD_TAGS.join('\n')}\n</head>`)
}
