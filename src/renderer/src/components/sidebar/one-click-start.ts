import { useAppStore } from '@/store/index'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host'
import { launchAddProjectMenuAction } from './project-admission/menu/launch-add-project-menu-action'

/** New project in one step: the folder picker opens directly and the picked project opens itself. */
export function pickNewProject(): void {
  void launchAddProjectMenuAction({
    action: 'browse',
    hostId: LOCAL_EXECUTION_HOST_ID,
    onOpenEntryRequest: (entryRequest) => {
      useAppStore.getState().openModal('add-repo', { entryRequest })
    }
  })
}

/**
 * New session in one step: a workspace with the default agent in the current
 * project, created without stopping at the composer. Context hand-offs of that
 * agent then stack up inside the same workspace card.
 */
export function startNewSession(): void {
  useAppStore.getState().openModal('new-workspace-composer', {
    telemetrySource: 'sidebar',
    autoSubmit: true
  })
}
