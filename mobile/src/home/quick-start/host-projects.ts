import type { FilesystemPathFlavor } from '../../../../src/shared/file-access/filesystem-path-flavor'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { readWorktreeCatalogSnapshot } from '../../worktree/catalog/worktree-catalog-snapshot-client'
import { listHostRepos } from '../../worktree/repositories/server-repos'
import type { Worktree } from '../../worktree/workspace-list/workspace-list-types'
import type { HomeLaunchRepo } from './home-launch-choices'
import { hostFolderBrowseRead, repoAddRun } from './home-quick-start-operations'
import { isNotGitRepositoryError, listChildFolderNames } from './host-folder-paths'

/** One desktop's projects and sessions, read fresh. */
export type HostLaunchState = { repos: HomeLaunchRepo[]; rows: Worktree[] }

export type HostFolderListing = { path: string; flavor: FilesystemPathFlavor; folders: string[] }

export type AddedHostProject = { repoId: string; name: string; kind: 'git' | 'folder' }

const BROWSE_TIMEOUT_MS = 15_000

/** Null when the desktop could not list its projects. */
export async function readHostLaunchState(client: RpcClient): Promise<HostLaunchState | null> {
  const [repos, catalog] = await Promise.all([
    listHostRepos<HomeLaunchRepo>(client),
    readWorktreeCatalogSnapshot(client, undefined)
  ])
  return repos ? { repos, rows: catalog.worktrees } : null
}

/** An empty path lists the desktop user's home folder. */
export async function browseHostFolder(
  client: RpcClient,
  path: string
): Promise<HostFolderListing> {
  const listing = hostFolderBrowseRead.interpret(
    await hostFolderBrowseRead.request(client, { path }, { timeoutMs: BROWSE_TIMEOUT_MS })
  )
  return {
    path: listing.resolvedPath,
    flavor: listing.pathFlavor,
    folders: listChildFolderNames(listing.entries)
  }
}

/** Adds a Git checkout as a Git project, and any other folder as a plain folder project, as the desktop does. */
export async function addHostProject(client: RpcClient, path: string): Promise<AddedHostProject> {
  const add = async (kind: 'git' | 'folder'): Promise<AddedHostProject> => {
    const { repo } = repoAddRun.interpret(await repoAddRun.request(client, { path, kind }))
    return { repoId: repo.id, name: repo.displayName || repo.path, kind }
  }
  try {
    return await add('git')
  } catch (error) {
    if (!isNotGitRepositoryError(error)) {
      throw error
    }
  }
  return add('folder')
}
