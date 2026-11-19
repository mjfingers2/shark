import type { RpcClient } from '../transport/rpc/rpc-client-contract'

// Why: desktop alerts become phone pushes through the native notification stack, which a browser
// tab does not have; its Home still shows the same agent states live.
export function subscribeToDesktopNotifications(_client: RpcClient, _hostId: string): () => void {
  return () => {}
}
