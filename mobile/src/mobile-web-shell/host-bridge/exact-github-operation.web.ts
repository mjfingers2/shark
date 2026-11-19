import * as z from 'zod'

// The page bundle's copy of src/shared/github/work-items/exact-work-item-operation.ts. The shared
// module and its schemas import `{ z }`, which ships every zod locale table to the page; this one
// imports the namespace so esbuild drops them. exact-github-operation.test.ts holds the two to the
// same answers.
const methods = new Set([
  'github.workItemDetails',
  'github.updateIssue',
  'github.listLabels',
  'github.listAssignableUsers'
])

const requiredString = z
  .unknown()
  .transform((value) => (typeof value === 'string' ? value : ''))
  .pipe(z.string().min(1))
const optionalString = z
  .unknown()
  .transform((value) => (typeof value === 'string' && value.length > 0 ? value : undefined))
  .pipe(z.union([z.string(), z.undefined()]))
  .optional()

const exactShape = z.object({
  ownerRepo: z.object({
    owner: requiredString,
    repo: requiredString,
    host: optionalString
  }),
  expectedRuntimeSource: z.object({
    sourceId: z.string().min(1).max(4_096),
    runtimeId: z.string().min(1).max(4_096)
  })
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Only the complete opt-in pair promises enforcement; old independently optional fields stay optional.
export function classifyExactGitHubOperation(method: string, params: unknown, envelope: unknown) {
  if (
    !methods.has(method) ||
    !isRecord(params) ||
    !isRecord(envelope) ||
    !Object.hasOwn(params, 'ownerRepo') ||
    !Object.hasOwn(envelope, 'expectedRuntimeSource')
  ) {
    return null
  }
  const parsed = exactShape.safeParse({
    ownerRepo: params.ownerRepo,
    expectedRuntimeSource: envelope.expectedRuntimeSource
  })
  if (!parsed.success) {
    throw new Error('Unable to identify the GitHub operation. Open the item again and try again.')
  }
  return parsed.data
}
