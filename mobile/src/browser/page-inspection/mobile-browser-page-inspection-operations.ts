import * as z from 'zod'
import { isBrowserAnnotationPayloadShape } from '../../../../src/shared/browser/annotations/browser-element-feedback'
import type { BrowserAnnotationPayload } from '../../../../src/shared/browser/element-grab/browser-grab-types'
import { salvagingArray } from '../../../../src/shared/zod-salvage'
import { bindDeferredRpcOperation, defineRpcOperation } from '../../transport/rpc/rpc-operation'
import { rpcResultVariant } from '../../transport/rpc/rpc-operation-result-reader'

const pageErrorSchema = z.object({
  message: z.string(),
  source: z.string().catch(''),
  line: z.number().catch(0)
})

// A bad row is dropped rather than failing the list; the chip only counts what it can send.
const pageErrorsReplySchema = z.looseObject({
  url: z.string().catch(''),
  errors: salvagingArray(pageErrorSchema)
})

const elementAtReplySchema = z.union([
  z.looseObject({
    kind: z.literal('element'),
    payload: z.custom<BrowserAnnotationPayload>(isBrowserAnnotationPayloadShape)
  }),
  z.looseObject({ kind: z.literal('none'), reason: z.string().catch('no-element') })
])

export const browserPageErrorsRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'browser.page-errors',
    method: 'browser.pageErrors',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('browser-page-errors', pageErrorsReplySchema)
  })
)

export const browserDescribeElementAtRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'browser.describe-element-at',
    method: 'browser.describeElementAt',
    acceptance: 'require-result-or-throw-message',
    barrier: 'after-caller-barrier',
    read: rpcResultVariant('browser-element-at', elementAtReplySchema)
  })
)
