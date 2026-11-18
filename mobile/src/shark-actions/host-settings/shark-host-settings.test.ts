import { describe, expect, it } from 'vitest'
import { planSharkHostToggle, readSharkHostSettings } from './shark-host-settings'

const RULES = {
  merged: { enabled: true },
  unchanged: { enabled: true, afterDays: 1 },
  inactive: { enabled: false, afterDays: 30, action: 'archive' },
  automationRuns: { enabled: false },
  orchestrationWorkers: { enabled: true },
  keepWhen: 'any-local-files'
}

describe('readSharkHostSettings', () => {
  it('reads both switches from a current host', () => {
    const read = readSharkHostSettings({
      workspaceCleanupPolicy: RULES,
      browserAutoPreviewEnabled: false
    })
    expect(read.cleanupRules?.unchanged).toEqual({ enabled: true, afterDays: 1 })
    expect(read.autoPreview).toBe(false)
  })

  it('reports a switch an older host never published as unavailable', () => {
    expect(readSharkHostSettings({ machineName: 'mac' })).toEqual({
      cleanupRules: null,
      autoPreview: null
    })
    expect(readSharkHostSettings(undefined)).toEqual({ cleanupRules: null, autoPreview: null })
  })
})

describe('planSharkHostToggle', () => {
  it('turns off only the empty-session rule and keeps every other rule', () => {
    const current = readSharkHostSettings({ workspaceCleanupPolicy: RULES })
    const plan = planSharkHostToggle(current, { kind: 'emptySessionCleanup', enabled: false })
    expect(plan?.update).toEqual({
      workspaceCleanupPolicy: { ...RULES, unchanged: { enabled: false, afterDays: 1 } }
    })
    expect(plan?.next.cleanupRules?.unchanged.enabled).toBe(false)
  })

  it('writes auto-preview as a plain boolean', () => {
    const current = readSharkHostSettings({ browserAutoPreviewEnabled: true })
    expect(planSharkHostToggle(current, { kind: 'autoPreview', enabled: false })).toEqual({
      update: { browserAutoPreviewEnabled: false },
      next: { cleanupRules: null, autoPreview: false }
    })
  })

  it('writes nothing to a host that did not report the setting', () => {
    const older = readSharkHostSettings({})
    expect(planSharkHostToggle(older, { kind: 'autoPreview', enabled: true })).toBeNull()
    expect(planSharkHostToggle(older, { kind: 'emptySessionCleanup', enabled: true })).toBeNull()
  })
})
