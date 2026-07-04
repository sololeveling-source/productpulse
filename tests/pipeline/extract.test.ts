import { describe, expect, it } from 'vitest'
import { extractContent } from '@/lib/pipeline/extract'

describe('extractContent', () => {
  it('converts HTML body to normalized markdown', () => {
    const html = '<html><body><h1>Hello</h1><p>World. This is a longer paragraph so the extracted content passes the minimum length threshold used to filter out empty or trivial pages.</p></body></html>'
    const result = extractContent(html)
    expect(result.extractedText).toContain('Hello')
    expect(result.extractedText).toContain('World')
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
  })

  it('strips ISO timestamps', () => {
    const html = '<body>Released on 2026-06-15T10:30:00Z</body>'
    const result = extractContent(html)
    expect(result.extractedText).not.toMatch(/\d{4}-\d{2}-\d{2}T[\d:.Z+-]+/)
  })

  it('returns empty for empty input', () => {
    const result = extractContent('<html><body></body></html>')
    expect(result.extractedText).toBe('')
    expect(result.contentHash).toBe('')
  })

  it('returns empty for short content under 50 chars', () => {
    const result = extractContent('<body>Short</body>')
    expect(result.extractedText).toBe('')
    expect(result.contentHash).toBe('')
  })

  it('produces deterministic hash for same content', () => {
    const html = '<body><h1>Version 2.0</h1><p>New features and improvements across the platform, including faster search and a redesigned dashboard for teams.</p></body>'
    const a = extractContent(html)
    const b = extractContent(html)
    expect(a.contentHash).toBe(b.contentHash)
  })

  it('strips tracking query params from links', () => {
    const html = '<body><a href="https://example.com/page?utm_source=twitter&ref=abc">link</a></body>'
    const result = extractContent(html)
    expect(result.extractedText).not.toContain('utm_source')
    expect(result.extractedText).not.toContain('ref=abc')
  })
})
