'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createCompetitor, updateCompetitor } from '@/app/competitors/actions'
import {
  initialCreateCompetitorState,
  initialUpdateCompetitorState,
} from '@/lib/action-state'
import type { CompetitorWithSources } from '@/lib/db/queries'

type UrlKind = 'changelog' | 'pricing'

type UrlRow = {
  key: string
  // Present only for rows carrying an existing DB source — lets
  // updateCompetitor reconcile-by-id instead of delete-and-reinsert.
  id?: number
  url: string
  kind: UrlKind
}

function makeRow(): UrlRow {
  return {
    key:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `row-${Math.random().toString(36).slice(2)}`,
    url: '',
    kind: 'changelog',
  }
}

function rowsFromCompetitor(competitor: CompetitorWithSources): UrlRow[] {
  if (competitor.sources.length === 0) return [makeRow()]
  return competitor.sources.map((source) => ({
    key: String(source.id),
    id: source.id,
    url: source.url,
    kind: source.kind,
  }))
}

// Exact UI-SPEC copy (Copywriting Contract — Form validation errors).
const NAME_ERROR = 'Enter a competitor name.'
const GENERIC_URL_ERROR = 'Enter a full URL starting with http:// or https://.'
const INTERNAL_HOST_ERROR =
  "This URL points to a private or internal address and can't be monitored."
const NO_URLS_ERROR = 'Add at least one URL to monitor.'

// Mirrors src/lib/validation.ts's urlSchema denylist — used here ONLY for
// instant client-side error copy (no network round trip). The Server Action
// (create/updateCompetitorSchema.safeParse in src/app/competitors/actions.ts)
// remains the sole accept/reject security gate; this never changes what is
// allowed to persist.
const INTERNAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '169.254.169.254',
  '0.0.0.0',
  '::1',
])

function validateUrlField(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return GENERIC_URL_ERROR
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return GENERIC_URL_ERROR
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return GENERIC_URL_ERROR
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (INTERNAL_HOSTS.has(hostname)) return INTERNAL_HOST_ERROR
  return null
}

type ClientFieldErrors = {
  name?: string
  urlsRoot?: string
  urls?: Record<number, string>
}

type CompetitorDialogProps =
  | { mode: 'add'; trigger: React.ReactNode; tooltipLabel?: string }
  | {
      mode: 'edit'
      trigger: React.ReactNode
      tooltipLabel?: string
      competitor: CompetitorWithSources
    }

export function CompetitorDialog(props: CompetitorDialogProps) {
  const { trigger, tooltipLabel } = props
  const mode = props.mode
  const competitor = props.mode === 'edit' ? props.competitor : undefined

  const [open, setOpen] = useState(false)
  const [name, setName] = useState(competitor?.name ?? '')
  const [rows, setRows] = useState<UrlRow[]>(() =>
    competitor ? rowsFromCompetitor(competitor) : [makeRow()],
  )
  const [clientErrors, setClientErrors] = useState<ClientFieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  const [createState, createFormAction, createPending] = useActionState(
    createCompetitor,
    initialCreateCompetitorState,
  )
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateCompetitor,
    initialUpdateCompetitorState,
  )

  const state = mode === 'edit' ? updateState : createState
  const formAction = mode === 'edit' ? updateFormAction : createFormAction
  const pending = mode === 'edit' ? updatePending : createPending

  useEffect(() => {
    if (state.success) {
      toast.success(mode === 'edit' ? 'Changes saved' : 'Competitor added')
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  function resetForm() {
    if (competitor) {
      setName(competitor.name)
      setRows(rowsFromCompetitor(competitor))
    } else {
      setName('')
      setRows([makeRow()])
    }
    setClientErrors({})
    formRef.current?.reset()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nameError = name.trim() ? undefined : NAME_ERROR
    const urlsRootError = rows.length === 0 ? NO_URLS_ERROR : undefined
    const urlErrors: Record<number, string> = {}
    rows.forEach((row, index) => {
      const error = validateUrlField(row.url)
      if (error) urlErrors[index] = error
    })

    const hasErrors =
      Boolean(nameError) || Boolean(urlsRootError) || Object.keys(urlErrors).length > 0

    if (hasErrors) {
      event.preventDefault()
      setClientErrors({
        name: nameError,
        urlsRoot: urlsRootError,
        urls: Object.keys(urlErrors).length > 0 ? urlErrors : undefined,
      })
      return
    }

    setClientErrors({})
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm()
    setOpen(next)
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()])
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
  }

  function updateRow(key: string, patch: Partial<Pick<UrlRow, 'url' | 'kind'>>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const urlsPayload = JSON.stringify(
    rows.map((row) => ({ id: row.id, url: row.url, kind: row.kind })),
  )

  const nameError = clientErrors.name ?? state.fieldErrors?.name
  const urlsRootError = clientErrors.urlsRoot ?? state.fieldErrors?.urlsRoot

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {tooltipLabel ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogClose
          aria-label="Close dialog"
          className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-zinc-400 outline-none hover:bg-zinc-800 hover:text-zinc-50 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
        >
          <X className="size-4" />
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-zinc-50">
            {mode === 'edit' ? `Edit ${competitor?.name ?? ''}` : 'Add competitor'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'edit'
              ? 'Edit this competitor and the URLs ProductPulse monitors for it.'
              : 'Add a competitor and the URLs you want ProductPulse to monitor.'}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {mode === 'edit' && competitor && (
            <input type="hidden" name="id" value={competitor.id} readOnly />
          )}

          {state.formError && (
            <div
              role="alert"
              className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-500"
            >
              {state.formError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitor-name">Name</Label>
            <Input
              id="competitor-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(nameError)}
              maxLength={200}
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Monitored URLs</Label>
            {rows.map((row, index) => {
              const rowError = clientErrors.urls?.[index] ?? state.fieldErrors?.urls?.[index]
              return (
                <div key={row.key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.kind}
                      onValueChange={(value) =>
                        updateRow(row.key, { kind: value as UrlKind })
                      }
                    >
                      <SelectTrigger
                        aria-label="URL type"
                        className="w-[120px] shrink-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="changelog">Changelog</SelectItem>
                        <SelectItem value="pricing">Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.url}
                      onChange={(e) => updateRow(row.key, { url: e.target.value })}
                      placeholder="https://example.com/changelog"
                      aria-invalid={Boolean(rowError)}
                      className="flex-1 font-mono"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove URL"
                          disabled={rows.length === 1}
                          onClick={() => removeRow(row.key)}
                        >
                          <Trash2 />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove URL</TooltipContent>
                    </Tooltip>
                  </div>
                  {rowError && <p className="text-xs text-red-500">{rowError}</p>}
                </div>
              )
            })}
            {urlsRootError && <p className="text-xs text-red-500">{urlsRootError}</p>}
            <Button
              type="button"
              variant="ghost"
              className="w-fit"
              onClick={addRow}
            >
              <Plus />
              Add URL
            </Button>
          </div>

          <input type="hidden" name="urls" value={urlsPayload} readOnly />

          <DialogFooter className="border-t-0 bg-transparent p-0 pt-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {mode === 'edit' ? 'Save changes' : 'Add competitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
