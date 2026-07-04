// Sources: orm.drizzle.team/docs/get-started/neon-new (conventions);
// column set from project ARCHITECTURE.md data model + phase success criteria
import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const sourceKind = pgEnum('source_kind', ['changelog', 'pricing'])
export const fetchStrategy = pgEnum('fetch_strategy', ['direct', 'jina'])
export const changeCategory = pgEnum('change_category', [
  'feature_launch', 'pricing_change', 'deprecation', 'fix', 'other',
])

export const competitors = pgTable('competitors', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 200 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sources = pgTable('sources', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  competitorId: integer('competitor_id').notNull()
    .references(() => competitors.id, { onDelete: 'cascade' }),
  url: text().notNull(),
  kind: sourceKind().notNull(),
  fetchStrategy: fetchStrategy('fetch_strategy').notNull().default('direct'),
  active: boolean().notNull().default(true),
  // Per-source health (MON-06; required in schema by Phase 1 success criteria)
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastStatus: text('last_status'),          // e.g. 'ok' | 'fetch_error' | 'extract_empty' | 'challenge_page'
  lastError: text('last_error'),
  failureStreak: integer('failure_streak').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sources_competitor_url_unique').on(table.competitorId, table.url),
])

export const snapshots = pgTable('snapshots', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer('source_id').notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  contentHash: varchar('content_hash', { length: 64 }).notNull(), // sha256 hex
  extractedText: text('extracted_text').notNull(),
  rawHtml: text('raw_html'),                 // optional, for re-extraction while tuning
  httpStatus: integer('http_status'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

export const changes = pgTable('changes', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer('source_id').notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  fromSnapshotId: integer('from_snapshot_id').references(() => snapshots.id),
  toSnapshotId: integer('to_snapshot_id').notNull().references(() => snapshots.id),
  diffText: text('diff_text').notNull(),
  // LLM analysis fields — nullable until Phase 4 populates them
  isMeaningful: boolean('is_meaningful'),
  category: changeCategory(),
  summary: text(),
  whyItMatters: text('why_it_matters'),
  publishedAt: timestamp('published_at', { withTimezone: true }), // source-stated date (backfill)
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
})

export const digests = pgTable('digests', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  contentMd: text('content_md').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const competitorsRelations = relations(competitors, ({ many }) => ({
  sources: many(sources),
}))

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  competitor: one(competitors, {
    fields: [sources.competitorId],
    references: [competitors.id],
  }),
  snapshots: many(snapshots),
  changes: many(changes),
}))
