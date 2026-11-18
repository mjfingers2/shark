import { defineMethod } from '../../core'
import { BrowserTarget } from '../../../../../shared/rpc-contract/rpc-param-primitives'
import { DescribeElementAt } from '../../../../../shared/rpc-contract/browser/browser-page-inspection-params'

// Read-only, so a phone may call them; neither runs page-supplied script (browser.eval stays off the phone).
export const BROWSER_PAGE_INSPECTION_METHODS = [
  defineMethod({
    name: 'browser.pageErrors',
    permission: 'workspace',
    params: BrowserTarget,
    handler: async (params, { runtime }) => runtime.browserPageErrors(params)
  }),
  defineMethod({
    name: 'browser.describeElementAt',
    permission: 'workspace',
    params: DescribeElementAt,
    handler: async (params, { runtime }) => runtime.browserDescribeElementAt(params)
  })
]
