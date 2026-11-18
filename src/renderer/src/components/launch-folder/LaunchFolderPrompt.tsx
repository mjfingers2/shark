import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderOpen } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useTranslate } from '@/i18n/use-translate'
import { activateAndRevealWorktree } from '@/lib/workspace/activation/worktree-activation'
import { useAppStore } from '@/store'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { pickNewProject } from '../sidebar/one-click-start'
import { listLaunchFolderChoices } from '../../../../shared/launch-folder/launch-folder-choices'

// Once per app launch: sessionStorage survives a renderer reload but not a relaunch.
const SHOWN_KEY = 'shark.launchFolderPrompt.shown'

function wasShownThisLaunch(): boolean {
  try {
    return sessionStorage.getItem(SHOWN_KEY) === '1'
  } catch {
    return false
  }
}

function markShownThisLaunch(): void {
  try {
    sessionStorage.setItem(SHOWN_KEY, '1')
  } catch {
    // Without storage the prompt can reappear after a reload, which is harmless.
  }
}

/** Shark asks which folder to work in each time it starts, instead of dropping into the last one. */
export function LaunchFolderPrompt({ blocked }: { blocked: boolean }): React.JSX.Element | null {
  const t = useTranslate()
  const ready = useAppStore((s) => s.workspaceSessionReady)
  const { repos, worktreesByRepo } = useAppStore(
    useShallow((s) => ({ repos: s.repos, worktreesByRepo: selectWorktreesByRepo(s) }))
  )
  const [open, setOpen] = useState(false)
  const choices = useMemo(
    () => listLaunchFolderChoices(repos, worktreesByRepo),
    [repos, worktreesByRepo]
  )

  useEffect(() => {
    if (ready && !blocked && !wasShownThisLaunch()) {
      markShownThisLaunch()
      setOpen(true)
    }
  }, [ready, blocked])

  if (!open) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('shark.launchFolder.title', 'Which folder do you want to work in?')}
          </DialogTitle>
          <DialogDescription>
            {choices.length > 0
              ? t('shark.launchFolder.description', 'Pick a recent folder or open another one.')
              : t('shark.launchFolder.descriptionEmpty', 'Open a folder to start.')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {choices.map((choice) => (
            <button
              key={choice.repoId}
              type="button"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                setOpen(false)
                activateAndRevealWorktree(choice.worktreeId)
              }}
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{choice.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{choice.path}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            className="mt-1 flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => {
              setOpen(false)
              pickNewProject()
            }}
          >
            <FolderOpen className="size-4" />
            {t('shark.launchFolder.pickOther', 'Open another folder')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
