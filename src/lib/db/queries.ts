// src/lib/db/queries.ts
// Read models for the Competitors feature (COMP-01/COMP-02).
// Server-only module: import only from Server Components / Server Actions.
import { desc, eq } from 'drizzle-orm'
import { db } from './index'
import { snapshots } from './schema'

export async function listCompetitorsWithSources() {
  return db.query.competitors.findMany({
    with: { sources: true },
    orderBy: (competitors, { desc }) => [desc(competitors.createdAt)],
  })
}

export type CompetitorWithSources = Awaited<
  ReturnType<typeof listCompetitorsWithSources>
>[number]

export async function getLatestSnapshot(sourceId: number) {
  const rows = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.sourceId, sourceId))
    .orderBy(desc(snapshots.fetchedAt))
    .limit(1)
  return rows[0]
}
