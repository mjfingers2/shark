import {
  clipboardWriteParamsSchema,
  pdfViewParamsSchema,
  storageReadParamsSchema,
  type BridgeNativeVerb,
  type BridgePdfOpenParams
} from '../bridge/native-capabilities/bridge-native-verbs'
import {
  BRIDGE_MEDIA_NAME_MAX_CHARS,
  mediaNameParamsSchema,
  mediaPickParamsSchema,
  mediaReadParamsSchema,
  mediaReleaseParamsSchema
} from '../bridge/native-capabilities/bridge-media-verbs'
import { audioStartParamsSchema } from '../bridge/native-capabilities/bridge-audio-verbs'
import { BridgeNativeVerbRefusedError } from '../host-bridge/bridge-host-errors'
import { MediaHandleRegistry } from '../native-capabilities/media-handle-registry'
import { CLIPBOARD_IMAGE_MAX_SOURCE_BYTES } from '../../../../src/shared/clipboard-image'
import { encodeBase64Bytes } from '../../transport/encryption/base64-byte-codec'

/** A picked file as the browser hands it over; only what staging reads. */
export type BrowserPickedFile = Blob & { readonly name?: string }

/** The tab a PDF opens in: opened blank during the tap, pointed at the file once it arrives. */
export type BrowserViewerWindow = {
  location: { href: string }
  close: () => void
}

export type BrowserNativeVerbDeps = {
  // http:// on a LAN address is not secure: async clipboard and microphone are unavailable there.
  isSecureContext: boolean
  writeClipboardText: ((text: string) => Promise<void>) | null
  // The pre-async-clipboard path; true when the browser reported the copy succeeded.
  copyWithTextarea: (text: string) => boolean
  pickFiles: (accept: string, multiple: boolean) => Promise<readonly BrowserPickedFile[]>
  openBlankWindow: () => BrowserViewerWindow | null
  downloadPdf: (params: BridgePdfOpenParams, signal: AbortSignal) => Promise<Blob>
  createObjectUrl: (blob: Blob) => string
  readWorkspaceKey: (key: string) => Promise<string | null>
  now: () => number
}

function refuse(
  code: ConstructorParameters<typeof BridgeNativeVerbRefusedError>[0],
  why: string
): never {
  throw new BridgeNativeVerbRefusedError(code, why)
}

/**
 * The device verbs a browser tab can stand in for. The host already validated params against the
 * verb table and the session's grants; each reply is validated again against its result schema.
 * Verbs the tab cannot honour refuse (clipboard read) or answer the page's own "unavailable"
 * shape (microphone), so the page shows its existing fallback rather than a fault.
 */
export function createBrowserNativeVerbs(deps: BrowserNativeVerbDeps): {
  serve: (verb: BridgeNativeVerb, params: unknown) => Promise<unknown>
  dispose: () => void
} {
  const files = new Map<string, BrowserPickedFile>()
  let minted = 0
  const registry = new MediaHandleRegistry({
    now: deps.now,
    discard: (uri) => {
      files.delete(uri)
    }
  })
  let pdfDownload: AbortController | null = null

  async function writeClipboard(value: string): Promise<{ written: boolean }> {
    if (deps.isSecureContext && deps.writeClipboardText !== null) {
      try {
        await deps.writeClipboardText(value)
        return { written: true }
      } catch {
        // Safari refuses without a fresh gesture; the textarea path sometimes still works.
      }
    }
    return { written: deps.copyWithTextarea(value) }
  }

  async function pickMedia(params: unknown): Promise<unknown> {
    const { source, multiple } = mediaPickParamsSchema.parse(params)
    // A tab cannot read images off the clipboard without a paste event; answer "nothing there".
    if (source === 'clipboard') {
      return { items: [] }
    }
    const room = registry.remainingCapacity()
    if (room <= 0) {
      refuse('native_media_handle_cap', 'release a staged item before picking again')
    }
    const picked = await deps.pickFiles(source === 'library' ? 'image/*' : '', multiple)
    if (picked.length > room) {
      refuse('native_media_handle_cap', `that pick holds ${String(picked.length)} items`)
    }
    // Refuse the whole pick before staging any of it, as the app does.
    const oversized = picked.find((file) => file.size > CLIPBOARD_IMAGE_MAX_SOURCE_BYTES)
    if (oversized !== undefined) {
      refuse('native_media_too_large', `a picked item is ${String(oversized.size)} bytes`)
    }
    const staged = picked.map((file) => {
      minted += 1
      const uri = `browser-file:${String(minted)}`
      files.set(uri, file)
      const name = file.name?.slice(0, BRIDGE_MEDIA_NAME_MAX_CHARS)
      return {
        uri,
        mime: file.type === '' ? 'application/octet-stream' : file.type,
        byteLength: file.size,
        ...(name ? { name } : {})
      }
    })
    return { items: registry.mint(staged) }
  }

  async function readMedia(params: unknown): Promise<unknown> {
    const { handle, offset, length } = mediaReadParamsSchema.parse(params)
    const range = registry.read(handle, offset, length)
    const file = files.get(range.uri)
    if (file === undefined) {
      refuse('native_media_handle_unknown', 'this session holds no staged item under that handle')
    }
    const bytes = new Uint8Array(await file.slice(range.start, range.end).arrayBuffer())
    return { base64: encodeBase64Bytes(bytes), eof: range.eof }
  }

  async function viewPdf(params: unknown): Promise<unknown> {
    const request = pdfViewParamsSchema.parse(params)
    pdfDownload?.abort()
    pdfDownload = null
    if (request.action === 'cancel') {
      return {}
    }
    const { action: _action, ...open } = request
    // Open the tab now, while the tap still counts as a gesture; a window opened after the download
    // would be blocked as a pop-up.
    const viewer = deps.openBlankWindow()
    if (viewer === null) {
      refuse('native_pdf_no_viewer', 'the browser blocked opening a new tab')
    }
    const controller = new AbortController()
    pdfDownload = controller
    try {
      const blob = await deps.downloadPdf(open, controller.signal)
      if (controller.signal.aborted) {
        throw new Error('the PDF open was cancelled')
      }
      viewer.location.href = deps.createObjectUrl(blob)
      return {}
    } catch (error) {
      viewer.close()
      throw error
    } finally {
      if (pdfDownload === controller) {
        pdfDownload = null
      }
    }
  }

  async function serve(verb: BridgeNativeVerb, params: unknown): Promise<unknown> {
    switch (verb) {
      case 'native.clipboard.write':
        return writeClipboard(clipboardWriteParamsSchema.parse(params).value)
      case 'native.clipboard.read':
        return refuse('native_verb_failed', 'a browser tab cannot read the clipboard for the page')
      case 'native.media.pick':
        return pickMedia(params)
      case 'native.media.read':
        return readMedia(params)
      case 'native.media.release':
        return {
          released: registry.release(mediaReleaseParamsSchema.parse(params).handle)
        }
      case 'native.media.name':
        return {
          name: registry.name(mediaNameParamsSchema.parse(params).handle)
        }
      case 'native.audio.start': {
        // getUserMedia needs a secure context, and this tab's shell has no capture ring either way.
        console.warn(
          '[browser-shell] dictation needs the Shark app; the microphone is not available in this tab' +
            (deps.isSecureContext ? '' : ' (it also needs HTTPS)')
        )
        const { sampleRate } = audioStartParamsSchema.parse(params)
        return { started: false, sampleRate, permission: 'granted' }
      }
      case 'native.audio.read':
        return refuse('native_audio_not_capturing', 'no capture is running in this tab')
      case 'native.audio.stop':
        return { stopped: false, base64: '', droppedBytes: 0 }
      case 'native.storage.read':
        return {
          value: await deps.readWorkspaceKey(storageReadParamsSchema.parse(params).key)
        }
      case 'native.pdf.view':
        return viewPdf(params)
      case 'native.speech.act':
      case 'native.a11y.announce':
      case 'native.image.act':
      case 'native.store.rows':
        // Withheld from this tab's grants, so the host refuses before reaching here.
        return refuse('native_verb_failed', `${verb} is not served in a browser tab`)
    }
  }

  return {
    serve,
    dispose: () => {
      pdfDownload?.abort()
      registry.releaseAll()
    }
  }
}
