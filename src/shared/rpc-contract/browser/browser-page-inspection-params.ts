import { BrowserTarget, requiredNumber } from '../rpc-param-primitives'

/** The element at a viewport CSS point, described the way the desktop grab describes one. */
export const DescribeElementAt = BrowserTarget.extend({
  x: requiredNumber('Missing required x and y coordinates'),
  y: requiredNumber('Missing required x and y coordinates')
})
