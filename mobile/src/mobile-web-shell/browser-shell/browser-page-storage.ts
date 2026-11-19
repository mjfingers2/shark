import {
  isHostWorkspaceStorageKey,
  isPageStorageKeyForRoute,
  pageStorageEntriesForInit,
  pageStorageKeysForRoute,
  type PageStorageForInit
} from '../page-storage/page-storage-keys'
import type { BrowserKeyValueStore } from './browser-credential-store'

// Prefixed so the page's own localStorage use (AsyncStorage's web build) can never collide with or
// read the values the shell hands it through init.
const PAGE_VALUE_PREFIX = 'shark-browser-shell:page:'

export type BrowserPageStorage = {
  readStorage: () => PageStorageForInit
  writeStorage: (key: string, value: string | null) => void
  readWorkspaceKey: (key: string) => Promise<string | null>
}

function readValue(store: BrowserKeyValueStore | null, key: string): string | null {
  try {
    return store?.getItem(PAGE_VALUE_PREFIX + key) ?? null
  } catch {
    return null
  }
}

/**
 * The app's page-storage allowlist, kept in this tab's localStorage: the native shell's
 * usePageHostSnapshot with the keychain mirror replaced by the browser's only durable store.
 */
export function createBrowserPageStorage(args: {
  store: BrowserKeyValueStore | null
  hostId: string
  routePathname: string
  ownsHostArea: boolean
}): BrowserPageStorage {
  const { store, hostId, routePathname, ownsHostArea } = args
  return {
    readStorage: () => {
      const held: Record<string, string> = {}
      for (const key of pageStorageKeysForRoute(hostId, routePathname)) {
        const value = readValue(store, key)
        if (value !== null) {
          held[key] = value
        }
      }
      const { entries, oversize } = pageStorageEntriesForInit(held)
      return { storage: entries, storageOversize: oversize }
    },
    writeStorage: (key, value) => {
      // Recheck the allowlist; the host already did, but this store must never hold another key.
      if (!isPageStorageKeyForRoute(key, hostId, routePathname, ownsHostArea) || store === null) {
        return
      }
      try {
        if (value === null) {
          store.removeItem(PAGE_VALUE_PREFIX + key)
        } else {
          store.setItem(PAGE_VALUE_PREFIX + key, value)
        }
      } catch (error) {
        console.warn('[browser-shell] a page preference could not be saved', { key }, error)
      }
    },
    readWorkspaceKey: (key) =>
      !ownsHostArea || !isHostWorkspaceStorageKey(key, hostId)
        ? Promise.reject(new Error('this page may not read that key'))
        : Promise.resolve(readValue(store, key))
  }
}
