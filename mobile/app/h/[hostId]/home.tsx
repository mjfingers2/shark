import { Redirect } from 'expo-router'

// Browser-tab copy only (home.web.tsx); the app's Home is its root screen, so a stray link lands there.
export default function HostHomeRedirect() {
  return <Redirect href="/" />
}
