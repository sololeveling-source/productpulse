// src/lib/pipeline/diff.ts
// Produce a human-readable unified diff of normalized extracted text.
// Called only when the content-hash gate has already decided the page changed.
import { createPatch } from 'diff'

export function unifiedDiff(prev: string, next: string): string {
  return createPatch(
    'page.md',
    prev,
    next,
    'previous',
    'current',
    { context: 3 },
  )
}
