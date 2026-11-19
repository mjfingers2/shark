import { MOBILE_WEB_APP_ICON_PATHNAME } from './mobile-web-app-html'

/** Served beside /m; the page links it with the pairing it wants a home-screen copy to start with. */
export const MOBILE_WEB_APP_MANIFEST_PATHNAME = '/m-manifest.webmanifest'

// Why: iPad Safari saves the manifest's start_url at Add to Home Screen, and the home-screen app has
// storage apart from Safari's, so the pairing must ride in that URL's fragment. The token is the
// page's own base64url record; anything else is dropped rather than escaped into the start_url.
const RESUME_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,8192}$/

function resumeTokenOf(requestUrl: string): string | null {
  try {
    const token = new URL(requestUrl, 'http://shark.invalid').searchParams.get('resume')
    return token !== null && RESUME_TOKEN_PATTERN.test(token) ? token : null
  } catch {
    return null
  }
}

/** The web app manifest for a request to MOBILE_WEB_APP_MANIFEST_PATHNAME, as JSON text. */
export function buildMobileWebAppManifest(requestUrl: string): string {
  const token = resumeTokenOf(requestUrl)
  return JSON.stringify({
    name: 'Shark',
    short_name: 'Shark',
    display: 'standalone',
    scope: '/',
    start_url: token === null ? '/m' : `/m#resume=${token}`,
    background_color: '#0a1324',
    theme_color: '#0a1324',
    icons: [{ src: MOBILE_WEB_APP_ICON_PATHNAME, sizes: '180x180', type: 'image/png' }]
  })
}
