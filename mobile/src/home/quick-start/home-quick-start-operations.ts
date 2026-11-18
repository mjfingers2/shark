import * as z from 'zod'
import { bindDeferredRpcOperation, defineRpcOperation } from '../../transport/rpc/rpc-operation'
import { rpcResultVariant } from '../../transport/rpc/rpc-operation-result-reader'

const hostFolderListingSchema = z.object({
  resolvedPath: z.string(),
  entries: z.array(z.object({ name: z.string(), isDirectory: z.boolean() })),
  pathFlavor: z.enum(['posix', 'win32']).catch('posix')
})

// The phone's folder picker walks the desktop's disk; a refusal (no such folder) is shown to the user.
export const hostFolderBrowseRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'files.browse-host-folder',
    method: 'files.browseServerDir',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('host-folder-listing', hostFolderListingSchema)
  })
)

const addedRepoSchema = z.object({
  repo: z.object({ id: z.string(), path: z.string(), displayName: z.string().optional() })
})

export const repoAddRun = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'repo.add-from-phone',
    method: 'repo.add',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('added-repo', addedRepoSchema)
  })
)
