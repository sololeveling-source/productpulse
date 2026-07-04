'use server'

// Source pattern: nextjs.org/docs/app/getting-started/mutating-data
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { competitors, sources } from '@/lib/db/schema'
import { createCompetitorSchema, updateCompetitorSchema } from '@/lib/validation'

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

export type UpdateCompetitorFieldErrors = CreateCompetitorFieldErrors

export type UpdateCompetitorState = {
  success: boolean
  formError?: string
  fieldErrors?: UpdateCompetitorFieldErrors
}

export const initialUpdateCompetitorState: UpdateCompetitorState = {
  success: false,
}

export async function updateCompetitor(
  _prevState: UpdateCompetitorState,
  formData: FormData,
): Promise<UpdateCompetitorState> {
  let rawUrls: unknown
  try {
    rawUrls = JSON.parse(String(formData.get('urls') ?? '[]'))
  } catch {
    return {
      success: false,
      formError: "Couldn't save competitor. Check your connection and try again.",
    }
  }

  const parsed = updateCompetitorSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    urls: rawUrls,
  })

  if (!parsed.success) {
    const fieldErrors: UpdateCompetitorFieldErrors = {}
    const urlErrors: Record<number, string> = {}

    for (const issue of parsed.error.issues) {
      const [field, index, sub] = issue.path
      if (field === 'id') {
        // No user-visible id field to attach this to — a forged/missing id
        // is treated as a generic save failure, not a field-level error.
        return {
          success: false,
          formError: "Couldn't save competitor. Check your connection and try again.",
        }
      } else if (field === 'name') {
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

  const { id: competitorId, name, urls } = parsed.data

  // Guard the (competitor_id, url) composite unique index against duplicate
  // rows submitted in the same request.
  const seen = new Set<string>()
  const dedupedUrls = urls.filter((u) => {
    if (seen.has(u.url)) return false
    seen.add(u.url)
    return true
  })

  try {
    await db
      .update(competitors)
      .set({ name, updatedAt: new Date() })
      .where(eq(competitors.id, competitorId))

    // Reconcile-by-id: never delete-and-reinsert. snapshots FK-cascades from
    // sources, so recreating a source row would silently wipe Phase 2+
    // history for an unchanged URL. Every statement below is scoped by BOTH
    // the source id AND competitorId so a forged source id belonging to a
    // different competitor can never be touched (T-01-08).
    const existingSources = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.competitorId, competitorId))
    const existingIds = new Set(existingSources.map((s) => s.id))

    const payloadIds = new Set<number>()
    for (const row of dedupedUrls) {
      if (row.id != null && existingIds.has(row.id)) {
        payloadIds.add(row.id)
        await db
          .update(sources)
          .set({ url: row.url, kind: row.kind })
          .where(and(eq(sources.id, row.id), eq(sources.competitorId, competitorId)))
      } else {
        await db.insert(sources).values({
          competitorId,
          url: row.url,
          kind: row.kind,
        })
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !payloadIds.has(id))
    if (idsToDelete.length > 0) {
      await db
        .delete(sources)
        .where(
          and(inArray(sources.id, idsToDelete), eq(sources.competitorId, competitorId)),
        )
    }
  } catch {
    return {
      success: false,
      formError: "Couldn't save competitor. Check your connection and try again.",
    }
  }

  revalidatePath('/competitors')
  return { success: true }
}

export async function deleteCompetitor(formData: FormData): Promise<void> {
  const parsed = z.coerce.number().int().positive().safeParse(formData.get('id'))
  if (!parsed.success) return

  // sources cascade-delete via the schema's onDelete: 'cascade' FK — no
  // explicit sources delete statement needed (and none is written here).
  await db.delete(competitors).where(eq(competitors.id, parsed.data))
  revalidatePath('/competitors')
}
