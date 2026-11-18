import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../src/shared/execution-host'
import {
  listLaunchFolderChoices,
  type LaunchFolderChoice
} from '../../../../src/shared/launch-folder/launch-folder-choices'

/** A repo.list row as the phone reads it; older hosts may omit any field but the id. */
export type HomeLaunchRepo = {
  id: string
  path?: string
  displayName?: string
  addedAt?: number
  connectionId?: string | null
  executionHostId?: ExecutionHostId | null
}

/** The worktree.ps fields the launch prompt reads. */
export type HomeLaunchRow = {
  worktreeId: string
  repoId: string
  isArchived?: boolean
  lastActivityAt?: number
}

type ChoiceRepo = { id: string; path: string; displayName: string; addedAt: number }

function folderName(path: string): string {
  return path.split(/[\\/]/).findLast(Boolean) ?? path
}

// Only the desktop's own projects: SSH and server ones open through another host's client.
function listLocalRepos(repos: readonly HomeLaunchRepo[]): ChoiceRepo[] {
  return repos.flatMap((repo) =>
    repo.path && getRepoExecutionHostId(repo) === LOCAL_EXECUTION_HOST_ID
      ? [
          {
            id: repo.id,
            path: repo.path,
            displayName: repo.displayName || folderName(repo.path),
            addedAt: repo.addedAt ?? 0
          }
        ]
      : []
  )
}

/** Recent project folders on one desktop, newest first, each with the session it reopens. */
export function listHomeLaunchChoices(
  repos: readonly HomeLaunchRepo[],
  rows: readonly HomeLaunchRow[],
  limit = 6
): LaunchFolderChoice[] {
  const byRepo = new Map<string, { id: string; isArchived: boolean; lastActivityAt: number }[]>()
  for (const row of rows) {
    const list = byRepo.get(row.repoId) ?? []
    list.push({
      id: row.worktreeId,
      isArchived: row.isArchived === true,
      lastActivityAt: row.lastActivityAt ?? 0
    })
    byRepo.set(row.repoId, list)
  }
  return listLaunchFolderChoices(listLocalRepos(repos), Object.fromEntries(byRepo), limit)
}

/** The project a one-tap session starts in: the most recently active one, else the newest added. */
export function pickQuickSessionRepoId(
  repos: readonly HomeLaunchRepo[],
  rows: readonly HomeLaunchRow[]
): string | null {
  const [recent] = listHomeLaunchChoices(repos, rows, 1)
  if (recent) {
    return recent.repoId
  }
  let newest: ChoiceRepo | null = null
  for (const repo of listLocalRepos(repos)) {
    if (!newest || repo.addedAt > newest.addedAt) {
      newest = repo
    }
  }
  return newest?.id ?? null
}
