import { PDF_MIME_TYPE } from '../../files/media/mobile-file-media'
import {
  downloadMobileFileMedia,
  type MobileMediaSink
} from '../../files/media/mobile-file-media-download'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { scopeRpcClientToExecutionHost } from '../../worktree/execution-hosts/execution-host-scoped-rpc-client'
import type { BrowserNativeVerbDeps, BrowserPickedFile } from './browser-native-verbs'

// The DOM half of the browser shell's device verbs; everything here only touches the browser.

function copyWithTextarea(doc: Document, text: string): boolean {
  const field = doc.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  doc.body.append(field)
  const active = doc.activeElement
  field.select()
  field.setSelectionRange(0, text.length)
  let copied = false
  try {
    // execCommand is deprecated but is the only copy a non-secure (http) page has.
    copied = doc.execCommand('copy')
  } catch {
    copied = false
  }
  field.remove()
  if (active instanceof HTMLElement) {
    active.focus()
  }
  return copied
}

function pickFiles(
  doc: Document,
  accept: string,
  multiple: boolean
): Promise<readonly BrowserPickedFile[]> {
  return new Promise((resolve) => {
    const input = doc.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    if (accept !== '') {
      input.accept = accept
    }
    input.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0'
    const settle = (picked: readonly BrowserPickedFile[]) => {
      input.remove()
      resolve(picked)
    }
    input.addEventListener('change', () => settle([...(input.files ?? [])]), {
      once: true
    })
    // Safari 16.4+ reports a dismissed picker; older ones leave this pick pending until the next.
    input.addEventListener('cancel', () => settle([]), { once: true })
    doc.body.append(input)
    input.click()
  })
}

function blobSink(chunks: Uint8Array<ArrayBuffer>[]): MobileMediaSink {
  return {
    append: (bytes) => {
      chunks.push(bytes.slice())
    },
    finish: () => '',
    dispose: () => {
      chunks.length = 0
    }
  }
}

/** The real browser behind BrowserNativeVerbDeps, for the tab that installed the shell. */
export function createDomNativeVerbDeps(args: {
  win: Window
  readClient: () => RpcClient
  readWorkspaceKey: (key: string) => Promise<string | null>
}): BrowserNativeVerbDeps {
  const { win } = args
  // Absent outside secure contexts in some browsers, despite the DOM typings.
  const clipboard: Clipboard | undefined = win.navigator.clipboard
  return {
    isSecureContext: win.isSecureContext,
    writeClipboardText: clipboard === undefined ? null : (text) => clipboard.writeText(text),
    copyWithTextarea: (text) => copyWithTextarea(win.document, text),
    pickFiles: (accept, multiple) => pickFiles(win.document, accept, multiple),
    openBlankWindow: () => win.open('', '_blank'),
    downloadPdf: async ({ worktreeId, relativePath, executionHost }, signal) => {
      const client = args.readClient()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      await downloadMobileFileMedia(
        executionHost ? scopeRpcClientToExecutionHost(client, executionHost) : client,
        { worktreeId, relativePath, mimeType: PDF_MIME_TYPE },
        blobSink(chunks),
        signal,
        () => {}
      )
      return new Blob(chunks, { type: PDF_MIME_TYPE })
    },
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    readWorkspaceKey: args.readWorkspaceKey,
    now: () => Date.now()
  }
}

/** Calls `listener` each time the tab returns to view; returns the unsubscribe. */
export function onTabForeground(doc: Document, listener: () => void): () => void {
  const handle = () => {
    if (doc.visibilityState === 'visible') {
      listener()
    }
  }
  doc.addEventListener('visibilitychange', handle)
  return () => doc.removeEventListener('visibilitychange', handle)
}

/** Calls `listener` each time the tab is hidden; returns the unsubscribe. */
export function onTabBackground(doc: Document, listener: () => void): () => void {
  const handle = () => {
    if (doc.visibilityState === 'hidden') {
      listener()
    }
  }
  doc.addEventListener('visibilitychange', handle)
  return () => doc.removeEventListener('visibilitychange', handle)
}
