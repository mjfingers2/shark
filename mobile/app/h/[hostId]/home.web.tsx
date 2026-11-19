import { BrowserHomeScreen } from '../../../src/home/BrowserHomeScreen'

// Render the screen directly: a browser tab has no native Home to hand this to.
export default function HostHomeRoute() {
  return <BrowserHomeScreen />
}
