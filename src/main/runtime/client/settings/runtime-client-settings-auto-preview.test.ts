import { describe, expect, it, vi } from 'vitest'
import { SettingsUpdate } from '../../../../shared/rpc-contract/client-ui/client-settings-params'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import type { RuntimeStore } from '../../construction/runtime-store-contract'
import { RuntimeClientSettingsController } from './runtime-client-settings'

vi.mock('../../../claude/agent-view/agent-view-service', () => ({
  getClaudeAgentViewService: () => ({ reconcile: async () => {} })
}))

function controllerWith(initial: Partial<GlobalSettings>) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the controller only reads the fields these tests set.
  let settings = { ...initial } as ReturnType<NonNullable<RuntimeStore['getSettings']>>
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a stub store with only the two methods the controller calls here.
  const store = {
    getSettings: () => settings,
    updateSettings: (updates: Partial<GlobalSettings>) => {
      settings = { ...settings, ...updates }
    }
  } as unknown as Pick<RuntimeStore, 'getSettings' | 'updateSettings' | 'runDurableMutation'>
  return new RuntimeClientSettingsController(store)
}

describe('browserAutoPreviewEnabled for paired clients', () => {
  it('reads as on when the desktop never saved it, and off only when saved off', () => {
    expect(controllerWith({}).get().browserAutoPreviewEnabled).toBe(true)
    expect(
      controllerWith({ browserAutoPreviewEnabled: false }).get().browserAutoPreviewEnabled
    ).toBe(false)
  })

  it('accepts a client write and reports the new value', async () => {
    const parsed = SettingsUpdate.parse({ browserAutoPreviewEnabled: false })
    const next = await controllerWith({}).update(parsed)
    expect(next.browserAutoPreviewEnabled).toBe(false)
  })

  it('rejects a non-boolean value', () => {
    expect(SettingsUpdate.safeParse({ browserAutoPreviewEnabled: 'off' }).success).toBe(false)
  })
})
