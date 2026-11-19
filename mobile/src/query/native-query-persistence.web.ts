import type { QueryClient } from '@tanstack/react-query'
import type { HostQueryPersistence } from './host-query-persistence'
import { hostScopeKey } from './host-query-key'

// Why: the page has no device store (the native module already answered null on web at runtime),
// and its import chain carries native-only schemas into the page. Only the browser tab's Home
// reaches this; host pages keep their data through the bridge store.
export function keepNativeHostQueries(
  _queryClient: QueryClient,
  _hostId: string
): HostQueryPersistence | null {
  return null
}

export function nativeQueryStoreReady(): Promise<boolean> {
  return Promise.resolve(false)
}

export function forgetNativeHostQueries(queryClient: QueryClient, hostId: string): void {
  queryClient.removeQueries({ queryKey: hostScopeKey(hostId) })
}
