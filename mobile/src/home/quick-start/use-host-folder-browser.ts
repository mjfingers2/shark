import { useCallback, useEffect, useRef, useState } from 'react'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import {
  addHostProject,
  browseHostFolder,
  type AddedHostProject,
  type HostFolderListing
} from './host-projects'
import { childFolderPath, parentFolderPath } from './host-folder-paths'

/** The new-project sheet's walk through the desktop's folders, starting at its home folder. */
export function useHostFolderBrowser(client: RpcClient | null, visible: boolean) {
  const [listing, setListing] = useState<HostFolderListing | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Only the latest folder tapped may land; a slow earlier listing must not replace it.
  const requestRef = useRef(0)

  const load = useCallback(
    (path: string) => {
      if (!client) {
        return
      }
      const request = ++requestRef.current
      setLoading(true)
      setError(null)
      void browseHostFolder(client, path)
        .then((next) => {
          if (request === requestRef.current) {
            setListing(next)
          }
        })
        .catch((cause: unknown) => {
          if (request === requestRef.current) {
            setError(cause instanceof Error ? cause.message : String(cause))
          }
        })
        .finally(() => {
          if (request === requestRef.current) {
            setLoading(false)
          }
        })
    },
    [client]
  )

  useEffect(() => {
    if (visible) {
      load('')
    } else {
      requestRef.current += 1
      setListing(null)
      setError(null)
      setLoading(false)
    }
  }, [load, visible])

  const parentPath = listing ? parentFolderPath(listing.path, listing.flavor) : null

  const openChild = useCallback(
    (name: string) => {
      if (listing) {
        load(childFolderPath(listing.path, name, listing.flavor))
      }
    },
    [listing, load]
  )

  const openParent = useCallback(() => {
    if (parentPath) {
      load(parentPath)
    }
  }, [load, parentPath])

  const addCurrent = useCallback(async (): Promise<AddedHostProject | null> => {
    if (!client || !listing || adding) {
      return null
    }
    setAdding(true)
    setError(null)
    try {
      return await addHostProject(client, listing.path)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return null
    } finally {
      setAdding(false)
    }
  }, [adding, client, listing])

  return {
    listing,
    loading,
    adding,
    error,
    hasParent: parentPath !== null,
    openChild,
    openParent,
    addCurrent
  }
}
