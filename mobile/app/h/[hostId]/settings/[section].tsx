import { Redirect } from 'expo-router'

// Browser-tab copy only ([section].web.tsx); the app keeps its own Settings, so a stray link lands there.
export default function HostSettingsSectionRedirect() {
  return <Redirect href="/settings" />
}
