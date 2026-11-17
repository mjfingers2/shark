import { useEffect, useRef } from 'react'

const SHARK_GRAB_REQUEST_EVENT = 'shark:browser-annotate-request'

/** Ask a browser page to start its pick-an-element-and-comment tool, from outside its pane. */
export function requestBrowserPageAnnotate(browserPageId: string): void {
  window.dispatchEvent(new CustomEvent(SHARK_GRAB_REQUEST_EVENT, { detail: { browserPageId } }))
}

/** The page's toolbar listens, so the titlebar button and ⌘⇧C start the same tool. */
export function useBrowserPageAnnotateRequests(
  browserPageId: string,
  startAnnotate: () => void
): void {
  // The toolbar passes a fresh callback each render; keep the listener and read the latest one.
  const startRef = useRef(startAnnotate)
  startRef.current = startAnnotate
  useEffect(() => {
    const onRequest = (event: Event): void => {
      if (
        (event as CustomEvent<{ browserPageId?: string }>).detail?.browserPageId === browserPageId
      ) {
        startRef.current()
      }
    }
    window.addEventListener(SHARK_GRAB_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(SHARK_GRAB_REQUEST_EVENT, onRequest)
  }, [browserPageId])
}
