import { describe, expect, it } from 'vitest'
import {
  createCompetitorSchema,
  monitoredUrlSchema,
  updateCompetitorSchema,
  urlSchema,
} from '@/lib/validation'

describe('createCompetitorSchema', () => {
  const validUrls = [{ url: 'https://linear.app/changelog', kind: 'changelog' as const }]

  it('rejects empty name', () => {
    const result = createCompetitorSchema.safeParse({ name: '', urls: validUrls })
    expect(result.success).toBe(false)
  })

  it('rejects name of 201 chars', () => {
    const result = createCompetitorSchema.safeParse({ name: 'a'.repeat(201), urls: validUrls })
    expect(result.success).toBe(false)
  })

  it('accepts name of exactly 200 chars', () => {
    const result = createCompetitorSchema.safeParse({ name: 'a'.repeat(200), urls: validUrls })
    expect(result.success).toBe(true)
  })

  it('rejects empty urls array', () => {
    const result = createCompetitorSchema.safeParse({ name: 'Acme', urls: [] })
    expect(result.success).toBe(false)
  })

  it('accepts a valid competitor', () => {
    const result = createCompetitorSchema.safeParse({ name: 'Acme', urls: validUrls })
    expect(result.success).toBe(true)
  })
})

describe('urlSchema', () => {
  it.each([
    'ftp://example.com/x',
    'file:///etc/passwd',
    'not-a-url',
  ])('rejects non-http(s) or malformed URL: %s', (input) => {
    const result = urlSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it.each([
    'http://localhost:3000/a',
    'http://127.0.0.1/a',
    'http://169.254.169.254/latest/meta-data',
    'http://0.0.0.0/',
    'http://[::1]/',
  ])('rejects internal host: %s', (input) => {
    const result = urlSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it.each([
    'https://linear.app/changelog',
    'http://example.com/pricing',
  ])('accepts public http(s) URL: %s', (input) => {
    const result = urlSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('monitoredUrlSchema', () => {
  it('rejects kind "blog"', () => {
    const result = monitoredUrlSchema.safeParse({ url: 'https://example.com', kind: 'blog' })
    expect(result.success).toBe(false)
  })

  it('accepts kind "changelog"', () => {
    const result = monitoredUrlSchema.safeParse({ url: 'https://example.com', kind: 'changelog' })
    expect(result.success).toBe(true)
  })

  it('accepts kind "pricing"', () => {
    const result = monitoredUrlSchema.safeParse({ url: 'https://example.com', kind: 'pricing' })
    expect(result.success).toBe(true)
  })
})

describe('updateCompetitorSchema', () => {
  const validUrls = [{ url: 'https://linear.app/changelog', kind: 'changelog' as const }]

  it('rejects missing id', () => {
    const result = updateCompetitorSchema.safeParse({ name: 'Acme', urls: validUrls })
    expect(result.success).toBe(false)
  })

  it('rejects zero id', () => {
    const result = updateCompetitorSchema.safeParse({ id: 0, name: 'Acme', urls: validUrls })
    expect(result.success).toBe(false)
  })

  it('rejects negative id', () => {
    const result = updateCompetitorSchema.safeParse({ id: -1, name: 'Acme', urls: validUrls })
    expect(result.success).toBe(false)
  })

  it('coerces string "5" to number 5', () => {
    const result = updateCompetitorSchema.safeParse({ id: '5', name: 'Acme', urls: validUrls })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(5)
    }
  })
})
