import { describe, expect, it, vi } from 'vitest'
import { runPipeline } from '@/lib/pipeline/run'

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  },
}))

describe('runPipeline', () => {
  it('returns empty array when no active sources exist', async () => {
    const results = await runPipeline()
    expect(results).toEqual([])
  })
})
