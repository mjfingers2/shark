import { describe, expect, it, vi } from 'vitest'
import type { OrcaRuntimeService } from '../../../orca-runtime'
import { eraseRpcMethods, isStreamingMethod, type RpcContext } from '../../core'
import { MOBILE_RPC_METHOD_ROUTES } from '../../server/runtime-rpc-mobile-method-routing'
import { BROWSER_PAGE_INSPECTION_METHODS } from './browser-page-inspection-rpc-methods'

function method(name: string) {
  const found = eraseRpcMethods(BROWSER_PAGE_INSPECTION_METHODS).find((m) => m.name === name)
  if (!found || isStreamingMethod(found) || !found.params) {
    throw new Error(`${name} is not a request method with params`)
  }
  return found
}

function harness() {
  const fake = {
    browserPageErrors: vi.fn(async () => ({
      browserPageId: 'page-1',
      url: 'http://localhost:5173/',
      errors: [{ message: 'boom', source: 'main.ts', line: 3 }]
    })),
    browserDescribeElementAt: vi.fn(async () => ({
      browserPageId: 'page-1',
      kind: 'none',
      reason: 'no-element'
    }))
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handlers call only the two runtime methods this fake implements.
  const context = { runtime: fake as unknown as OrcaRuntimeService } as RpcContext
  return { fake, context }
}

describe('browser.pageErrors', () => {
  it('answers with the runtime list for the named page', async () => {
    const { fake, context } = harness()
    const pageErrors = method('browser.pageErrors')
    const params = pageErrors.params!.parse({ worktree: 'id:repo::/w', page: 'page-1' })
    await expect(pageErrors.handler(params, context)).resolves.toEqual({
      browserPageId: 'page-1',
      url: 'http://localhost:5173/',
      errors: [{ message: 'boom', source: 'main.ts', line: 3 }]
    })
    expect(fake.browserPageErrors).toHaveBeenCalledWith({ worktree: 'id:repo::/w', page: 'page-1' })
  })
})

describe('browser.describeElementAt', () => {
  it('passes the page and the viewport point to the runtime', async () => {
    const { fake, context } = harness()
    const describeAt = method('browser.describeElementAt')
    const params = describeAt.params!.parse({ page: 'page-1', x: 120, y: 48.5 })
    await describeAt.handler(params, context)
    expect(fake.browserDescribeElementAt).toHaveBeenCalledWith(
      expect.objectContaining({ page: 'page-1', x: 120, y: 48.5 })
    )
  })

  it('refuses a call without both coordinates', () => {
    const describeAt = method('browser.describeElementAt')
    expect(describeAt.params!.safeParse({ page: 'page-1', x: 3 }).success).toBe(false)
    expect(describeAt.params!.safeParse({ page: 'page-1', x: 'a', y: 2 }).success).toBe(false)
  })
})

describe('mobile routing', () => {
  it('lets the phone read page facts but never run page script', () => {
    expect(MOBILE_RPC_METHOD_ROUTES.get('browser.pageErrors')).toBe('execution-host')
    expect(MOBILE_RPC_METHOD_ROUTES.get('browser.describeElementAt')).toBe('execution-host')
    expect(MOBILE_RPC_METHOD_ROUTES.has('browser.eval')).toBe(false)
  })
})
