import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: true } }))

import { shouldRunReleaseUpdater } from './shark-release-updates'

describe('Shark release updates', () => {
  it('never reaches the Orca feed from an installed (packaged) Shark', () => {
    expect(shouldRunReleaseUpdater({ isPackaged: true, testingOrcaUpdater: false })).toBe(false)
  })

  it('stays off in dev builds too', () => {
    expect(shouldRunReleaseUpdater({ isPackaged: false, testingOrcaUpdater: false })).toBe(false)
  })

  it("keeps Orca's packaged-only rule for Orca's own updater tests", () => {
    expect(shouldRunReleaseUpdater({ isPackaged: true, testingOrcaUpdater: true })).toBe(true)
    expect(shouldRunReleaseUpdater({ isPackaged: false, testingOrcaUpdater: true })).toBe(false)
  })
})
