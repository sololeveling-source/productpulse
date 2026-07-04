'use server'

// Source pattern: nextjs.org/docs/app/getting-started/mutating-data
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { competitors, sources } from '@/lib/db/schema'
import {
  createCompetitorSchema,
  INTERNAL_HOST_DENYLIST,
  updateCompetitorSchema,
} from '@/lib/validation'

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
  if (INTERNAL_HOST_DENYLIST.has(hostname)) {
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
      } else if (field === 'urls' && typeof index === 'number') {
        if (!(index in urlErrors)) {
          urlErrors[index] = 'This row is invalid. Remove and re-add it.'
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
    // Atomic CTE insert: the sources insert depends on the competitor row's
    // freshly-generated id, which db.batch() cannot express (each statement
    // in a batch is prepared independently). A single INSERT...WITH keeps
    // both writes in one statement, so a failure never leaves an orphan
    // competitor row with zero monitored URLs.
    const valuesSql = sql.join(
      dedupedUrls.map((u) => sql`(${u.url}, ${u.kind})`),
      sql`, `,
    )
    await db.execute(sql`
      WITH ins_competitor AS (
        INSERT INTO competitors (name) VALUES (${parsed.data.name}) RETURNING id
      )
      INSERT INTO sources (competitor_id, url, kind)
      SELECT ins_competitor.id, v.url, v.kind::source_kind
      FROM ins_competitor, (VALUES ${valuesSql}) AS v(url, kind)
    `)
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
      } else if (field === 'urls' && typeof index === 'number') {
        if (!(index in urlErrors)) {
          urlErrors[index] = 'This row is invalid. Remove and re-add it.'
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
    const writeStatements = []
    for (const row of dedupedUrls) {
      if (row.id != null && existingIds.has(row.id)) {
        payloadIds.add(row.id)
        writeStatements.push(
          db
            .update(sources)
            .set({ url: row.url, kind: row.kind })
            .where(and(eq(sources.id, row.id), eq(sources.competitorId, competitorId))),
        )
      } else {
        writeStatements.push(
          db.insert(sources).values({
            competitorId,
            url: row.url,
            kind: row.kind,
          }),
        )
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !payloadIds.has(id))
    if (idsToDelete.length > 0) {
      writeStatements.push(
        db
          .delete(sources)
          .where(
            and(inArray(sources.id, idsToDelete), eq(sources.competitorId, competitorId)),
          ),
      )
    }

    // Atomic batch — competitors.name and every sources reconciliation
    // statement commit together or not at all, so a failure partway through
    // (e.g. a unique-index hit from swapping two URLs) never leaves the
    // sources table in a state matching neither the pre- nor post-edit intent.
    await db.batch([
      db
        .update(competitors)
        .set({ name, updatedAt: new Date() })
        .where(eq(competitors.id, competitorId)),
      ...writeStatements,
    ])
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

  try {
    // sources cascade-delete via the schema's onDelete: 'cascade' FK — no
    // explicit sources delete statement needed (and none is written here).
    await db.delete(competitors).where(eq(competitors.id, parsed.data))
  } catch {
    return
  }
  revalidatePath('/competitors')
}
