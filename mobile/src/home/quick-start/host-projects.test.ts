import { describe, expect, it, vi } from 'vitest'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import type { RpcResponse } from '../../transport/rpc/rpc-wire-types'
import { addHostProject, browseHostFolder } from './host-projects'

type Reply = { result: unknown } | { error: string }

function fakeClient(answer: (method: string, params: unknown) => Reply) {
  const sendRequest = vi.fn(async (method: string, params?: unknown): Promise<RpcResponse> => {
    const reply = answer(method, params)
    return 'error' in reply
      ? { id: 'r', ok: false, error: { code: 'runtime_error', message: reply.error } }
      : { id: 'r', ok: true, result: reply.result }
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: these calls only send requests.
  return { client: { sendRequest } as unknown as RpcClient, sendRequest }
}

describe('addHostProject', () => {
  it('adds a Git checkout as a Git project', async () => {
    const { client, sendRequest } = fakeClient(() => ({
      result: { repo: { id: 'r1', path: '/Users/me/game', displayName: 'game' } }
    }))
    await expect(addHostProject(client, '/Users/me/game')).resolves.toEqual({
      repoId: 'r1',
      name: 'game',
      kind: 'git'
    })
    expect(sendRequest).toHaveBeenCalledTimes(1)
    expect(sendRequest.mock.calls[0]?.[1]).toEqual({ path: '/Users/me/game', kind: 'git' })
  })

  it('adds a folder without Git as a plain folder project', async () => {
    const { client, sendRequest } = fakeClient((_method, params) =>
      Object(params).kind === 'git'
        ? { error: 'Not a valid git repository: /Users/me/notes' }
        : { result: { repo: { id: 'r2', path: '/Users/me/notes' } } }
    )
    await expect(addHostProject(client, '/Users/me/notes')).resolves.toEqual({
      repoId: 'r2',
      name: '/Users/me/notes',
      kind: 'folder'
    })
    expect(sendRequest.mock.calls.map((call) => Object(call[1]).kind)).toEqual(['git', 'folder'])
  })

  it('passes any other refusal on without retrying', async () => {
    const { client, sendRequest } = fakeClient(() => ({ error: 'Folder does not exist: /gone' }))
    await expect(addHostProject(client, '/gone')).rejects.toThrow('Folder does not exist')
    expect(sendRequest).toHaveBeenCalledTimes(1)
  })
})

describe('browseHostFolder', () => {
  it('lists the visible sub-folders of the folder the desktop resolved', async () => {
    const { client, sendRequest } = fakeClient(() => ({
      result: {
        resolvedPath: '/Users/me',
        pathFlavor: 'posix',
        entries: [
          { name: 'b', isDirectory: true, isSymlink: false },
          { name: '.ssh', isDirectory: true, isSymlink: false },
          { name: 'a.txt', isDirectory: false, isSymlink: false },
          { name: 'A', isDirectory: true, isSymlink: false }
        ]
      }
    }))
    await expect(browseHostFolder(client, '')).resolves.toEqual({
      path: '/Users/me',
      flavor: 'posix',
      folders: ['A', 'b']
    })
    expect(sendRequest.mock.calls[0]?.slice(0, 2)).toEqual(['files.browseServerDir', { path: '' }])
  })

  it('surfaces the desktop’s refusal', async () => {
    const { client } = fakeClient(() => ({ error: '/nope is not a directory' }))
    await expect(browseHostFolder(client, '/nope')).rejects.toThrow('not a directory')
  })
})
