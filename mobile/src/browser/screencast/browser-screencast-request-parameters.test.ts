import { describe, expect, it } from 'vitest'
import { assembleMobileBrowserScreencastRequest } from './browser-screencast-request-parameters'

const IPAD_PANE = { width: 418, height: 760 }

describe('assembleMobileBrowserScreencastRequest', () => {
  it('asks for at least 30 pictures a second, so a game in the tab moves smoothly', () => {
    const request = assembleMobileBrowserScreencastRequest(IPAD_PANE, 2, 'web', 2)
    expect(request).not.toBeNull()
    expect(1000 / (request?.minFrameIntervalMs ?? Infinity)).toBeGreaterThanOrEqual(30)
  })

  it('sizes the picture to the pane at the screen density, within the cap', () => {
    const request = assembleMobileBrowserScreencastRequest(
      { width: 5000, height: 760 },
      2,
      'web',
      2
    )
    expect(request?.maxWidth).toBe(2400)
    expect(request?.maxHeight).toBe(1520)
  })

  it('asks for nothing before the pane has a size', () => {
    expect(assembleMobileBrowserScreencastRequest(null, 2, 'web', 2)).toBeNull()
    expect(
      assembleMobileBrowserScreencastRequest({ width: 0, height: 760 }, 2, 'web', 2)
    ).toBeNull()
  })
})
