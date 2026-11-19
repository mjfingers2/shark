import { useRouter } from 'expo-router'
import { SharkPhoneNotificationsSection } from '../src/shark-actions/settings/SharkPhoneNotificationsSection'
import { SharkSettingsScreen } from '../src/shark-actions/settings/SharkSettingsScreen'

export default function NativeSharkSettingsRoute() {
  const router = useRouter()
  return (
    <SharkSettingsScreen
      onBack={() => router.back()}
      renderPhoneSection={(focused) => (
        <SharkPhoneNotificationsSection focused={focused} push={(route) => router.push(route)} />
      )}
    />
  )
}
