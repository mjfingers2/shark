import type { BrowserKeyValueStore } from './browser-credential-store'

/** An in-memory localStorage for the browser shell suites; a non-test file only because tsconfig excludes tests. */
export function createMemoryStore(): BrowserKeyValueStore & {
  readonly values: Map<string, string>
} {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    }
  }
}
