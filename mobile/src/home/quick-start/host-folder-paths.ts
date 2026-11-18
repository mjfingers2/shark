import type { FilesystemPathFlavor } from '../../../../src/shared/file-access/filesystem-path-flavor'

type BrowsedEntry = { name: string; isDirectory: boolean }

const WIN32_DRIVE_ROOT = /^[A-Za-z]:\\?$/
// One collator for the whole sort: building the options per comparison repeats setup every time.
const FOLDER_NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' })

/** The folders a project can be picked from, by name; hidden ones (.git, .cache) stay out of the way. */
export function listChildFolderNames(entries: readonly BrowsedEntry[]): string[] {
  return entries
    .filter((entry) => entry.isDirectory && entry.name !== '' && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(FOLDER_NAME_COLLATOR.compare)
}

export function childFolderPath(dir: string, name: string, flavor: FilesystemPathFlavor): string {
  const separator = flavor === 'win32' ? '\\' : '/'
  return dir.endsWith(separator) ? `${dir}${name}` : `${dir}${separator}${name}`
}

/** One folder up, or null at the top of the disk. */
export function parentFolderPath(dir: string, flavor: FilesystemPathFlavor): string | null {
  if (flavor === 'win32') {
    const path = dir.replaceAll('/', '\\').replace(/\\+$/, '')
    if (path === '' || WIN32_DRIVE_ROOT.test(path)) {
      return null
    }
    const parent = path.slice(0, path.lastIndexOf('\\'))
    if (/^[A-Za-z]:$/.test(parent)) {
      return `${parent}\\`
    }
    return parent.replace(/\\+$/, '') === '' ? null : parent
  }
  const path = dir.replace(/\/+$/, '')
  if (path === '') {
    return null
  }
  const cut = path.lastIndexOf('/')
  return cut <= 0 ? '/' : path.slice(0, cut)
}

/** repo.add refuses a folder without Git this way; such a folder is added as a plain folder project. */
export function isNotGitRepositoryError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Not a valid git repository')
}
