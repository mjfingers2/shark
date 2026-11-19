import type { QueryClient } from '@tanstack/react-query'

// Why: Home's stored rows live in the phone's device store, which a browser tab does not have;
// the tab's Home reads them fresh from the desktop instead.
export function restoreHomeQueries(
  _queryClient: QueryClient,
  _hostIds: readonly string[]
): Promise<void> {
  return Promise.resolve()
}
