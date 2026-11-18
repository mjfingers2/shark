import { useRouter } from 'expo-router'
import { SharkSettingsScreen } from '../src/shark-actions/settings/SharkSettingsScreen'

export default function NativeSharkSettingsRoute() {
  const router = useRouter()
  return <SharkSettingsScreen onBack={() => router.back()} push={(route) => router.push(route)} />
}
