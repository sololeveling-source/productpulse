import { z } from 'zod'

export const INTERNAL_HOST_DENYLIST = new Set([
  'localhost',
  '127.0.0.1',
  '169.254.169.254',
  '0.0.0.0',
  '::1',
])

export const urlSchema = z.url().refine(
  (value) => {
    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      return false
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (INTERNAL_HOST_DENYLIST.has(hostname)) {
      return false
    }
    return true
  },
  { message: 'URL must be a public http(s) address' },
)

export const monitoredUrlSchema = z.object({
  id: z.number().int().optional(),
  url: urlSchema,
  kind: z.enum(['changelog', 'pricing']),
})

export const createCompetitorSchema = z.object({
  name: z.string().min(1).max(200),
  urls: z.array(monitoredUrlSchema).min(1),
})

export const updateCompetitorSchema = createCompetitorSchema.extend({
  id: z.coerce.number().int().positive(),
})
