import { BrowserSettingsMenuScreen } from '../../../../src/settings/browser-settings-screens'

// Render the screen directly: a browser tab has no native Settings to hand this to.
export default function HostSettingsRoute() {
  return <BrowserSettingsMenuScreen />
}
