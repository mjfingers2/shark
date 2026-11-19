import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MobileSwitch } from '../../components/controls/MobileSwitch'
import { ListRow } from '../../components/list/ListGroup'
import { loadHosts } from '../../host-catalog/host-store'
import type { HostProfile } from '../../host-catalog/host-profile'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { SettingsNote, SettingsScreen, SettingsSection } from '../../settings/settings-screen-frame'
import { useFocusedSettingsHostClients } from '../../settings/settings-host-client-connections'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import type { UnvalidatedRpcRequestPort } from '../../transport/rpc/unvalidated-rpc-request-port'
import { useSharkHostSettings } from '../host-settings/use-shark-host-settings'

/** Settings → Shark: this phone's finish alerts (when given), then each paired desktop's Shark switches. */
export function SharkSettingsScreen({
  onBack,
  renderPhoneSection
}: {
  onBack: () => void
  /** This phone's own alerts; the native app passes it, a browser tab has no push to offer. */
  renderPhoneSection?: (focused: boolean) => ReactNode
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const [hosts, setHosts] = useState<HostProfile[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadHosts()
      .then((loaded) => !cancelled && setHosts(loaded))
      .catch(() => !cancelled && setHosts([]))
    return () => {
      cancelled = true
    }
  }, [])
  const hostIds = useMemo(() => (hosts ?? []).map((host) => host.id), [hosts])
  const { clients, focused } = useFocusedSettingsHostClients(hostIds)

  return (
    <SettingsScreen title={t('shark.settings.title', 'Shark')} onBack={onBack}>
      {renderPhoneSection?.(focused) ?? null}
      {hosts !== null && hosts.length === 0 ? (
        <SettingsNote>
          {t('shark.settings.noDesktop', 'Pair a desktop to change its Shark settings.')}
        </SettingsNote>
      ) : null}
      {(hosts ?? []).map((host) => {
        const entry = clients.find((candidate) => candidate.hostId === host.id)
        return (
          <SharkHostSection
            key={host.id}
            name={host.name}
            client={entry?.state === 'connected' ? entry.client : null}
            active={focused}
          />
        )
      })}
    </SettingsScreen>
  )
}

function SharkHostSection({
  name,
  client,
  active
}: {
  name: string
  client: UnvalidatedRpcRequestPort | null
  active: boolean
}) {
  const t = useMobileTranslation()
  const host = useSharkHostSettings(client, active)
  const cleanupOn = host.settings?.cleanupRules?.unchanged.enabled === true
  const previewOn = host.settings?.autoPreview === true
  const cleanupLabel = t('shark.actions.cleanup', 'Clear empty sessions after a day')
  const previewLabel = t('shark.actions.autoPreview', 'Auto-preview when a web server starts')
  const footer = !client
    ? t('shark.settings.desktopOffline', 'Connect to this desktop to change these.')
    : (host.error ??
      (host.settings && (host.settings.cleanupRules === null || host.settings.autoPreview === null)
        ? t('shark.actions.olderDesktop', 'Update Shark on the desktop to change this')
        : undefined))
  return (
    <SettingsSection title={name} footer={footer}>
      <ListRow
        title={cleanupLabel}
        accessory={
          <MobileSwitch
            value={cleanupOn}
            accessibilityLabel={cleanupLabel}
            disabled={!client || !host.settings?.cleanupRules || host.saving}
            onValueChange={(enabled) => host.toggle({ kind: 'emptySessionCleanup', enabled })}
          />
        }
      />
      <ListRow
        title={previewLabel}
        accessory={
          <MobileSwitch
            value={previewOn}
            accessibilityLabel={previewLabel}
            disabled={!client || host.settings?.autoPreview == null || host.saving}
            onValueChange={(enabled) => host.toggle({ kind: 'autoPreview', enabled })}
          />
        }
      />
    </SettingsSection>
  )
}
