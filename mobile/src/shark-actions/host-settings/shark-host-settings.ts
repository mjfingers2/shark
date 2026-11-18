import {
  normalizeWorkspaceCleanupRules,
  type WorkspaceCleanupRules
} from '../../../../src/shared/workspace-cleanup/workspace-cleanup-policy'
import type { RpcSendParams } from '../../../../src/shared/rpc-contract/rpc-send-params'
import { settingsField, settingsMember } from '../../settings/mobile-settings-projection'
import { bindDeferredRpcOperation, defineRpcOperation } from '../../transport/rpc/rpc-operation'
import type { RpcCompatibleReader } from '../../transport/rpc/rpc-operation-contract'

/** The desktop's Shark switches a phone can flip; null means this host does not offer it (an older desktop). */
export type SharkHostSettings = {
  /** The host's whole cleanup rule set; the phone flips only "unchanged" (empty sessions after a day). */
  cleanupRules: WorkspaceCleanupRules | null
  autoPreview: boolean | null
}

export type SharkHostToggle = { kind: 'emptySessionCleanup' | 'autoPreview'; enabled: boolean }

type SettingsUpdateParams = NonNullable<RpcSendParams<'settings.update'>>

/** Reads the switches from a settings.get/settings.update `settings` object. */
export function readSharkHostSettings(settings: unknown): SharkHostSettings {
  const field = (key: string) => (settings == null ? undefined : settingsField(settings, key))
  const rules = field('workspaceCleanupPolicy')
  const autoPreview = field('browserAutoPreviewEnabled')
  return {
    cleanupRules:
      rules !== null && typeof rules === 'object' ? normalizeWorkspaceCleanupRules(rules) : null,
    autoPreview: typeof autoPreview === 'boolean' ? autoPreview : null
  }
}

/**
 * The settings.update for one flip, and the switches as they will read after it.
 * Null when the host never reported that setting: settings.update is strict, so an older host would refuse it.
 */
export function planSharkHostToggle(
  current: SharkHostSettings,
  toggle: SharkHostToggle
): { update: SettingsUpdateParams; next: SharkHostSettings } | null {
  if (toggle.kind === 'autoPreview') {
    return current.autoPreview === null
      ? null
      : {
          update: { browserAutoPreviewEnabled: toggle.enabled },
          next: { ...current, autoPreview: toggle.enabled }
        }
  }
  if (current.cleanupRules === null) {
    return null
  }
  // A client writes back every rule it read; only the empty-session rule changes.
  const rules: WorkspaceCleanupRules = {
    ...current.cleanupRules,
    unchanged: { ...current.cleanupRules.unchanged, enabled: toggle.enabled }
  }
  return { update: { workspaceCleanupPolicy: rules }, next: { ...current, cleanupRules: rules } }
}

const sharkHostSettingsReader: RpcCompatibleReader<
  unknown,
  'shark-host-settings',
  SharkHostSettings
> = (raw) => ({
  compatible: true,
  variant: 'shark-host-settings',
  value: readSharkHostSettings(raw == null ? undefined : settingsMember(raw)),
  salvage: { droppedPaths: [], droppedCount: 0 }
})

export const sharkHostSettingsRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'settings.shark-host-settings',
    method: 'settings.get',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: sharkHostSettingsReader
  })
)

// The reply carries the saved settings, so the switches show what the host actually kept.
export const sharkHostSettingsWrite = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'settings.update-shark-host-settings',
    method: 'settings.update',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: sharkHostSettingsReader
  })
)
