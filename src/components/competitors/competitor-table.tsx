import { Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompetitorDialog } from './competitor-dialog'
import { DeleteCompetitorDialog } from './delete-competitor-dialog'
import type { CompetitorWithSources } from '@/lib/db/queries'

const RELATIVE_DIVISIONS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function relativeDate(date: Date): string {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  for (const [unit, secondsInUnit] of RELATIVE_DIVISIONS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return relativeTimeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return relativeTimeFormatter.format(0, 'second')
}

const KIND_LABEL: Record<string, string> = {
  changelog: 'changelog',
  pricing: 'pricing',
}

export function CompetitorTable({
  competitors,
}: {
  competitors: CompetitorWithSources[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-xs font-normal tracking-wide text-zinc-400 uppercase">
              Competitor
            </TableHead>
            <TableHead className="text-xs font-normal tracking-wide text-zinc-400 uppercase">
              Monitored URLs
            </TableHead>
            <TableHead className="text-xs font-normal tracking-wide text-zinc-400 uppercase">
              Added
            </TableHead>
            <TableHead className="text-right text-xs font-normal tracking-wide text-zinc-400 uppercase">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitors.map((competitor) => (
            <TableRow
              key={competitor.id}
              className="border-zinc-800 hover:bg-zinc-800"
            >
              <TableCell className="py-3 align-top text-sm font-semibold whitespace-normal text-zinc-50">
                {competitor.name}
              </TableCell>
              <TableCell className="py-3 align-top whitespace-normal">
                <div className="flex flex-col gap-1.5">
                  {competitor.sources.map((source) => (
                    <div key={source.id} className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-zinc-800 text-zinc-400"
                      >
                        {KIND_LABEL[source.kind] ?? source.kind}
                      </Badge>
                      <span
                        title={source.url}
                        className="max-w-[360px] truncate font-mono text-sm text-zinc-300"
                      >
                        {source.url}
                      </span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-3 align-top text-xs text-zinc-400">
                {relativeDate(competitor.createdAt)}
              </TableCell>
              <TableCell className="py-3 text-right align-top">
                <div className="flex items-center justify-end gap-1">
                  <CompetitorDialog
                    mode="edit"
                    competitor={competitor}
                    tooltipLabel="Edit"
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${competitor.name}`}
                      >
                        <Pencil />
                      </Button>
                    }
                  />
                  <DeleteCompetitorDialog
                    competitorId={competitor.id}
                    competitorName={competitor.name}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
