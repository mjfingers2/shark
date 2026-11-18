import { useCallback, useEffect, useRef, useState } from 'react'
import { nativeNotificationSettingsOperations as operations } from '../../settings/native-notification-settings-operations'

/** This phone's own "notify when an agent finishes" switch: the same preference Settings → Notifications edits. */
export function useSharkNotificationToggle(active: boolean) {
  const [on, setOn] = useState<boolean | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (!active) {
      return
    }
    let cancelled = false
    void Promise.all([operations.preference(), operations.permission()])
      .then(([preference, permission]) => {
        if (!cancelled && !savingRef.current) {
          setOn(preference.enabled && permission.granted)
          setBlocked(permission.status === 'denied')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOn(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [active])

  const toggle = useCallback(async (next: boolean): Promise<boolean> => {
    if (savingRef.current) {
      return false
    }
    savingRef.current = true
    setSaving(true)
    try {
      // Turning on asks for permission first; a refused permission leaves it off.
      const permission = await operations.permission(next)
      setBlocked(permission.status === 'denied')
      const saved = await operations.preference(next && permission.granted)
      setOn(saved.enabled && permission.granted)
      return true
    } catch {
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  return { on, blocked, saving, toggle, openSystemSettings: operations.openSettings }
}
