'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { deleteCompetitor } from '@/app/competitors/actions'

// Exact UI-SPEC copy (Copywriting Contract — destructive confirmation row).
// Rendered as an expression (not JSX text) to keep the literal apostrophe
// intact for both correctness and the plan's exact-string verification.
const DELETE_BODY =
  "This removes its monitored URLs and everything ProductPulse has captured for them. This can't be undone."

// Reads the enclosing <form>'s pending state (react-dom's useFormStatus) to
// detect submission completion — deleteCompetitor is a plain form action
// (no useActionState return value), so a pending->not-pending edge is our
// success signal. When the delete succeeds the competitor's table row (and
// this whole dialog, mounted per-row) unmounts on the next server render;
// this toast fires just before that happens.
function DeleteConfirmButton() {
  const { pending } = useFormStatus()
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending) {
      toast.success('Competitor deleted')
    }
    wasPending.current = pending
  }, [pending])

  return (
    <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
      Delete competitor
    </AlertDialogAction>
  )
}

export function DeleteCompetitorDialog({
  competitorId,
  competitorName,
}: {
  competitorId: number
  competitorName: string
}) {
  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${competitorName}`}
              className="text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {competitorName}?</AlertDialogTitle>
          <AlertDialogDescription>{DELETE_BODY}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={deleteCompetitor}>
          <input type="hidden" name="id" value={competitorId} readOnly />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep competitor</AlertDialogCancel>
            <DeleteConfirmButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
