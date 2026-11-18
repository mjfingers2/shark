// The App Store / GitHub release feeds belong to Orca's own app IDs.
const ORCA_APP_IDS = new Set(['com.stably.orca.mobile', 'dev.orca.app'])

/**
 * Why: a fork such as Shark ships under its own app ID. Asking Orca's feeds would offer Orca
 * itself as an "update" and send the user to a different app, so only Orca's IDs may ask.
 */
export function ownsOrcaUpdateChannel(appId: string | null | undefined): boolean {
  return typeof appId === 'string' && ORCA_APP_IDS.has(appId)
}
