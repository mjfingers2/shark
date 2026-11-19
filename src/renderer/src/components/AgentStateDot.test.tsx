import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AgentStateDot } from './AgentStateDot'

describe('AgentStateDot', () => {
  // Shark: a finished agent keeps its check mark but drops the green, which read as "still running".
  it('draws a finished agent as a gray check, not a green one', () => {
    const markup = renderToStaticMarkup(<AgentStateDot state="done" title={null} />)
    expect(markup).toContain('lucide-circle-check')
    expect(markup).not.toContain('emerald')
    expect(markup).toContain('text-muted-foreground')
  })

  it('keeps the unread blue dot on a finished agent you have not looked at', () => {
    const markup = renderToStaticMarkup(<AgentStateDot state="done" title={null} unread />)
    expect(markup).toContain('bg-unread')
  })

  it('still spins while the agent works', () => {
    const markup = renderToStaticMarkup(<AgentStateDot state="working" title={null} />)
    expect(markup).toContain('agent-working-spinner')
  })
})
