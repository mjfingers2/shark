import { describe, expect, it, vi } from 'vitest'
import { mediaPickResultSchema } from '../bridge/native-capabilities/bridge-media-verbs'
import { createBrowserNativeVerbs, type BrowserNativeVerbDeps } from './browser-native-verbs'

function deps(overrides: Partial<BrowserNativeVerbDeps> = {}): BrowserNativeVerbDeps {
  return {
    isSecureContext: false,
    writeClipboardText: vi.fn(() => Promise.resolve()),
    copyWithTextarea: vi.fn(() => true),
    pickFiles: vi.fn(() => Promise.resolve([])),
    openBlankWindow: vi.fn(() => null),
    downloadPdf: vi.fn(() => Promise.resolve(new Blob(['%PDF']))),
    createObjectUrl: () => 'blob:http://tab/1',
    readWorkspaceKey: () => Promise.resolve(null),
    now: () => 1_000,
    ...overrides
  }
}

describe('browser native verbs', () => {
  it('copies through the textarea on an insecure (http) page', async () => {
    const used = deps()
    const verbs = createBrowserNativeVerbs(used)
    await expect(
      verbs.serve('native.clipboard.write', { mime: 'text', value: 'hello' })
    ).resolves.toEqual({ written: true })
    expect(used.writeClipboardText).not.toHaveBeenCalled()
    expect(used.copyWithTextarea).toHaveBeenCalledWith('hello')
  })

  it('uses the async clipboard on a secure page, falling back when it refuses', async () => {
    const secure = deps({ isSecureContext: true })
    await createBrowserNativeVerbs(secure).serve('native.clipboard.write', {
      mime: 'text',
      value: 'a'
    })
    expect(secure.writeClipboardText).toHaveBeenCalledWith('a')
    expect(secure.copyWithTextarea).not.toHaveBeenCalled()
    const refusing = deps({
      isSecureContext: true,
      writeClipboardText: () => Promise.reject(new Error('NotAllowedError')),
      copyWithTextarea: () => false
    })
    await expect(
      createBrowserNativeVerbs(refusing).serve('native.clipboard.write', {
        mime: 'text',
        value: 'a'
      })
    ).resolves.toEqual({ written: false })
  })

  it('refuses clipboard reads and microphone capture', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const verbs = createBrowserNativeVerbs(deps())
    await expect(verbs.serve('native.clipboard.read', { mime: 'text' })).rejects.toMatchObject({
      code: 'native_verb_failed'
    })
    // The page's "unavailable" answer, not a fault: dictation shows its own fallback.
    await expect(verbs.serve('native.audio.start', { sampleRate: 16_000 })).resolves.toEqual({
      started: false,
      sampleRate: 16_000,
      permission: 'granted'
    })
    await expect(verbs.serve('native.audio.read', { maxBytes: 1024 })).rejects.toMatchObject({
      code: 'native_audio_not_capturing'
    })
    await expect(verbs.serve('native.audio.stop', {})).resolves.toEqual({
      stopped: false,
      base64: '',
      droppedBytes: 0
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTPS'))
    warn.mockRestore()
  })

  it('stages picked files behind handles and reads them in chunks', async () => {
    const file = Object.assign(new Blob(['hello world'], { type: 'text/plain' }), {
      name: 'notes.txt'
    })
    const used = deps({ pickFiles: vi.fn(() => Promise.resolve([file])) })
    const verbs = createBrowserNativeVerbs(used)
    const picked = mediaPickResultSchema.parse(
      await verbs.serve('native.media.pick', {
        source: 'files',
        multiple: false
      })
    )
    expect(used.pickFiles).toHaveBeenCalledWith('', false)
    expect(picked.items).toHaveLength(1)
    const [item] = picked.items
    expect(item).toMatchObject({ mime: 'text/plain', byteLength: 11 })
    await expect(
      verbs.serve('native.media.read', {
        handle: item!.handle,
        offset: 6,
        length: 100
      })
    ).resolves.toEqual({ base64: btoa('world'), eof: true })
    await expect(verbs.serve('native.media.name', { handle: item!.handle })).resolves.toEqual({
      name: 'notes.txt'
    })
    await expect(verbs.serve('native.media.release', { handle: item!.handle })).resolves.toEqual({
      released: true
    })
    await expect(
      verbs.serve('native.media.read', {
        handle: item!.handle,
        offset: 0,
        length: 1
      })
    ).rejects.toMatchObject({ code: 'native_media_handle_unknown' })
  })

  it('answers an empty pick for the clipboard source', async () => {
    const used = deps()
    await expect(
      createBrowserNativeVerbs(used).serve('native.media.pick', {
        source: 'clipboard',
        multiple: false
      })
    ).resolves.toEqual({ items: [] })
    expect(used.pickFiles).not.toHaveBeenCalled()
  })

  it('refuses a PDF when the browser blocks the new tab, and points an opened tab at the file', async () => {
    const blocked = createBrowserNativeVerbs(deps())
    const params = {
      action: 'open',
      worktreeId: 'wt-1',
      relativePath: 'docs/a.pdf'
    }
    await expect(blocked.serve('native.pdf.view', params)).rejects.toMatchObject({
      code: 'native_pdf_no_viewer'
    })
    const viewer = { location: { href: '' }, close: vi.fn() }
    const opened = deps({ openBlankWindow: () => viewer })
    await expect(
      createBrowserNativeVerbs(opened).serve('native.pdf.view', params)
    ).resolves.toEqual({})
    expect(viewer.location.href).toBe('blob:http://tab/1')
    expect(opened.downloadPdf).toHaveBeenCalledWith(
      { worktreeId: 'wt-1', relativePath: 'docs/a.pdf' },
      expect.any(AbortSignal)
    )
  })

  it('closes the opened tab when the download fails', async () => {
    const viewer = { location: { href: '' }, close: vi.fn() }
    const verbs = createBrowserNativeVerbs(
      deps({
        openBlankWindow: () => viewer,
        downloadPdf: () => Promise.reject(new Error('gone'))
      })
    )
    await expect(
      verbs.serve('native.pdf.view', {
        action: 'open',
        worktreeId: 'w',
        relativePath: 'a.pdf'
      })
    ).rejects.toThrow('gone')
    expect(viewer.close).toHaveBeenCalled()
  })
})
