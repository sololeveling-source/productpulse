import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runPipeline } from '@/lib/pipeline/run'

type MockState = {
  sources: Array<{ id: number; url: string; active: boolean }>
  latestSnapshot:
    | {
        id: number
        sourceId: number
        contentHash: string
        extractedText: string
        rawHtml: string | null
        httpStatus: number | null
        fetchedAt: Date
      }
    | undefined
  nextSnapshotId: number
  insertedSnapshots: Array<Record<string, unknown>>
  insertedChanges: Array<Record<string, unknown>>
  updated: Array<{ table: unknown; vals: Record<string, unknown>; cond: unknown }>
  snapshotsTable: unknown
  changesTable: unknown
}

const mocks = vi.hoisted(() => {
  const state: MockState = {
    sources: [],
    latestSnapshot: undefined,
    nextSnapshotId: 1,
    insertedSnapshots: [],
    insertedChanges: [],
    updated: [],
    snapshotsTable: null,
    changesTable: null,
  }

  function reset() {
    state.sources = []
    state.latestSnapshot = undefined
    state.nextSnapshotId = 1
    state.insertedSnapshots = []
    state.insertedChanges = []
    state.updated = []
    fetchPage.mockReset()
    extractContent.mockReset()
    getLatestSnapshot.mockReset()
    getLatestSnapshot.mockImplementation(() => Promise.resolve(state.latestSnapshot))
  }

  const fetchPage = vi.fn()
  const extractContent = vi.fn()
  const getLatestSnapshot = vi.fn()

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(state.sources)),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((vals: Record<string, unknown>) => {
        if (table === state.snapshotsTable) state.insertedSnapshots.push(vals)
        if (table === state.changesTable) state.insertedChanges.push(vals)
        return {
          returning: vi.fn(() =>
            table === state.snapshotsTable
              ? Promise.resolve([{ id: state.nextSnapshotId++ }])
              : Promise.resolve([]),
          ),
        }
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((vals: Record<string, unknown>) => ({
        where: vi.fn((cond: unknown) => {
          state.updated.push({ table, vals, cond })
          return Promise.resolve([])
        }),
      })),
    })),
  }

  return {
    state,
    db,
    fetchPage,
    extractContent,
    getLatestSnapshot,
    reset,
  }
})

vi.mock('@/lib/db', () => ({ db: mocks.db }))
vi.mock('@/lib/db/queries', () => ({ getLatestSnapshot: mocks.getLatestSnapshot }))
vi.mock('@/lib/pipeline/fetch', () => ({ fetchPage: mocks.fetchPage }))
vi.mock('@/lib/pipeline/extract', () => ({ extractContent: mocks.extractContent }))

// Resolve the real schema table objects so the mock can identify insert targets.
const { snapshots, changes } = await vi.importActual('@/lib/db/schema')
mocks.state.snapshotsTable = snapshots
mocks.state.changesTable = changes

beforeEach(() => mocks.reset())

describe('runPipeline', () => {
  it('returns empty array when no active sources exist', async () => {
    mocks.state.sources = []
    const results = await runPipeline()
    expect(results).toEqual([])
  })

  it('skips snapshot and change inserts when content hash is unchanged', async () => {
    mocks.state.sources = [{ id: 1, url: 'https://example.com/changelog', active: true }]
    mocks.fetchPage.mockResolvedValue({ html: '<html>same</html>', httpStatus: 200 })
    mocks.extractContent.mockReturnValue({ extractedText: 'same content', contentHash: 'hash1' })
    mocks.state.latestSnapshot = {
      id: 10,
      sourceId: 1,
      contentHash: 'hash1',
      extractedText: 'same content',
      rawHtml: null,
      httpStatus: 200,
      fetchedAt: new Date(),
    }

    const results = await runPipeline()

    expect(results).toEqual([
      { sourceId: 1, url: 'https://example.com/changelog', status: 'ok', changed: false },
    ])
    expect(mocks.state.insertedSnapshots).toHaveLength(0)
    expect(mocks.state.insertedChanges).toHaveLength(0)
    expect(mocks.state.updated).toHaveLength(1)
    expect(mocks.state.updated[0].vals.lastStatus).toBe('ok')
    expect(mocks.state.updated[0].vals.failureStreak).toBe(0)
  })

  it('inserts snapshot and change when content hash differs', async () => {
    mocks.state.sources = [{ id: 1, url: 'https://example.com/changelog', active: true }]
    mocks.fetchPage.mockResolvedValue({ html: '<html>new</html>', httpStatus: 200 })
    mocks.extractContent.mockReturnValue({ extractedText: 'new content', contentHash: 'hash2' })
    mocks.state.latestSnapshot = {
      id: 10,
      sourceId: 1,
      contentHash: 'hash1',
      extractedText: 'old content',
      rawHtml: null,
      httpStatus: 200,
      fetchedAt: new Date(),
    }

    const results = await runPipeline()

    expect(results).toEqual([
      { sourceId: 1, url: 'https://example.com/changelog', status: 'ok', changed: true },
    ])
    expect(mocks.state.insertedSnapshots).toHaveLength(1)
    expect(mocks.state.insertedSnapshots[0].contentHash).toBe('hash2')
    expect(mocks.state.insertedChanges).toHaveLength(1)
    expect(mocks.state.insertedChanges[0].fromSnapshotId).toBe(10)
    expect(mocks.state.insertedChanges[0].toSnapshotId).toBe(1)
    expect(mocks.state.insertedChanges[0].diffText).toContain('-old content')
    expect(mocks.state.insertedChanges[0].diffText).toContain('+new content')
  })

  it('creates a change on first check with no previous snapshot', async () => {
    mocks.state.sources = [{ id: 2, url: 'https://example.com/pricing', active: true }]
    mocks.fetchPage.mockResolvedValue({ html: '<html>content</html>', httpStatus: 200 })
    mocks.extractContent.mockReturnValue({ extractedText: 'initial content', contentHash: 'hashA' })
    mocks.state.latestSnapshot = undefined

    const results = await runPipeline()

    expect(results).toEqual([
      { sourceId: 2, url: 'https://example.com/pricing', status: 'ok', changed: true },
    ])
    expect(mocks.state.insertedSnapshots).toHaveLength(1)
    expect(mocks.state.insertedChanges).toHaveLength(1)
    expect(mocks.state.insertedChanges[0].fromSnapshotId).toBeNull()
    expect(mocks.state.insertedChanges[0].toSnapshotId).toBe(1)
  })
})
