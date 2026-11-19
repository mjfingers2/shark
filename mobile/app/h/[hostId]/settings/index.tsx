import { Redirect } from 'expo-router'

// Browser-tab copy only (index.web.tsx); the app keeps its own Settings, so a stray link lands there.
export default function HostSettingsRedirect() {
  return <Redirect href="/settings" />
}
