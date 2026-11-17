import { describe, expect, it } from 'vitest'
import type { WorkspacePort } from '../../../../shared/workspace-ports'
import {
  AUTO_PREVIEW_MAX_PROBES,
  createAutoPreviewTracker,
  hasBrowserTabForOrigin,
  markAutoPreviewHandled,
  newAutoPreviewPorts,
  noteAutoPreviewMiss
} from './workspace-port-auto-preview'

function port(num: number, worktreeId = 'repo::/wt/a', processName = 'node'): WorkspacePort {
  return {
    id: `${worktreeId}-${num}`,
    kind: 'workspace',
    bindHost: '127.0.0.1',
    connectHost: 'localhost',
    port: num,
    pid: 100 + num,
    processName,
    protocol: 'http',
    owner: { worktreeId, repoId: 'repo', displayName: 'a', path: '/wt/a', confidence: 'cwd' }
  }
}

describe('newAutoPreviewPorts', () => {
  it('skips servers that were already running when the app opened', () => {
    const tracker = createAutoPreviewTracker()
    expect(newAutoPreviewPorts(tracker, [port(3000)])).toEqual([])
    expect(newAutoPreviewPorts(tracker, [port(3000)])).toEqual([])
  })

  it('offers a server that starts later, once', () => {
    const tracker = createAutoPreviewTracker()
    newAutoPreviewPorts(tracker, [])
    const [fresh] = newAutoPreviewPorts(tracker, [port(5173)])
    expect(fresh?.port).toBe(5173)
    markAutoPreviewHandled(tracker, fresh as never)
    expect(newAutoPreviewPorts(tracker, [port(5173)])).toEqual([])
  })

  it('offers a server again after it stopped and started', () => {
    const tracker = createAutoPreviewTracker()
    newAutoPreviewPorts(tracker, [port(5173)])
    newAutoPreviewPorts(tracker, [])
    expect(newAutoPreviewPorts(tracker, [port(5173)])).toHaveLength(1)
  })

  it('ignores the app itself and listeners outside a session', () => {
    const tracker = createAutoPreviewTracker()
    newAutoPreviewPorts(tracker, [])
    const external: WorkspacePort = { ...port(9000), kind: 'external' } as WorkspacePort
    expect(newAutoPreviewPorts(tracker, [port(9492, 'repo::/wt/a', 'Electron'), external])).toEqual(
      []
    )
  })

  it('gives up on a listener that never serves a page', () => {
    const tracker = createAutoPreviewTracker()
    newAutoPreviewPorts(tracker, [])
    const db = port(5432) as WorkspacePort & { kind: 'workspace' }
    for (let i = 1; i < AUTO_PREVIEW_MAX_PROBES; i += 1) {
      expect(noteAutoPreviewMiss(tracker, db)).toBe(false)
    }
    expect(noteAutoPreviewMiss(tracker, db)).toBe(true)
    expect(newAutoPreviewPorts(tracker, [db])).toEqual([])
  })
})

describe('hasBrowserTabForOrigin', () => {
  it('treats localhost and 127.0.0.1 as the same server', () => {
    expect(hasBrowserTabForOrigin(['http://127.0.0.1:5173/about'], 'http://localhost:5173')).toBe(
      true
    )
    expect(hasBrowserTabForOrigin(['http://localhost:3000/'], 'http://localhost:5173')).toBe(false)
  })
})
