import { app } from 'electron'

/**
 * Why: Shark is a personal fork of Orca. Orca's release feed would "update" an installed Shark
 * into upstream Orca and silently drop every Shark change, so a real Shark never runs the updater.
 * Orca's own updater tests still exercise its packaged behaviour, so under Vitest the gate keeps
 * Orca's original rule (packaged only).
 */
export function shouldRunReleaseUpdater(input: {
  isPackaged: boolean
  testingOrcaUpdater: boolean
}): boolean {
  return input.testingOrcaUpdater && input.isPackaged
}

/** The updater's single gate: every check, download, nudge and pinned-build path asks this. */
export function isReleaseUpdaterEnabled(): boolean {
  return shouldRunReleaseUpdater({
    isPackaged: app.isPackaged,
    testingOrcaUpdater: process.env.VITEST === 'true'
  })
}
