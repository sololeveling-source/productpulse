import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  changeCategory,
  changes,
  competitors,
  digests,
  fetchStrategy,
  snapshots,
  sourceKind,
  sources,
} from '@/lib/db/schema'

describe('enums', () => {
  it('sourceKind has exactly changelog and pricing', () => {
    expect(sourceKind.enumValues).toEqual(['changelog', 'pricing'])
  })

  it('changeCategory matches AI-03 verbatim', () => {
    expect(changeCategory.enumValues).toEqual([
      'feature_launch',
      'pricing_change',
      'deprecation',
      'fix',
      'other',
    ])
  })

  it('fetchStrategy has exactly direct and jina', () => {
    expect(fetchStrategy.enumValues).toEqual(['direct', 'jina'])
  })
})

describe('sources table', () => {
  const config = getTableConfig(sources)

  it('has table name "sources"', () => {
    expect(config.name).toBe('sources')
  })

  it('has a competitor_id FK with onDelete cascade', () => {
    const fk = config.foreignKeys.find((f) => f.onDelete === 'cascade')
    expect(fk).toBeDefined()
  })

  it('has a unique index over (competitor_id, url)', () => {
    const uniqueIdx = config.indexes.find((idx) => idx.config.unique)
    expect(uniqueIdx).toBeDefined()
    const columnNames = uniqueIdx?.config.columns.map((c) => (c as { name?: string }).name)
    expect(columnNames).toEqual(expect.arrayContaining(['competitor_id', 'url']))
  })

  it('has health columns: last_checked_at, last_success_at, last_status, last_error, failure_streak', () => {
    const columnNames = config.columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'last_checked_at',
        'last_success_at',
        'last_status',
        'last_error',
        'failure_streak',
      ]),
    )
  })
})

describe('competitors table', () => {
  it('has table name "competitors"', () => {
    expect(getTableConfig(competitors).name).toBe('competitors')
  })
})

describe('snapshots table', () => {
  it('has table name "snapshots"', () => {
    expect(getTableConfig(snapshots).name).toBe('snapshots')
  })
})

describe('changes table', () => {
  const config = getTableConfig(changes)

  it('has table name "changes"', () => {
    expect(config.name).toBe('changes')
  })

  it('has columns published_at and detected_at', () => {
    const columnNames = config.columns.map((c) => c.name)
    expect(columnNames).toEqual(expect.arrayContaining(['published_at', 'detected_at']))
  })
})

describe('digests table', () => {
  it('has table name "digests"', () => {
    expect(getTableConfig(digests).name).toBe('digests')
  })
})
