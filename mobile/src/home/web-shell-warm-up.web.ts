// Why: in a browser tab the page engine is the tab itself, and the native module's import chain
// does not belong in the page.
export function warmUpWebShell(): void {}
