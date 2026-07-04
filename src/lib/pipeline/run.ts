import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sources, snapshots, changes } from '@/lib/db/schema'
import { fetchPage } from './fetch'
import { extractContent } from './extract'
import { unifiedDiff } from './diff'
import { getLatestSnapshot } from '@/lib/db/queries'

export type RunReport = {
  sourceId: number
  url: string
  status: 'ok' | 'fetch_error' | 'challenge_page' | 'extract_empty'
  changed?: boolean
  error?: string
}

export async function runPipeline(opts?: { sourceId?: number }): Promise<RunReport[]> {
  const conditions = [eq(sources.active, true)]
  if (opts?.sourceId != null) {
    conditions.push(eq(sources.id, opts.sourceId))
  }

  const activeSources = await db
    .select()
    .from(sources)
    .where(and(...conditions))

  if (activeSources.length === 0) {
    return []
  }

  const reports: RunReport[] = []

  for (const source of activeSources) {
    const report: RunReport = { sourceId: source.id, url: source.url, status: 'ok' }

    try {
      // Stage 1: Fetch
      const fetchResult = await fetchPage(source.url)

      if (fetchResult.error === 'challenge_page') {
        report.status = 'challenge_page'
        report.error = 'Page served a challenge (Cloudflare or similar)'
        await updateSourceHealth(source.id, 'challenge_page', report.error)
        reports.push(report)
        continue
      }

      if (fetchResult.error === 'timeout') {
        report.status = 'fetch_error'
        report.error = 'Request timed out'
        await updateSourceHealth(source.id, 'fetch_error', report.error)
        reports.push(report)
        continue
      }

      if (fetchResult.error === 'fetch_error' || fetchResult.html === null) {
        report.status = 'fetch_error'
        report.error = fetchResult.error === 'fetch_error'
          ? 'Failed to fetch page'
          : 'Page returned no content'
        await updateSourceHealth(source.id, 'fetch_error', report.error)
        reports.push(report)
        continue
      }

      // Stage 2: Extract
      const extractResult = extractContent(fetchResult.html)

      if (!extractResult.extractedText) {
        report.status = 'extract_empty'
        report.error = 'Extracted content was empty or too short'
        await updateSourceHealth(source.id, 'extract_empty', report.error)
        reports.push(report)
        continue
      }

      // Stage 3: Hash gate + change detection
      const prevSnapshot = await getLatestSnapshot(source.id)

      if (prevSnapshot?.contentHash === extractResult.contentHash) {
        // Page unchanged: no new snapshot or change record needed.
        await markSourceSuccess(source.id)
        report.status = 'ok'
        report.changed = false
        reports.push(report)
        continue
      }

      // Page changed (or this is the first successful check).
      const [inserted] = await db
        .insert(snapshots)
        .values({
          sourceId: source.id,
          contentHash: extractResult.contentHash,
          extractedText: extractResult.extractedText,
          rawHtml: fetchResult.html,
          httpStatus: fetchResult.httpStatus,
        })
        .returning({ id: snapshots.id })

      const newSnapshotId = inserted!.id

      const diffText = unifiedDiff(
        prevSnapshot?.extractedText ?? '',
        extractResult.extractedText,
      )

      await db.insert(changes).values({
        sourceId: source.id,
        fromSnapshotId: prevSnapshot?.id ?? null,
        toSnapshotId: newSnapshotId,
        diffText,
      })

      await markSourceSuccess(source.id)
      report.status = 'ok'
      report.changed = true
    } catch (err) {
      report.status = 'fetch_error'
      report.error = err instanceof Error ? err.message : 'Unknown error'
      await updateSourceHealth(source.id, 'fetch_error', report.error)
    }

    reports.push(report)
  }

  return reports
}

async function markSourceSuccess(sourceId: number): Promise<void> {
  await db
    .update(sources)
    .set({
      lastCheckedAt: new Date(),
      lastSuccessAt: new Date(),
      lastStatus: 'ok',
      lastError: null,
      failureStreak: 0,
    })
    .where(eq(sources.id, sourceId))
}

async function updateSourceHealth(
  sourceId: number,
  status: string,
  error: string | null,
): Promise<void> {
  await db
    .update(sources)
    .set({
      lastCheckedAt: new Date(),
      lastStatus: status,
      lastError: error,
      failureStreak: sql`failure_streak + 1`,
    })
    .where(eq(sources.id, sourceId))
}
