/** One row in Shark's launch prompt: a project folder and the session to reopen in it. */
export type LaunchFolderChoice = {
  repoId: string
  name: string
  path: string
  worktreeId: string
  lastActivityAt: number
}

type RepoLike = { id: string; path: string; displayName: string; addedAt: number }
type WorktreeLike = { id: string; isArchived: boolean; lastActivityAt: number }

/**
 * Recent project folders, newest first. Each opens its most recently used live session;
 * a project with no live session has nothing to reopen, so it is left out.
 */
export function listLaunchFolderChoices(
  repos: readonly RepoLike[],
  worktreesByRepo: Readonly<Record<string, readonly WorktreeLike[] | undefined>>,
  limit = 6
): LaunchFolderChoice[] {
  const choices: LaunchFolderChoice[] = []
  for (const repo of repos) {
    let newest: WorktreeLike | null = null
    for (const worktree of worktreesByRepo[repo.id] ?? []) {
      if (!worktree.isArchived && (!newest || worktree.lastActivityAt > newest.lastActivityAt)) {
        newest = worktree
      }
    }
    if (newest) {
      choices.push({
        repoId: repo.id,
        name: repo.displayName,
        path: repo.path,
        worktreeId: newest.id,
        lastActivityAt: Math.max(newest.lastActivityAt, repo.addedAt)
      })
    }
  }
  return choices
    .sort((left, right) => right.lastActivityAt - left.lastActivityAt)
    .slice(0, Math.max(0, limit))
}
