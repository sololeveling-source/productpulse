'use server'

// Source pattern: nextjs.org/docs/app/getting-started/mutating-data
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { competitors, sources } from '@/lib/db/schema'
import { createCompetitorSchema } from '@/lib/validation'

// Mirrors src/lib/validation.ts's INTERNAL_HOST_DENYLIST — used here ONLY to
// classify *which* UI-SPEC copy a URL zod already rejected maps to (bad
// scheme/format vs. blocked internal host). src/lib/validation.ts's
// urlSchema remains the sole accept/reject security gate; this never changes
// what passes validation, only which message is shown for something that
// already failed.
const INTERNAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '169.254.169.254',
  '0.0.0.0',
  '::1',
])

const GENERIC_URL_ERROR = 'Enter a full URL starting with http:// or https://.'
const INTERNAL_HOST_ERROR =
  "This URL points to a private or internal address and can't be monitored."

function describeUrlError(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return GENERIC_URL_ERROR
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return GENERIC_URL_ERROR
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return GENERIC_URL_ERROR
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (INTERNAL_HOSTS.has(hostname)) {
    return INTERNAL_HOST_ERROR
  }
  return GENERIC_URL_ERROR
}

export type CreateCompetitorFieldErrors = {
  name?: string
  urlsRoot?: string
  urls?: Record<number, string>
}

export type CreateCompetitorState = {
  success: boolean
  formError?: string
  fieldErrors?: CreateCompetitorFieldErrors
}

export const initialCreateCompetitorState: CreateCompetitorState = {
  success: false,
}

export async function createCompetitor(
  _prevState: CreateCompetitorState,
  formData: FormData,
): Promise<CreateCompetitorState> {
  let rawUrls: unknown
  try {
    rawUrls = JSON.parse(String(formData.get('urls') ?? '[]'))
  } catch {
    return {
      success: false,
      formError: "Couldn't save competitor. Check your connection and try again.",
    }
  }

  const parsed = createCompetitorSchema.safeParse({
    name: formData.get('name'),
    urls: rawUrls,
  })

  if (!parsed.success) {
    const fieldErrors: CreateCompetitorFieldErrors = {}
    const urlErrors: Record<number, string> = {}

    for (const issue of parsed.error.issues) {
      const [field, index, sub] = issue.path
      if (field === 'name') {
        fieldErrors.name = 'Enter a competitor name.'
      } else if (field === 'urls' && issue.path.length === 1) {
        fieldErrors.urlsRoot = 'Add at least one URL to monitor.'
      } else if (field === 'urls' && typeof index === 'number' && sub === 'url') {
        if (!(index in urlErrors)) {
          const row = Array.isArray(rawUrls) ? rawUrls[index] : undefined
          urlErrors[index] = describeUrlError(
            row && typeof row === 'object' ? (row as { url?: unknown }).url : undefined,
          )
        }
      }
    }

    if (Object.keys(urlErrors).length > 0) fieldErrors.urls = urlErrors

    return { success: false, fieldErrors }
  }

  // Guard the (competitor_id, url) composite unique index against duplicate
  // rows submitted in the same request.
  const seen = new Set<string>()
  const dedupedUrls = parsed.data.urls.filter((u) => {
    if (seen.has(u.url)) return false
    seen.add(u.url)
    return true
  })

  try {
    const [competitor] = await db
      .insert(competitors)
      .values({ name: parsed.data.name })
      .returning()

    await db.insert(sources).values(
      dedupedUrls.map((u) => ({
        competitorId: competitor.id,
        url: u.url,
        kind: u.kind,
      })),
    )
  } catch {
    return {
      success: false,
      formError: "Couldn't save competitor. Check your connection and try again.",
    }
  }

  revalidatePath('/competitors')
  return { success: true }
}
