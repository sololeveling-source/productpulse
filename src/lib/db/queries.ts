// src/lib/db/queries.ts
// Read models for the Competitors feature (COMP-01/COMP-02).
// Server-only module: import only from Server Components / Server Actions.
import { db } from './index'

export async function listCompetitorsWithSources() {
  return db.query.competitors.findMany({
    with: { sources: true },
    orderBy: (competitors, { desc }) => [desc(competitors.createdAt)],
  })
}

export type CompetitorWithSources = Awaited<
  ReturnType<typeof listCompetitorsWithSources>
>[number]
