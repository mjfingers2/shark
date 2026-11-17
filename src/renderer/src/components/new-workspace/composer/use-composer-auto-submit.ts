import { useEffect, useRef } from 'react'

// One-click "new session" waits this long for the defaults to settle before showing the composer.
const AUTO_SUBMIT_REVEAL_MS = 5000

/**
 * Submits the composer once with its defaults as soon as creation is allowed.
 * If the defaults never become ready (no project, agent still loading), it hands
 * the composer back to the user instead of leaving an invisible dialog open.
 */
export function useComposerAutoSubmit(
  autoSubmit: boolean | undefined,
  createDisabled: boolean,
  submit: () => Promise<void>,
  onStalled: () => void
): void {
  const enabled = autoSubmit === true
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!enabled || submittedRef.current || createDisabled) {
      return
    }
    submittedRef.current = true
    void submit()
  }, [createDisabled, enabled, submit])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const timer = window.setTimeout(() => {
      if (!submittedRef.current) {
        onStalled()
      }
    }, AUTO_SUBMIT_REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, onStalled])
}
