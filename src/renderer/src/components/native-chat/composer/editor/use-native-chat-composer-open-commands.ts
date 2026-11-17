import { useCallback } from 'react'
import type { NativeChatComposerInput } from './native-chat-composer-input'

/** Types a slash at the caret so the command picker opens, as if the user had typed it. */
export function useNativeChatComposerOpenCommands(
  textareaRef: React.RefObject<NativeChatComposerInput | null>
): () => void {
  return useCallback(() => {
    const input = textareaRef.current
    if (!input || input.disabled || !input.insertText) {
      return
    }
    input.focus()
    const before = input.value.slice(0, input.selectionStart ?? input.value.length)
    // The picker opens only on a slash that starts a word.
    input.insertText(before === '' || /\s$/.test(before) ? '/' : ' /')
  }, [textareaRef])
}
