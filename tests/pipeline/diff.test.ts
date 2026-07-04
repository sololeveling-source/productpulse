import { describe, expect, it } from 'vitest'
import { unifiedDiff } from '@/lib/pipeline/diff'

describe('unifiedDiff', () => {
  it('returns a patch header with no change lines for identical inputs', () => {
    const result = unifiedDiff('same content', 'same content')
    expect(result).toContain('Index: page.md')
    expect(result).not.toMatch(/^[-+](?![-+])/m)
  })

  it('shows added lines with a leading +', () => {
    const result = unifiedDiff('line one\n', 'line one\nline two\n')
    expect(result).toContain('+line two')
  })

  it('shows removed lines with a leading -', () => {
    const result = unifiedDiff('old line\n', 'new line\n')
    expect(result).toContain('-old line')
    expect(result).toContain('+new line')
  })

  it('treats an empty previous string as a full-file addition', () => {
    const result = unifiedDiff('', 'hello world\n')
    expect(result).toContain('+hello world')
    expect(result).toContain('@@ -0,0 +1,1 @@')
  })
})
