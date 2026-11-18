import { HomeLaunchFolderSheet } from './HomeLaunchFolderSheet'
import { HomeNewProjectSheet } from './HomeNewProjectSheet'
import { MobileHomeQuickActions } from './MobileHomeQuickActions'
import { useHomeQuickStart } from './use-home-quick-start'

/** Home's launch folder question, one-tap new session and new project, for one desktop. */
export function MobileHomeQuickStart(props: {
  /** The most recently connected desktop, or null when none is connected. */
  hostId: string | null
  /** Whether Home shows its + button, which the quick buttons sit above. */
  showActions: boolean
  bottom: number
  onOpenForm: () => void
}) {
  const quick = useHomeQuickStart({ hostId: props.hostId, onOpenForm: props.onOpenForm })
  return (
    <>
      <MobileHomeQuickActions
        visible={props.showActions && quick.available}
        bottom={props.bottom}
        sessionBusy={quick.sessionBusy}
        onNewSession={quick.startSession}
        onNewProject={quick.openNewProject}
      />
      <HomeLaunchFolderSheet {...quick.launchSheet} />
      <HomeNewProjectSheet client={quick.client} {...quick.newProjectSheet} />
    </>
  )
}
