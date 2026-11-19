import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import type { LaunchFolderChoice } from '../../../../src/shared/launch-folder/launch-folder-choices'
import { hostNewWorktreeSessionRoute } from '../../host-new-worktree-session-route'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { triggerError, triggerSuccess } from '../../platform/haptics/haptics'
import { useOpenMobileSession } from '../../session/use-open-mobile-session'
import { useHostClient } from '../../transport/connection/host-client-hooks'
import { listHomeLaunchChoices } from './home-launch-choices'
import { readHostLaunchState, type AddedHostProject } from './host-projects'
import { startQuickSession } from './quick-session-start'

// Module memory, not storage: the folder question comes back on the next app launch, never within one.
let launchPromptAsked = false

type Sheet = 'launch' | 'new-project' | null

/**
 * Home's one-step starts on the most recently connected desktop: the launch folder question,
 * a new session with defaults, and a new project from a folder on the desktop.
 */
export function useHomeQuickStart(args: {
  hostId: string | null
  onOpenForm: () => void
  /** False where every visit is a fresh document (a browser tab), so the question would repeat. */
  askOnLaunch?: boolean
}) {
  const t = useMobileTranslation()
  const router = useRouter()
  const openMobileSession = useOpenMobileSession()
  const { hostId, onOpenForm } = args
  const askOnLaunch = args.askOnLaunch ?? true
  const { client, state } = useHostClient(hostId ?? undefined)
  const connected = state === 'connected' && client !== null
  const [focused, setFocused] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [choices, setChoices] = useState<LaunchFolderChoice[]>([])
  const [sessionBusy, setSessionBusy] = useState(false)
  // What to do once the closing sheet's Modal is gone: iOS refuses to present over one mid-close.
  const afterCloseRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(true)

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )

  useEffect(() => {
    if (!askOnLaunch || !connected || !client || !focused || launchPromptAsked) {
      return
    }
    launchPromptAsked = true
    void readHostLaunchState(client)
      .then((launch) => {
        if (launch && mountedRef.current) {
          setChoices(listHomeLaunchChoices(launch.repos, launch.rows))
          setSheet((current) => current ?? 'launch')
        }
      })
      .catch(() => undefined)
  }, [askOnLaunch, client, connected, focused])

  const closeThen = useCallback((next: (() => void) | null) => {
    afterCloseRef.current = next
    setSheet(null)
  }, [])

  const afterSheetClosed = useCallback(() => {
    const next = afterCloseRef.current
    afterCloseRef.current = null
    next?.()
  }, [])

  const openChoice = useCallback(
    (choice: Pick<LaunchFolderChoice, 'worktreeId' | 'name'>) => {
      if (hostId) {
        // Home spans desktops, so Back returns here rather than to one desktop's list.
        openMobileSession({
          hostId,
          worktreeId: choice.worktreeId,
          name: choice.name,
          standalone: true
        })
      }
    },
    [hostId, openMobileSession]
  )

  const openAddedProject = useCallback(
    async (project: AddedHostProject) => {
      if (!client || !hostId) {
        return
      }
      const launch = await readHostLaunchState(client).catch(() => null)
      const [choice] = launch
        ? listHomeLaunchChoices(
            launch.repos.filter((repo) => repo.id === project.repoId),
            launch.rows,
            1
          )
        : []
      if (choice) {
        openChoice(choice)
      } else {
        router.push(`/h/${encodeURIComponent(hostId)}`)
      }
    },
    [client, hostId, openChoice, router]
  )

  const startSession = useCallback(async () => {
    if (sessionBusy) {
      return
    }
    if (!client || !hostId) {
      onOpenForm()
      return
    }
    setSessionBusy(true)
    try {
      const outcome = await startQuickSession(client, Math.random)
      if (outcome.kind === 'needs-form') {
        onOpenForm()
      } else if (outcome.kind === 'failed') {
        triggerError()
        Alert.alert(
          t('home.quickStart.newSessionFailed', 'Couldn’t start a session'),
          outcome.uncertain
            ? t(
                'home.quickStart.newSessionUncertain',
                'The session may have been created. Check the list before trying again.'
              )
            : outcome.message
        )
      } else {
        triggerSuccess()
        router.push(
          hostNewWorktreeSessionRoute(hostId, outcome.worktreeId, outcome.name, outcome.warning)
        )
      }
    } catch {
      onOpenForm()
    } finally {
      if (mountedRef.current) {
        setSessionBusy(false)
      }
    }
  }, [client, hostId, onOpenForm, router, sessionBusy, t])

  return {
    client,
    /** The quick buttons need a live desktop; without one the + button's own hint explains. */
    available: connected,
    sessionBusy,
    launchSheet: {
      visible: sheet === 'launch' && focused,
      choices,
      onPick: (choice: LaunchFolderChoice) => closeThen(() => openChoice(choice)),
      onOpenAnother: () => closeThen(() => setSheet('new-project')),
      onClose: () => closeThen(null),
      onAfterClose: afterSheetClosed
    },
    newProjectSheet: {
      visible: sheet === 'new-project' && focused,
      onAdded: (project: AddedHostProject) => {
        triggerSuccess()
        closeThen(() => void openAddedProject(project))
      },
      onClose: () => closeThen(null),
      onAfterClose: afterSheetClosed
    },
    startSession: () => void startSession(),
    openNewProject: () => setSheet('new-project')
  }
}
