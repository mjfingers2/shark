import { useCallback } from 'react'
import { useShellSessionHandoff } from './route-handoff'
import { stringifyRouteHref } from './route-href'
import {
  hostStackHostRoute,
  hostStackRouteHref,
  type HostStackRouteTarget
} from './host-stack-navigation'

// Why: a browser tab has no native host stack to push onto; every host screen is its own document,
// so the shell loads the target's page. Only the browser tab's Home reaches this.
export function useOpenHostStackRoute(
  _openInHostDocument = false
): (hostId: string, target: HostStackRouteTarget) => void {
  const shell = useShellSessionHandoff()
  return useCallback(
    (hostId, target) => {
      const href = stringifyRouteHref(hostStackRouteHref(target))
      shell?.open(href.startsWith(hostStackHostRoute(hostId)) ? href : hostStackHostRoute(hostId))
    },
    [shell]
  )
}
