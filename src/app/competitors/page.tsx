// Pitfall 2 (01-RESEARCH.md): pages reading Postgres at render time must
// opt out of static prerendering — otherwise Next.js bakes stale data into
// the build (or fails the build if the DB is unreachable).
export const dynamic = 'force-dynamic'

import { listCompetitorsWithSources } from '@/lib/db/queries'
import { CheckNowButton } from '@/components/competitors/check-now-button'
import { CompetitorDialog } from '@/components/competitors/competitor-dialog'
import { CompetitorTable } from '@/components/competitors/competitor-table'
import { Button } from '@/components/ui/button'

export default async function CompetitorsPage() {
  const competitors = await listCompetitorsWithSources()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-tight font-semibold text-zinc-50">
          Competitors
        </h1>
        <div className="flex items-center gap-2">
          <CheckNowButton label="Check all" />
          <CompetitorDialog mode="add" trigger={<Button>Add competitor</Button>} />
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-50">No competitors yet</h2>
          <p className="max-w-md text-sm font-normal text-zinc-400">
            Add a competitor and the changelog or pricing pages you want ProductPulse to watch.
          </p>
          <CompetitorDialog
            mode="add"
            trigger={<Button className="mt-2">Add competitor</Button>}
          />
        </div>
      ) : (
        <CompetitorTable competitors={competitors} />
      )}
    </div>
  )
}
