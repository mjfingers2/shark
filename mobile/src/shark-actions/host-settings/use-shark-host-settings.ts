import { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '../../i18n/mobile-i18n'
import { triggerError, triggerSelection } from '../../platform/haptics/haptics'
import type { UnvalidatedRpcRequestPort } from '../../transport/rpc/unvalidated-rpc-request-port'
import {
  planSharkHostToggle,
  sharkHostSettingsRead,
  sharkHostSettingsWrite,
  type SharkHostSettings,
  type SharkHostToggle
} from './shark-host-settings'

export type SharkHostSettingsState = {
  /** Null until the first read lands. */
  settings: SharkHostSettings | null
  saving: boolean
  error: string | null
  toggle: (toggle: SharkHostToggle) => void
}

/**
 * The desktop's Shark switches, read only while `active` (an open menu, a focused screen) so other
 * screens' request sequences stay as they were. A flip shows at once and rolls back if the host refuses.
 */
export function useSharkHostSettings(
  client: UnvalidatedRpcRequestPort | null,
  active: boolean
): SharkHostSettingsState {
  const [settings, setSettings] = useState<SharkHostSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const savingRef = useRef(false)

  useEffect(() => {
    if (!active || !client) {
      return
    }
    let cancelled = false
    void sharkHostSettingsRead
      .request(client)
      .then((reply) => sharkHostSettingsRead.interpret(reply))
      .then(
        (read) => {
          if (!cancelled && !savingRef.current) {
            setSettings(read)
            setError(null)
          }
        },
        () => {
          if (!cancelled) {
            setError(
              translate('shark.hostSettings.loadFailed', 'Could not read the desktop settings.')
            )
          }
        }
      )
    return () => {
      cancelled = true
    }
  }, [active, client])

  const toggle = useCallback(
    (change: SharkHostToggle) => {
      const current = settingsRef.current
      const plan = current ? planSharkHostToggle(current, change) : null
      if (!client || !current || !plan || savingRef.current) {
        return
      }
      savingRef.current = true
      setSaving(true)
      setError(null)
      setSettings(plan.next)
      triggerSelection()
      void sharkHostSettingsWrite
        .request(client, plan.update)
        .then((reply) => sharkHostSettingsWrite.interpret(reply))
        .then(
          (saved) => setSettings(saved),
          () => {
            triggerError()
            setSettings(current)
            setError(translate('shark.hostSettings.saveFailed', 'Could not save. Try again.'))
          }
        )
        .finally(() => {
          savingRef.current = false
          setSaving(false)
        })
    },
    [client]
  )

  return { settings, saving, error, toggle }
}
